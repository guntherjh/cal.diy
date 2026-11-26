import type { Session } from "next-auth";

import { handleMarkAttendeesAndHostNoShow } from "@calcom/features/handleMarkNoShow";
import { trackPendoEvent } from "@calcom/lib/server/pendoTrackEvent";
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

  await trackPendoEvent({
    event: "No-show recorded",
    visitorId: ctx.user.id,
    accountId: ctx.user.organizationId,
    properties: {
      attendees_marked_count: attendees?.filter((attendee) => attendee.noShow).length ?? 0,
      attendees_updated_count: attendees?.length ?? 0,
      host_no_show: Boolean(noShowHost),
    },
  });

  return result;
};
