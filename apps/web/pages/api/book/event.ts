import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { BotDetectionService } from "@calcom/features/bot-detection";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { trackPendoEvent } from "@calcom/lib/server/pendoTrack";
import type { TraceContext } from "@calcom/lib/tracing";
import { prisma } from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";

async function handler(req: NextApiRequest & { userId?: number; traceContext: TraceContext }) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  // Check for bot detection using feature flag
  const featuresRepository = new FeaturesRepository(prisma);
  const eventTypeRepository = new EventTypeRepository(prisma);
  const botDetectionService = new BotDetectionService(featuresRepository, eventTypeRepository);

  await botDetectionService.checkBotDetection({
    eventTypeId: req.body.eventTypeId,
    headers: req.headers,
  });

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createBooking:${piiHasher.hash(userIp)}`,
  });

  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  const regularBookingService = getRegularBookingService();
  const booking = await regularBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      hostname: req.headers.host || "",
      forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
      traceContext: req.traceContext,
    },
  });

  // Reschedules are reported as "Booking rescheduled" by the booking service, and spam-blocked
  // bookings come back with id 0, so neither counts as a new booking.
  if (booking.id && !booking.isDryRun && !booking.previousBooking) {
    await trackPendoEvent({
      event: "Booking created",
      visitorId: booking.userId,
      properties: {
        booking_id: booking.id,
        event_type_id: booking.eventTypeId,
        booking_status: booking.status,
        payment_required: !!booking.paymentRequired,
        is_logged_in_booker: !!session?.user?.id,
      },
    });
  }

  return booking;
}

export default defaultResponder(handler, "/api/book/event");
