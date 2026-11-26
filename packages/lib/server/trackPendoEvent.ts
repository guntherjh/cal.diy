import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["[lib] pendo"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoTrackPropertyValue = string | number | boolean | null | undefined;

export type PendoTrackEventInput = {
  event: string;
  userId?: number | string | null;
  organizationId?: number | null;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo. Tracking is skipped when PENDO_TRACK_EVENT_SECRET is not set.
 * The request is fire-and-forget so that analytics latency or outages never block or fail the caller.
 */
export const trackPendoEvent = ({
  event,
  userId,
  organizationId,
  properties,
}: PendoTrackEventInput): void => {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const visitorId = userId !== null && userId !== undefined ? String(userId) : "system";
  // Users outside an organization are treated as their own Pendo account.
  const accountId =
    organizationId !== null && organizationId !== undefined ? String(organizationId) : visitorId;

  try {
    fetchWithTimeout(
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
          visitorId,
          accountId,
          timestamp: Date.now(),
          properties: properties ?? {},
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    )
      .then((response) => {
        if (!response.ok) {
          log.warn(`Pendo track event "${event}" was rejected with status ${response.status}`);
        }
      })
      .catch((error) => {
        log.error(`Pendo track event "${event}" failed`, safeStringify(error));
      });
  } catch (error) {
    log.error(`Pendo track event "${event}" failed`, safeStringify(error));
  }
};
