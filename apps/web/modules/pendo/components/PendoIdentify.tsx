"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const { data: user } = trpc.viewer.me.get.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (status !== "authenticated" || !session || !user) return;
    if (typeof pendo === "undefined") return;

    const identity: PendoIdentity = {
      visitor: {
        id: String(user.id),
        email: user.email,
        full_name: user.name,
        uuid: session.user.uuid,
        username: user.username,
        role: session.user.role,
        organizationId: user.organizationId,
        createdDate: toIsoString(user.createdDate),
        trialEndsAt: toIsoString(user.trialEndsAt),
        emailVerified: toIsoString(user.emailVerified),
        completedOnboarding: user.completedOnboarding,
        identityProvider: user.identityProvider,
        twoFactorEnabled: user.twoFactorEnabled,
        locale: user.locale,
        timeZone: user.timeZone,
        timeFormat: user.timeFormat,
        weekStart: user.weekStart,
        appTheme: user.appTheme,
        hideBranding: user.hideBranding,
        allowDynamicBooking: user.allowDynamicBooking,
      },
    };

    // The session only carries an org for non-platform organizations, so users without one stay out of account data.
    const org = session.user.org;
    if (org) {
      identity.account = {
        id: String(org.id),
        name: org.name,
        slug: org.slug,
        isOrganization: true,
        isPlatform: user.organization?.isPlatform,
      };
    }

    pendo.identify(identity);
  }, [status, session, user]);

  return null;
}
