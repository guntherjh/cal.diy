import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrackEvent"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Keeps a slow analytics endpoint from noticeably delaying the user-facing request.
const PENDO_TRACK_TIMEOUT_MS = 3000;

type PendoTrackPropertyValue = string | number | boolean | null;

type PendoIdentifier = string | number | null | undefined;

export type PendoTrackEventInput = {
  event: string;
  visitorId: PendoIdentifier;
  accountId?: PendoIdentifier;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo. It never throws, so analytics failures can't break the
 * product flow that reports them. Users outside an organization act as their own Pendo account,
 * which is why the account falls back to the visitor.
 */
export async function trackPendoEvent({
  event,
  visitorId,
  accountId,
  properties = {},
}: PendoTrackEventInput): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedVisitorId = String(visitorId ?? "system");
  const resolvedAccountId = String(accountId ?? resolvedVisitorId);

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
  } catch (error) {
    log.warn(`Failed to send Pendo track event "${event}"`, safeStringify(error));
  }
}
