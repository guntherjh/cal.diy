import { handleMarkHostNoShow } from "@calcom/features/handleMarkNoShow";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

const log = logger.getSubLogger({ prefix: ["markHostAsNoShow"] });

type NoShowOptions = {
  input: TNoShowInputSchema;
};

const findBookingForTracking = async (bookingUid: string) => {
  try {
    return await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        userId: true,
        eventTypeId: true,
        noShowHost: true,
        user: { select: { organizationId: true } },
      },
    });
  } catch (error) {
    log.warn("Unable to load booking for Pendo tracking", safeStringify(error));
    return null;
  }
};

// TODO: Track which attendee actually called this endpoint to mark host as no-show.
// Currently this is completely anonymous and public endpoint.
export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  const bookingBeforeUpdate = noShowHost ? await findBookingForTracking(bookingUid) : null;

  const result = await handleMarkHostNoShow({
    bookingUid,
    noShowHost,
  });

  // The email link can be opened repeatedly, so only report the first time the host is flagged.
  if (bookingBeforeUpdate && !bookingBeforeUpdate.noShowHost) {
    // The reporter is an anonymous booker, so the event is attributed to the host's account.
    void sendPendoTrackEvent({
      event: "Host no-show reported",
      visitorId: bookingBeforeUpdate.userId,
      accountId: bookingBeforeUpdate.user?.organizationId,
      properties: {
        booking_id: bookingBeforeUpdate.id,
        event_type_id: bookingBeforeUpdate.eventTypeId,
        reported_by: "booker",
      },
    });
  }

  return result;
};

export default noShowHandler;
