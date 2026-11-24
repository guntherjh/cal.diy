import type { Session } from "next-auth";

import { handleMarkAttendeesAndHostNoShow } from "@calcom/features/handleMarkNoShow";
import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TNoShowInputSchema } from "./markNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const markNoShow = async ({ ctx, input }: NoShowOptions) => {
  const { bookingUid, attendees, noShowHost } = input;

  const result = await handleMarkAttendeesAndHostNoShow({
    bookingUid,
    attendees,
    noShowHost,
    userId: ctx.user.id,
    locale: ctx.user.locale,
  });

  // Attendee updates are the ones that fire BOOKING_NO_SHOW_UPDATED; host-only updates don't.
  if (attendees && attendees.length > 0) {
    void sendPendoTrackEvent({
      event: "No-show recorded",
      visitorId: ctx.user.id,
      accountId: ctx.user.organizationId,
      properties: {
        attendee_count: result.attendees.length,
        no_show_count: result.attendees.filter((attendee) => attendee.noShow).length,
        host_no_show_updated: noShowHost !== undefined,
      },
    });
  }

  return result;
};
