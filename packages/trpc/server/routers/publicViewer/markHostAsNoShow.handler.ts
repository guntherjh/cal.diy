import { handleMarkHostNoShow } from "@calcom/features/handleMarkNoShow";
import { trackPendoServerEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

// TODO: Track which attendee actually called this endpoint to mark host as no-show.
// Currently this is completely anonymous and public endpoint.
export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  const bookingBeforeUpdate = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: { id: true, userId: true, eventTypeId: true, noShowHost: true },
  });

  const result = await handleMarkHostNoShow({
    bookingUid,
    noShowHost,
  });

  // The no-show link can be opened more than once, so only report the first time the host is marked.
  if (noShowHost && bookingBeforeUpdate && !bookingBeforeUpdate.noShowHost) {
    void trackPendoServerEvent({
      event: "Host no-show reported",
      visitorId: bookingBeforeUpdate.userId,
      properties: {
        booking_id: bookingBeforeUpdate.id,
        event_type_id: bookingBeforeUpdate.eventTypeId,
      },
    });
  }

  return result;
};

export default noShowHandler;
