import { trackPendoServerEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  await prisma.eventTypeCustomInput.deleteMany({
    where: {
      eventTypeId: id,
    },
  });

  const deletedEventType = await prisma.eventType.delete({
    where: {
      id,
    },
    select: {
      teamId: true,
      schedulingType: true,
    },
  });

  void trackPendoServerEvent({
    event: "Event type deleted",
    visitorId: ctx.user.id,
    accountId: ctx.user.organizationId,
    properties: {
      event_type_id: id,
      team_id: deletedEventType.teamId,
      scheduling_type: deletedEventType.schedulingType,
    },
  });

  return {
    id,
  };
};
