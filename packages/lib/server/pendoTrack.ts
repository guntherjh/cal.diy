import process from "node:process";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoTrackId = string | number | null | undefined;
type PendoTrackPropertyValue = string | number | boolean | null | undefined;

type PendoTrackEvent = {
  event: string;
  visitorId?: PendoTrackId;
  accountId?: PendoTrackId;
  properties?: Record<string, PendoTrackPropertyValue>;
};

const toPendoId = (id: PendoTrackId): string | null => {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
};

/**
 * Sends a server-side Track Event to Pendo without blocking the caller.
 * Tracking is skipped when PENDO_TRACK_EVENT_SECRET isn't configured, and failures are only logged
 * so analytics can never break the request that triggered them.
 */
export function pendoTrack({ event, visitorId, accountId, properties }: PendoTrackEvent): void {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  // Accounts map to organizations. Users outside an organization have no account record, so they share
  // the "system" account instead of reusing ids from another table that could collide with real accounts.
  const resolvedVisitorId = toPendoId(visitorId) ?? "system";
  const resolvedAccountId = toPendoId(accountId) ?? "system";

  fetch(`https://${dataHost}/data/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": integrationKey,
    },
    body: JSON.stringify({
      type: "track",
      event,
      visitorId: resolvedVisitorId,
      accountId: resolvedAccountId,
      timestamp: Date.now(),
      properties: properties ?? {},
    }),
    signal: AbortSignal.timeout(PENDO_TRACK_TIMEOUT_MS),
  })
    .then((response) => {
      if (!response.ok) {
        log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
      }
    })
    .catch((error) => {
      log.error(`Pendo track request for "${event}" failed`, safeStringify(error));
    });
}
