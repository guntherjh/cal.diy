import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
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

  // Ratings come from attendees without a session, so the event is attributed to the booking's host
  if (booking.userId) {
    void sendPendoTrackEvent({
      event: "Feedback submitted",
      visitorId: booking.userId,
      properties: {
        booking_id: booking.id,
        event_type_id: booking.eventTypeId,
        rating,
        has_comment: !!comment,
      },
    });
  }
};

export default submitRatingHandler;
