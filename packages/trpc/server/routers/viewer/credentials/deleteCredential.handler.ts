import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { pendoTrack } from "@calcom/lib/server/pendoTrack";
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

  const deletedCredential = await handleDeleteCredential({
    userId: user.id,
    userMetadata: user.metadata,
    credentialId: id,
    teamId,
  });

  await pendoTrack({
    event: "App removed",
    visitorId: user.id,
    accountId: user.organizationId ?? teamId,
    properties: {
      app_slug: deletedCredential.appSlug ?? undefined,
      app_categories: deletedCredential.appCategories.slice(0, 5),
      removed_from_team: !!teamId,
    },
  });
};
