import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Tracking runs alongside user requests, so a slow Pendo endpoint must not hold connections open.
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoTrackPropertyValue = string | number | boolean | string[] | null | undefined;

export type PendoTrackInput = {
  event: string;
  visitorId: string | number;
  accountId?: string | number | null;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Pendo Track Event without blocking the caller.
 * Tracking is skipped when PENDO_TRACK_EVENT_SECRET is not set, and failures are only logged
 * so analytics can never break the request that triggered them.
 * Users outside an organization fall back to their own id as the account id.
 */
export function pendoTrack({ event, visitorId, accountId, properties }: PendoTrackInput): void {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const visitor = String(visitorId);

  try {
    const body = JSON.stringify({
      type: "track",
      event,
      visitorId: visitor,
      accountId: accountId === null || accountId === undefined ? visitor : String(accountId),
      timestamp: Date.now(),
      properties: properties ?? {},
    });

    fetchWithTimeout(
      `https://${dataHost}/data/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pendo-integration-key": integrationKey,
        },
        body,
      },
      PENDO_TRACK_TIMEOUT_MS
    )
      .then((response) => {
        if (!response.ok) {
          log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
        }
      })
      .catch((error: unknown) => {
        log.warn(`Pendo track request for "${event}" failed`, safeStringify(error));
      });
  } catch (error) {
    log.warn(`Unable to send Pendo track event "${event}"`, safeStringify(error));
  }
}
