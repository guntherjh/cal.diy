"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import type { PendoIdentifyOptions } from "@lib/pendo/pendo";

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  // Gated on the session so public booking pages don't send a `me` request for every anonymous visitor.
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated || !session?.user || !window.pendo) return;

    const { user } = session;
    const org = user.org;
    const meOrganization = me?.organization && org && me.organization.id === org.id ? me.organization : null;

    const options: PendoIdentifyOptions = {
      visitor: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        full_name: user.name,
        username: user.username,
        role: user.role,
        organizationId: me?.organizationId ?? org?.id ?? null,
        orgRole: org?.role,
        belongsToActiveTeam: user.belongsToActiveTeam,
        createdDate: toIsoString(me?.createdDate),
        trialEndsAt: toIsoString(me?.trialEndsAt),
        emailVerified: toIsoString(me?.emailVerified ?? user.emailVerified),
        completedOnboarding: me?.completedOnboarding ?? user.completedOnboarding,
        identityProvider: me?.identityProvider,
        twoFactorEnabled: me?.twoFactorEnabled,
        locale: me?.locale ?? user.locale,
        timeZone: me?.timeZone,
        weekStart: me?.weekStart,
        timeFormat: me?.timeFormat,
        appTheme: me?.appTheme,
        hideBranding: me?.hideBranding,
      },
    };

    if (org) {
      options.account = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        isOrganization: true,
        isPlatform: meOrganization?.isPlatform,
        isPrivate: meOrganization && "isPrivate" in meOrganization ? meOrganization.isPrivate : undefined,
      };
    }

    window.pendo.identify(options);
  }, [isAuthenticated, session, me]);

  return null;
}
