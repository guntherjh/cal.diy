import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";
import { sendPendoTrackEvent } from "@calcom/lib/server/pendoTrack";
import type { TAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

type GetOptions = {
  ctx: {
    user: { id: number };
  };
  input: TAdminToggleFeatureFlagSchema;
};

export const toggleFeatureFlagHandler = async (opts: GetOptions) => {
  const { ctx, input } = opts;
  const { user } = ctx;
  const { slug, enabled } = input;
  const featureRepository = getFeatureRepository();
  const result = await featureRepository.update({
    featureId: slug as FeatureId,
    enabled,
    updatedBy: user.id,
  });

  void sendPendoTrackEvent({
    event: "Feature flag changed",
    visitorId: user.id,
    properties: {
      feature_slug: slug,
      enabled,
    },
  });

  return result;
};

export default toggleFeatureFlagHandler;
