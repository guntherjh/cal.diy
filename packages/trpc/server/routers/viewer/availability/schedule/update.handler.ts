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
    event: "Availability updated",
    userId: user.id,
    properties: {
      schedule_id: input.scheduleId,
      set_as_default: input.isDefault,
      changed_time_zone: input.timeZone !== undefined,
      changed_weekly_hours: input.schedule !== undefined,
      date_override_count: input.dateOverrides?.length,
    },
  });

  return result;
};
