import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PendoIdentity } from "@lib/pendo/types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

type SessionOrg = NonNullable<Session["user"]["org"]>;

const toIsoString = (date: Date | null | undefined): string | null => date?.toISOString() ?? null;

async function getVisitor(session: Session): Promise<PendoIdentity["visitor"] | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      uuid: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      createdDate: true,
      lastActiveAt: true,
      emailVerified: true,
      trialEndsAt: true,
      completedOnboarding: true,
      identityProvider: true,
      twoFactorEnabled: true,
      timeZone: true,
      locale: true,
      timeFormat: true,
      weekStart: true,
      appTheme: true,
      locked: true,
      isPlatformManaged: true,
      creationSource: true,
      verified: true,
    },
  });
  if (!user) return null;

  return {
    id: String(user.id),
    uuid: user.uuid,
    email: user.email,
    full_name: user.name,
    // The session role carries INACTIVE_ADMIN, which is never stored on the user record.
    role: session.user.role ?? user.role,
    organizationId: user.organizationId,
    orgRole: session.user.org?.role ?? null,
    createdDate: toIsoString(user.createdDate),
    lastActiveAt: toIsoString(user.lastActiveAt),
    emailVerified: toIsoString(user.emailVerified),
    trialEndsAt: toIsoString(user.trialEndsAt),
    completedOnboarding: user.completedOnboarding,
    identityProvider: user.identityProvider,
    twoFactorEnabled: user.twoFactorEnabled,
    timeZone: user.timeZone,
    locale: user.locale,
    timeFormat: user.timeFormat,
    weekStart: user.weekStart,
    appTheme: user.appTheme,
    locked: user.locked,
    isPlatformManaged: user.isPlatformManaged,
    creationSource: user.creationSource,
    verified: user.verified,
  };
}

async function getAccount(sessionOrg: SessionOrg): Promise<PendoIdentity["account"] | null> {
  const organization = await prisma.team.findUnique({
    where: { id: sessionOrg.id },
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
      organizationBilling: {
        select: {
          planName: true,
          status: true,
          paidSeats: true,
          billingPeriod: true,
          subscriptionStart: true,
          subscriptionTrialEnd: true,
          subscriptionEnd: true,
        },
      },
      organizationSettings: {
        select: {
          isOrganizationVerified: true,
          isAdminReviewed: true,
          isAdminAPIEnabled: true,
        },
      },
    },
  });
  if (!organization) return null;

  const billing = organization.organizationBilling;
  const settings = organization.organizationSettings;

  return {
    id: String(organization.id),
    name: organization.name,
    slug: organization.slug,
    createdAt: toIsoString(organization.createdAt),
    isOrganization: organization.isOrganization,
    isPlatform: organization.isPlatform,
    pendingPayment: organization.pendingPayment,
    isPrivate: organization.isPrivate,
    hideBranding: organization.hideBranding,
    timeZone: organization.timeZone,
    planName: billing?.planName ?? null,
    subscriptionStatus: billing?.status ?? null,
    paidSeats: billing?.paidSeats ?? null,
    billingPeriod: billing?.billingPeriod ?? null,
    subscriptionStart: toIsoString(billing?.subscriptionStart),
    subscriptionTrialEnd: toIsoString(billing?.subscriptionTrialEnd),
    subscriptionEnd: toIsoString(billing?.subscriptionEnd),
    isOrganizationVerified: settings?.isOrganizationVerified ?? null,
    isAdminReviewed: settings?.isAdminReviewed ?? null,
    isAdminAPIEnabled: settings?.isAdminAPIEnabled ?? null,
  };
}

async function getHandler(): Promise<NextResponse> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const visitor = await getVisitor(session);
  if (!visitor) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const identity: PendoIdentity = { visitor };
  if (session.user.org) {
    const account = await getAccount(session.user.org);
    if (account) identity.account = account;
  }

  return NextResponse.json(identity, { headers: { "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";

export const GET: ReturnType<typeof defaultResponderForAppDir> = defaultResponderForAppDir(getHandler);
