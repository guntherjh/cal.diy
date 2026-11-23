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

  const { appSlug, appCategories } = await handleDeleteCredential({
    userId: user.id,
    userMetadata: user.metadata,
    credentialId: id,
    teamId,
  });

  void pendoTrack({
    event: "App removed",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      app_slug: appSlug,
      app_categories: appCategories,
      is_team_credential: !!teamId,
    },
  });
};
