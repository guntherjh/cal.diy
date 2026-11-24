import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoId = number | string | null | undefined;
type PendoTrackPropertyValue = string | number | boolean | null | undefined;

const toPendoId = (id: PendoId): string | undefined => {
  if (id === null || id === undefined || id === "") return undefined;
  return String(id);
};

export type PendoTrackEvent = {
  event: string;
  visitorId: PendoId;
  accountId?: PendoId;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo. Never throws, so callers can fire and forget
 * without risking the business flow they instrument.
 */
export async function sendPendoTrackEvent({
  event,
  visitorId,
  accountId,
  properties = {},
}: PendoTrackEvent): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  // Instances without a Pendo integration key configured opt out of tracking entirely.
  if (!integrationKey) return;

  const resolvedVisitorId = toPendoId(visitorId) ?? "system";
  // Users outside an organization are their own account in Pendo.
  const resolvedAccountId = toPendoId(accountId) ?? resolvedVisitorId;
  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;

  try {
    const response = await fetchWithTimeout(
      `https://${dataHost}/data/track`,
      {
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
          properties,
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );
    if (!response.ok) {
      log.warn(`Pendo track event "${event}" was rejected with status ${response.status}`);
    }
  } catch (err) {
    log.error(`Failed to send Pendo track event "${event}"`, safeStringify(err));
  }
}
