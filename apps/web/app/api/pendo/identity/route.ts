import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function getHandler(): Promise<NextResponse> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      username: true,
      organizationId: true,
      createdDate: true,
      lastActiveAt: true,
      trialEndsAt: true,
      emailVerified: true,
      completedOnboarding: true,
      identityProvider: true,
      twoFactorEnabled: true,
      verified: true,
      locked: true,
      isPlatformManaged: true,
      creationSource: true,
      timeZone: true,
      locale: true,
      weekStart: true,
      timeFormat: true,
      appTheme: true,
    },
  });
  if (!user) {
    return NextResponse.json({ message: "No user found" }, { status: 404 });
  }

  // session.user.org follows the profile the user is currently signed in with, so prefer it over the column
  const organizationId = session.user.org?.id ?? user.organizationId;

  const identity: PendoIdentity = {
    visitor: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      full_name: user.name,
      username: user.username,
      role: session.user.role ?? null,
      organizationId,
      orgRole: session.user.org?.role ?? null,
      belongsToActiveTeam: session.user.belongsToActiveTeam ?? null,
      createdDate: user.createdDate.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      emailVerified: user.emailVerified?.toISOString() ?? null,
      completedOnboarding: user.completedOnboarding,
      identityProvider: user.identityProvider,
      twoFactorEnabled: user.twoFactorEnabled,
      verified: user.verified,
      locked: user.locked,
      isPlatformManaged: user.isPlatformManaged,
      creationSource: user.creationSource,
      timeZone: user.timeZone,
      locale: user.locale,
      weekStart: user.weekStart,
      timeFormat: user.timeFormat,
      appTheme: user.appTheme,
    },
  };

  if (!organizationId) {
    return NextResponse.json(identity);
  }

  const organization = await prisma.team.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      isOrganization: true,
      isPlatform: true,
      pendingPayment: true,
      isPrivate: true,
      hideBranding: true,
      timeZone: true,
      organizationSettings: {
        select: {
          isOrganizationVerified: true,
          isOrganizationConfigured: true,
          isAdminReviewed: true,
          isAdminAPIEnabled: true,
        },
      },
    },
  });

  if (organization) {
    identity.account = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      isOrganization: organization.isOrganization,
      isPlatform: organization.isPlatform,
      pendingPayment: organization.pendingPayment,
      isPrivate: organization.isPrivate,
      hideBranding: organization.hideBranding,
      timeZone: organization.timeZone,
      isOrganizationVerified: organization.organizationSettings?.isOrganizationVerified ?? null,
      isOrganizationConfigured: organization.organizationSettings?.isOrganizationConfigured ?? null,
      isAdminReviewed: organization.organizationSettings?.isAdminReviewed ?? null,
      isAdminAPIEnabled: organization.organizationSettings?.isAdminAPIEnabled ?? null,
    };
  }

  return NextResponse.json(identity);
}

export const dynamic = "force-dynamic";

export const GET = defaultResponderForAppDir(getHandler);
