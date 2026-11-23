import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 3000;

type PendoTrackPropertyValue = string | number | boolean | null | string[] | number[];

export type PendoTrackProperties = Record<string, PendoTrackPropertyValue | undefined>;

export type PendoTrackEventInput = {
  event: string;
  visitorId: number | string | null | undefined;
  /**
   * Organization or team that owns the visitor. Falls back to the visitor itself because
   * most self-hosted users are not part of an organization and act as their own account.
   */
  accountId?: number | string | null;
  properties?: PendoTrackProperties;
};

/**
 * Sends a server-side Track Event to Pendo. Never throws so that analytics failures
 * cannot break the business flow that triggered them.
 */
export async function pendoTrack({ event, visitorId, accountId, properties }: PendoTrackEventInput) {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedVisitorId = visitorId != null ? String(visitorId) : "system";
  const resolvedAccountId = accountId != null ? String(accountId) : resolvedVisitorId;

  const cleanProperties = Object.fromEntries(
    Object.entries(properties ?? {}).filter(([, value]) => value !== undefined)
  );

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
          properties: cleanProperties,
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );

    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed`, safeStringify({ status: response.status }));
    }
  } catch (err) {
    log.warn(`Pendo track request for "${event}" errored`, safeStringify(err));
  }
}
