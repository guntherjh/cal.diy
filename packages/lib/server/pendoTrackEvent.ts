import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrackEvent"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Tracking runs inline with user-facing requests, so a slow Pendo endpoint must not hold them up for long.
const PENDO_TRACK_TIMEOUT_MS = 2000;
// Pendo requires a visitor and account on every server-side event, so "system" stands in when none exists.
const PENDO_SYSTEM_ID = "system";

export type PendoTrackEventProperties = Record<string, string | number | boolean | null | undefined>;

type PendoServerTrackEvent = {
  event: string;
  visitorId?: string | number | null;
  accountId?: string | number | null;
  properties?: PendoTrackEventProperties;
};

function toPendoId(id: string | number | null | undefined): string {
  if (id === null || id === undefined || id === "") return PENDO_SYSTEM_ID;
  return String(id);
}

/**
 * Sends a Track Event to Pendo from the server. Never throws, so callers can await it without guarding.
 * It's a no-op unless PENDO_TRACK_EVENT_SECRET is configured.
 */
export async function trackPendoServerEvent({
  event,
  visitorId,
  accountId,
  properties,
}: PendoServerTrackEvent): Promise<void> {
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
          properties: properties ?? {},
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );
    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
    }
  } catch (trackError) {
    log.warn(`Pendo track request for "${event}" failed`, safeStringify(trackError));
  }
}
