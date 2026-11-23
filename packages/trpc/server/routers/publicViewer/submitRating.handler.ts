import { pendoTrack } from "@calcom/lib/server/pendoTrack";
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
      user: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  // Ratings come from anonymous attendees, so the event is attributed to the booking's host
  await pendoTrack({
    event: "Feedback submitted",
    visitorId: booking.userId,
    accountId: booking.user?.organizationId,
    properties: {
      booking_id: booking.id,
      event_type_id: booking.eventTypeId,
      rating,
      has_comment: !!comment,
      submitted_by: "attendee",
    },
  });
};

export default submitRatingHandler;
