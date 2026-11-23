import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { trackPendoServerEvent } from "@calcom/lib/server/pendoTrack";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TDeleteCredentialInputSchema } from "./deleteCredential.schema";

type DeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: DeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  const credentialToDelete = await prisma.credential.findUnique({
    where: { id },
    select: { appId: true },
  });

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });

  void trackPendoServerEvent({
    event: "App removed",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      app_slug: credentialToDelete?.appId ?? null,
      removed_for_team: !!teamId,
    },
  });
};
