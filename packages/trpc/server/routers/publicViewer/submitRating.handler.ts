import { trackPendoServerEvent } from "@calcom/lib/server/pendoTrackEvent";
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
    select: {
      id: true,
      userId: true,
      eventTypeId: true,
    },
  });

  // The rating comes from an anonymous visitor, so the event is attributed to the booking's host.
  await trackPendoServerEvent({
    event: "Feedback submitted",
    visitorId: booking.userId,
    properties: {
      booking_id: booking.id,
      event_type_id: booking.eventTypeId,
      rating,
      has_comment: !!comment,
    },
  });
};

export default submitRatingHandler;
