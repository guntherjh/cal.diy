import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { pendoTrack } from "@calcom/lib/server/pendoTrack";
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

  // The app slug is read before deletion because the credential row is gone afterwards.
  const credential = await prisma.credential.findUnique({ where: { id }, select: { appId: true } });

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });

  pendoTrack({
    event: "App removed",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      credential_id: id,
      app_slug: credential?.appId ?? null,
      is_team_app: Boolean(teamId),
    },
  });
};
