import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log: typeof logger = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Keep the timeout short because tracking is awaited inside request handlers
const PENDO_TRACK_TIMEOUT_MS = 2000;

type PendoTrackPropertyValue = string | number | boolean | null | undefined;

type PendoTrackIdentifier = string | number | null | undefined;

type PendoTrackEvent = {
  event: string;
  visitorId: PendoTrackIdentifier;
  accountId?: PendoTrackIdentifier;
  properties?: Record<string, PendoTrackPropertyValue>;
};

function toPendoId(id: PendoTrackIdentifier): string {
  if (id === null || id === undefined) return "system";
  return String(id);
}

/**
 * Sends a server-side Track Event to Pendo. Never throws so analytics failures can't break product flows.
 * Does nothing unless PENDO_TRACK_EVENT_SECRET is configured.
 */
export async function trackPendoEvent({
  event,
  visitorId,
  accountId,
  properties = {},
}: PendoTrackEvent): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

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
          visitorId: toPendoId(visitorId),
          accountId: toPendoId(accountId),
          timestamp: Date.now(),
          properties,
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );

    if (!response.ok) {
      log.warn(`Pendo track event "${event}" was rejected with status ${response.status}`);
    }
  } catch (error) {
    log.warn(`Failed to send Pendo track event "${event}"`, safeStringify(error));
  }
}

export type { PendoTrackEvent };
