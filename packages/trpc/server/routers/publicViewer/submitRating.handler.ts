import { trackPendoEvent } from "@calcom/lib/server/pendoTrackEvent";
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

  // Attendees rate meetings without signing in, so the event is attributed to the booking's host.
  await trackPendoEvent({
    event: "Meeting rating submitted",
    visitorId: ratedBooking.userId,
    properties: {
      booking_id: ratedBooking.id,
      event_type_id: ratedBooking.eventTypeId,
      rating,
      has_comment: Boolean(comment),
    },
  });
};

export default submitRatingHandler;
