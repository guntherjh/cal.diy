import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";

import type { TSubmitRatingInputSchema } from "./submitRating.schema";

type SubmitRatingOptions = {
  input: TSubmitRatingInputSchema;
};

export const submitRatingHandler = async ({ input }: SubmitRatingOptions) => {
  const { bookingUid, rating, comment } = input;
  const ratedBooking = await prisma.booking.update({
    where: {
      uid: bookingUid,
    },
    data: {
      rating: rating,
      ratingFeedback: comment,
    },
    select: {
      id: true,
      userId: true,
      eventTypeId: true,
      user: { select: { organizationId: true } },
    },
  });

  // The rating comes from an anonymous attendee, so the event is attributed to the host's account.
  void sendPendoTrackEvent({
    event: "Feedback submitted",
    visitorId: ratedBooking.userId,
    accountId: ratedBooking.user?.organizationId,
    properties: {
      booking_id: ratedBooking.id,
      event_type_id: ratedBooking.eventTypeId,
      rating,
      has_comment: !!comment,
    },
  });
};

export default submitRatingHandler;
