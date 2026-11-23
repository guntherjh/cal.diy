import { updateSchedule } from "@calcom/features/schedules/services/ScheduleService";
import { pendoTrack } from "@calcom/lib/server/pendoTrack";
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

  await pendoTrack({
    event: "Schedule updated",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      schedule_id: input.scheduleId,
      is_default: input.isDefault,
      name_changed: input.name !== undefined,
      time_zone_changed: input.timeZone !== undefined,
      availability_changed: input.schedule !== undefined,
      date_override_count: input.dateOverrides?.length,
    },
  });

  return result;
};
