import process from "node:process";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;

type PendoTrackIdentifier = string | number | null | undefined;

type PendoTrackPropertyValue = string | number | boolean | string[] | number[] | null | undefined;

function toPendoId(id: PendoTrackIdentifier): string | null {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
}

export type PendoTrackEventInput = {
  event: string;
  visitorId: PendoTrackIdentifier;
  accountId?: PendoTrackIdentifier;
  properties?: Record<string, PendoTrackPropertyValue>;
};

/**
 * Sends a server-side Track Event to Pendo. It never throws, so callers can fire it without awaiting
 * and tracking failures can't break the request that triggered them.
 * Accounts default to the visitor because most Cal.diy users aren't part of an organization.
 */
export async function pendoTrack({
  event,
  visitorId,
  accountId,
  properties = {},
}: PendoTrackEventInput): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedVisitorId = toPendoId(visitorId) ?? "system";
  const resolvedAccountId = toPendoId(accountId) ?? resolvedVisitorId;
  const definedProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
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
          properties: definedProperties,
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );

    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
    }
  } catch (error) {
    log.warn(`Pendo track request for "${event}" failed`, safeStringify(error));
  }
}
