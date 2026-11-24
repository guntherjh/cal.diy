import { updateSchedule } from "@calcom/features/schedules/services/ScheduleService";
import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TUpdateInputSchema } from "./update.schema";

type User = NonNullable<TrpcSessionUser>;
type UpdateOptions = {
  ctx: {
    user: {
      id: User["id"];
      defaultScheduleId: User["defaultScheduleId"];
      timeZone: User["timeZone"];
      organizationId?: User["organizationId"];
    };
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ input, ctx }: UpdateOptions) => {
  const { user } = ctx;
  const result = await updateSchedule({
    input,
    user,
    prisma,
  });

  void sendPendoTrackEvent({
    event: "Schedule updated",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      schedule_id: input.scheduleId,
      availability_changed: !!input.schedule,
      date_overrides_changed: !!input.dateOverrides,
      name_changed: !!input.name,
      set_as_default: !!input.isDefault,
    },
  });

  return result;
};
