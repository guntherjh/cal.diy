import { trackPendoEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";

import type { TSubmitRatingInputSchema } from "./submitRating.schema";

type SubmitRatingOptions = {
  input: TSubmitRatingInputSchema;
};

export const submitRatingHandler = async ({ input }: SubmitRatingOptions) => {
  const { bookingUid, rating, comment } = input;
  const booking = await prisma.booking.update({
    where: {
      uid: bookingUid,
    },
    data: {
      rating: rating,
      ratingFeedback: comment,
    },
    select: { id: true, userId: true, eventTypeId: true },
  });

  // Feedback comes from an attendee who may not have an account, so attribute it to the booking's organizer
  await trackPendoEvent({
    event: "Meeting feedback submitted",
    visitorId: booking.userId,
    properties: {
      booking_id: booking.id,
      event_type_id: booking.eventTypeId,
      rating,
      has_comment: !!comment?.trim(),
    },
  });
};

export default submitRatingHandler;
