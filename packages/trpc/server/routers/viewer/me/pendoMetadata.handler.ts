import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { Session } from "next-auth";

type PendoMetadataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

type PendoMetadataValue = string | number | boolean | null;

const toIsoString = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString();
};

export type PendoMetadataDto = {
  visitor: { id: number } & Record<string, PendoMetadataValue>;
  account?: { id: number } & Record<string, PendoMetadataValue>;
};

export const pendoMetadataHandler = async ({ ctx }: PendoMetadataOptions): Promise<PendoMetadataDto> => {
  const { user: sessionUser, session } = ctx;
  const organizationId = sessionUser.organizationId ?? null;

  const result = await new UserRepository(prisma).findForAnalyticsIdentity({
    userId: sessionUser.id,
    organizationId,
  });

  if (!result) {
    return { visitor: { id: sessionUser.id } };
  }

  const { user, organization } = result;

  const visitor = {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    full_name: user.name,
    username: user.username,
    // The session reports INACTIVE_ADMIN for admins who don't meet the security requirements yet
    role: session.user.role ?? user.role,
    organizationId,
    orgRole: session.user.org?.role ?? null,
    createdDate: toIsoString(user.createdDate),
    lastActiveAt: toIsoString(user.lastActiveAt),
    trialEndsAt: toIsoString(user.trialEndsAt),
    emailVerified: toIsoString(user.emailVerified),
    completedOnboarding: user.completedOnboarding,
    identityProvider: user.identityProvider,
    twoFactorEnabled: user.twoFactorEnabled,
    timeZone: user.timeZone,
    locale: user.locale,
    weekStart: user.weekStart,
    timeFormat: user.timeFormat,
    appTheme: user.appTheme,
    verified: user.verified,
    locked: user.locked,
    isPlatformManaged: user.isPlatformManaged,
    creationSource: user.creationSource,
    hideBranding: user.hideBranding,
    belongsToActiveTeam: session.user.belongsToActiveTeam ?? null,
  };

  if (!organization) {
    return { visitor };
  }

  const organizationMetadata = teamMetadataSchema.safeParse(organization.metadata);
  const orgSeats = organizationMetadata.data?.orgSeats ?? null;
  const billing = organization.organizationBilling;
  const settings = organization.organizationSettings;

  return {
    visitor,
    account: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: toIsoString(organization.createdAt),
      isOrganization: organization.isOrganization,
      isPlatform: organization.isPlatform,
      isPrivate: organization.isPrivate,
      pendingPayment: organization.pendingPayment,
      timeZone: organization.timeZone,
      orgSeats,
      planName: billing?.planName ?? null,
      subscriptionStatus: billing?.status ?? null,
      billingPeriod: billing?.billingPeriod ?? null,
      paidSeats: billing?.paidSeats ?? null,
      subscriptionStart: toIsoString(billing?.subscriptionStart),
      subscriptionTrialEnd: toIsoString(billing?.subscriptionTrialEnd),
      subscriptionEnd: toIsoString(billing?.subscriptionEnd),
      isOrganizationVerified: settings?.isOrganizationVerified ?? null,
      isAdminAPIEnabled: settings?.isAdminAPIEnabled ?? null,
    },
  };
};
