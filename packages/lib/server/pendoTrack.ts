import process from "node:process";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoTrackPropertyValue = string | number | boolean | null | undefined;

type PendoTrackEventInput = {
  event: string;
  visitorId: string | number;
  accountId?: string | number | null;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo.
 * It never throws, so callers can fire it without awaiting and analytics failures can't break the request.
 * Tracking is skipped when PENDO_TRACK_EVENT_SECRET isn't configured (e.g. local development).
 */
export async function sendPendoTrackEvent({
  event,
  visitorId,
  accountId,
  properties = {},
}: PendoTrackEventInput): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;

  try {
    const response = await fetch(`https://${dataHost}/data/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pendo-integration-key": integrationKey,
      },
      body: JSON.stringify({
        type: "track",
        event,
        visitorId: String(visitorId),
        // Users outside an organization are their own account in Pendo
        accountId: String(accountId ?? visitorId),
        timestamp: Date.now(),
        properties,
      }),
      signal: AbortSignal.timeout(PENDO_TRACK_TIMEOUT_MS),
    });

    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
    }
  } catch (error) {
    log.warn(`Pendo track request for "${event}" failed`, safeStringify(error));
  }
}
