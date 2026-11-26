import process from "node:process";
import { fetchWithTimeout } from "../fetchWithTimeout";
import logger from "../logger";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
// Tracking runs inline with user requests, so cap how long a slow Pendo endpoint can delay them.
const PENDO_TRACK_TIMEOUT_MS = 3000;

type PendoIdentifier = string | number | null | undefined;
type PendoPropertyValue = string | number | boolean | null | undefined;
type PendoProperties = Record<string, PendoPropertyValue>;

const toPendoId = (id: PendoIdentifier): string | null => {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
};

const compactProperties = (properties: PendoProperties = {}): PendoProperties => {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
};

export type PendoTrackEventInput = {
  event: string;
  visitorId: PendoIdentifier;
  accountId?: PendoIdentifier;
  properties?: PendoProperties;
};

/**
 * Sends a server-side Track Event to Pendo. Never throws, so analytics can't break the calling flow.
 * Accounts default to the visitor because most Cal.diy users aren't part of an organization.
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
  const resolvedVisitorId = toPendoId(visitorId) ?? "system";
  const resolvedAccountId = toPendoId(accountId) ?? resolvedVisitorId;

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
          properties: compactProperties(properties),
        }),
      },
      PENDO_TRACK_TIMEOUT_MS
    );

    if (!response.ok) {
      log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
    }
  } catch (err) {
    log.warn(`Pendo track request for "${event}" failed`, err);
  }
}
