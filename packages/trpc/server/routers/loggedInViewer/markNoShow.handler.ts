import type { Session } from "next-auth";

import { handleMarkAttendeesAndHostNoShow } from "@calcom/features/handleMarkNoShow";
import { trackPendoEvent } from "@calcom/lib/server/pendoTrack";
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

  const noShowAttendeeCount = attendees?.filter((attendee) => attendee.noShow).length ?? 0;
  if (noShowAttendeeCount > 0) {
    await trackPendoEvent({
      event: "No-show recorded",
      visitorId: ctx.user.id,
      accountId: ctx.user.organizationId,
      properties: {
        no_show_attendee_count: noShowAttendeeCount,
        host_no_show: !!noShowHost,
      },
    });
  }

  return result;
};
