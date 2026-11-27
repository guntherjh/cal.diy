import process from "node:process";
import type { Logger } from "tslog";
import { fetchWithTimeout } from "../fetchWithTimeout";
import logger from "../logger";

const log: Logger<unknown> = logger.getSubLogger({ prefix: ["server/pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Tracking is awaited inside request handlers, so a slow Pendo response must not hold up the user's request.
const PENDO_TRACK_TIMEOUT_MS = 2000;

type PendoPropertyValue = string | number | boolean | null;

type PendoId = string | number | null | undefined;

function toPendoId(id: PendoId, fallback: string): string {
  if (id === null || id === undefined) return fallback;
  return String(id);
}

export type PendoTrackEventInput = {
  event: string;
  visitorId: PendoId;
  accountId?: PendoId;
  properties?: Record<string, PendoPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo. It never throws, so analytics failures can't break the
 * calling flow. Without PENDO_TRACK_EVENT_SECRET configured it does nothing, which keeps local and
 * self-hosted instances from sending data unless they opt in.
 */
export async function trackPendoEvent({
  event,
  visitorId,
  accountId,
  properties,
}: PendoTrackEventInput): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedVisitorId = toPendoId(visitorId, "system");
  // Users outside an organization have no separate account entity, so they are their own account.
  const resolvedAccountId = toPendoId(accountId, resolvedVisitorId);

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
  } catch (error) {
    log.warn(`Pendo track request for "${event}" failed`, error);
  }
}
