import process from "node:process";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({ prefix: ["pendoTrack"] });

const DEFAULT_PENDO_DATA_HOST = "data.pendo-security.pendo-dev.com";
const PENDO_TRACK_TIMEOUT_MS = 5000;
const UNATTRIBUTED_ID = "system";

type PendoTrackPropertyValue = string | number | boolean | null | string[] | number[];

type PendoTrackInput = {
  event: string;
  userId: number | null | undefined;
  /**
   * Pass `null` when the user is known to have no organization. When left `undefined`,
   * the organization is looked up from the user record.
   */
  organizationId?: number | null;
  properties?: Record<string, PendoTrackPropertyValue | undefined>;
};

async function resolveOrganizationId(
  userId: number | null | undefined,
  organizationId: number | null | undefined
): Promise<number | null> {
  if (organizationId !== undefined) return organizationId;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return user?.organizationId ?? null;
}

async function sendPendoTrack({ event, userId, organizationId, properties }: PendoTrackInput): Promise<void> {
  const integrationKey = process.env.PENDO_TRACK_EVENT_SECRET;
  if (!integrationKey) return;

  const dataHost = process.env.PENDO_DATA_HOST || DEFAULT_PENDO_DATA_HOST;
  const resolvedOrganizationId = await resolveOrganizationId(userId, organizationId);
  const cleanProperties = Object.fromEntries(
    Object.entries(properties ?? {}).filter(([, value]) => value !== undefined)
  );

  const response = await fetch(`https://${dataHost}/data/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": integrationKey,
    },
    body: JSON.stringify({
      type: "track",
      event,
      visitorId: String(userId || UNATTRIBUTED_ID),
      // Users outside an organization are treated as their own account.
      accountId: String(resolvedOrganizationId || userId || UNATTRIBUTED_ID),
      timestamp: Date.now(),
      properties: cleanProperties,
    }),
    signal: AbortSignal.timeout(PENDO_TRACK_TIMEOUT_MS),
  });
  if (!response.ok) {
    log.warn(`Pendo track request for "${event}" failed with status ${response.status}`);
  }
}

/**
 * Sends a server-side Pendo Track Event without blocking the caller.
 * Failures are logged and never propagate, so tracking can't break the user-facing flow.
 */
function pendoTrack(input: PendoTrackInput): void {
  sendPendoTrack(input).catch((err: unknown) => {
    log.warn(`Pendo track request for "${input.event}" failed`, String(err));
  });
}

export type { PendoTrackInput };
export { pendoTrack };
