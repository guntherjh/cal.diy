import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { trackPendoServerEvent } from "@calcom/lib/server/pendoTrackEvent";
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

  await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: id, teamId });

  await trackPendoServerEvent({
    event: "App removed",
    visitorId: user.id,
    accountId: user.organizationId,
    properties: {
      credential_id: id,
      is_team_app: !!teamId,
    },
  });
};
