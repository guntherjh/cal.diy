import { trackPendoEvent } from "@calcom/lib/server/trackPendoEvent";
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

  await prisma.eventType.delete({
    where: {
      id,
    },
  });

  trackPendoEvent({
    event: "Event type deleted",
    userId: ctx.user.id,
    organizationId: ctx.user.organizationId,
    properties: { event_type_id: id },
  });

  return {
    id,
  };
};
