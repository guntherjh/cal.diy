import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 3000;

type PendoPropertyValue = string | number | boolean | null | undefined;

type PendoServerTrackEvent = {
  event: string;
  visitorId: string | number | null | undefined;
  accountId?: string | number | null;
  properties?: Record<string, PendoPropertyValue>;
};

const toId = (value: string | number | null | undefined): string | null =>
  value === null || value === undefined || value === "" ? null : String(value);

/**
 * Sends a Pendo Track Event from the server. It never throws, so analytics failures
 * can't break the request that triggered them.
 */
export async function trackPendoServerEvent({
  event,
  visitorId,
  accountId,
  properties,
}: PendoServerTrackEvent): Promise<void> {
  // The integration key is a server-side secret, so it's only read from the environment.
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedVisitorId = toId(visitorId) ?? "system";
  // Cal.diy users without an organization are their own account.
  const resolvedAccountId = toId(accountId) ?? resolvedVisitorId;

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
          properties: properties ?? {},
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );
    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
    }
  } catch (err) {
    log.warn(`Pendo track request for "${event}" failed`, safeStringify(err));
  }
}
