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
      user: { select: { organizationId: true } },
    },
  });

  // Attendees aren't app visitors, so the rating is attributed to the booking organizer.
  pendoTrack({
    event: "Meeting rating submitted",
    userId: booking.userId,
    organizationId: booking.user?.organizationId ?? null,
    properties: {
      booking_id: booking.id,
      event_type_id: booking.eventTypeId,
      rating,
      has_comment: !!comment,
    },
  });
};

export default submitRatingHandler;
