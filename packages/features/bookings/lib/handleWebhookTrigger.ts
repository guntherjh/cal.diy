import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import {
  type EventPayloadType,
  isEventPayload,
  type WebhookPayloadType,
} from "@calcom/features/webhooks/lib/sendPayload";
import { safeStringify } from "@calcom/lib/safeStringify";
import { trackPendoEvent } from "@calcom/lib/server/pendoTrack";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";

async function _handleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: WebhookPayloadType;
  isDryRun?: boolean;
  traceContext: TraceContext;
}) {
  const spanContext = distributedTracing.createSpan(args.traceContext, "webhook_trigger", {
    eventTrigger: args.eventTrigger || "unknown",
  });

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);
  try {
    if (args.isDryRun) return;

    const subscribers = await getWebhooks(args.subscriberOptions);
    let eventPayload: EventPayloadType | null = null;
    if (isEventPayload(args.webhookData)) {
      eventPayload = args.webhookData;
    }

    const promises = subscribers.map((sub) =>
      sendPayload(sub.secret, args.eventTrigger, new Date().toISOString(), sub, args.webhookData)
        .then(async (result) => {
          if (!result.ok) return;
          await trackPendoEvent({
            event: "Booking webhook delivered",
            visitorId: args.subscriberOptions.userId ?? eventPayload?.organizer?.id,
            accountId: args.subscriberOptions.orgId,
            properties: {
              webhook_id: sub.id,
              trigger_event: args.eventTrigger,
              booking_id: eventPayload?.bookingId ?? null,
              event_type_id: eventPayload?.eventTypeId ?? null,
              response_status: result.status,
            },
          });
        })
        .catch((e) => {
          if (isEventPayload(args.webhookData)) {
            tracingLogger.error(
              `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}, booking id: ${args.webhookData.bookingId}, booking uid: ${args.webhookData.uid}`,
              safeStringify(e)
            );
          }
        })
    );
    await Promise.all(promises);
  } catch (error) {
    tracingLogger.error("Error while sending webhook", error);
  }
}

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");
