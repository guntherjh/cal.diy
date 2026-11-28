import { updateSchedule } from "@calcom/features/schedules/services/ScheduleService";
import { pendoTrack } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TUpdateInputSchema } from "./update.schema";

type User = NonNullable<TrpcSessionUser>;
type UpdateOptions = {
  ctx: {
    user: { id: User["id"]; defaultScheduleId: User["defaultScheduleId"]; timeZone: User["timeZone"] };
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

  pendoTrack({
    event: "Schedule updated",
    visitorId: user.id,
    properties: {
      schedule_id: input.scheduleId,
      hours_updated: Boolean(input.schedule),
      overrides_updated: Boolean(input.dateOverrides),
      time_zone_updated: Boolean(input.timeZone),
      is_default: input.isDefault ?? null,
    },
  });

  return result;
};
