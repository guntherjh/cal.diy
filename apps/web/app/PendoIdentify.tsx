"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const toIsoString = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const { data: me, isPending } = trpc.viewer.me.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  useEffect((): void => {
    if (status !== "authenticated" || !session?.user) return;
    // Wait for the profile query to settle so the visitor is identified once with the full metadata set.
    // If it fails, identify with the session fields alone rather than leaving the visitor anonymous.
    if (isPending) return;

    const { user } = session;
    const org = user.org;
    const meOrganization = me?.organization;

    window.pendo?.identify({
      visitor: {
        id: user.id,
        uuid: user.uuid,
        email: user.email ?? me?.email,
        full_name: user.name ?? me?.name,
        username: user.username ?? me?.username,
        role: user.role,
        accountId: org?.id ?? me?.organizationId,
        orgRole: org?.role,
        createdDate: toIsoString(me?.createdDate),
        trialEndsAt: toIsoString(me?.trialEndsAt),
        emailVerified: toIsoString(me?.emailVerified ?? user.emailVerified),
        completedOnboarding: me?.completedOnboarding ?? user.completedOnboarding,
        belongsToActiveTeam: user.belongsToActiveTeam,
        identityProvider: me?.identityProvider,
        twoFactorEnabled: me?.twoFactorEnabled,
        locale: me?.locale ?? user.locale,
        timeZone: me?.timeZone,
        weekStart: me?.weekStart,
        timeFormat: me?.timeFormat,
        appTheme: me?.appTheme,
        hideBranding: me?.hideBranding,
      },
      ...(org && {
        account: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          // session.user.org is only populated for teams where isOrganization is true.
          isOrganization: true,
          isPlatform: meOrganization?.isPlatform,
          isPrivate: meOrganization && "isPrivate" in meOrganization ? meOrganization.isPrivate : undefined,
        },
      }),
    });
  }, [status, session, me, isPending]);

  return null;
}
