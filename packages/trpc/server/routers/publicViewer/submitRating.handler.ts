import { trackPendoEvent } from "@calcom/lib/server/pendoTrack";
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
    },
  });

  // Feedback comes from attendees without a session, so it is attributed to the host who owns the booking.
  await trackPendoEvent({
    event: "Meeting feedback submitted",
    visitorId: ratedBooking.userId,
    properties: {
      booking_id: ratedBooking.id,
      event_type_id: ratedBooking.eventTypeId,
      rating,
      has_comment: !!comment,
    },
  });
};

export default submitRatingHandler;
