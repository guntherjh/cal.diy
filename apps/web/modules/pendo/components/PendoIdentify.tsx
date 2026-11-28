"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const PENDO_READY_EVENT = "pendo:ready";

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const onPendoReady = (callback: () => void) => {
  if (window.pendo?.isReady?.()) {
    callback();
    return () => undefined;
  }
  window.addEventListener(PENDO_READY_EVENT, callback, { once: true });
  return () => window.removeEventListener(PENDO_READY_EVENT, callback);
};

export function PendoIdentify() {
  const { data: session, status } = useSession();
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: status === "authenticated" });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || !window.pendo) return;

    const sessionUser = session.user;
    const org = sessionUser.org;

    window.pendo.identify({
      visitor: {
        id: String(sessionUser.id),
        uuid: sessionUser.uuid,
        email: me?.email ?? sessionUser.email,
        full_name: me?.name ?? sessionUser.name,
        username: me?.username ?? sessionUser.username,
        role: sessionUser.role,
        organizationId: me?.organizationId ?? org?.id ?? null,
        orgRole: org?.role ?? null,
        createdDate: toIsoString(me?.createdDate),
        trialEndsAt: toIsoString(me?.trialEndsAt),
        emailVerified: toIsoString(me?.emailVerified ?? sessionUser.emailVerified),
        completedOnboarding: me?.completedOnboarding ?? sessionUser.completedOnboarding,
        identityProvider: me?.identityProvider,
        twoFactorEnabled: me?.twoFactorEnabled,
        timeZone: me?.timeZone,
        locale: me?.locale ?? sessionUser.locale,
        weekStart: me?.weekStart,
        timeFormat: me?.timeFormat,
        appTheme: me?.appTheme,
      },
      ...(org
        ? {
            account: {
              id: String(org.id),
              name: org.name,
              slug: org.slug,
              isPlatform: me?.organization?.isPlatform,
            },
          }
        : {}),
    });
  }, [status, session, me]);

  useEffect(() => {
    if (status !== "unauthenticated") return;

    // Every signOut() call lands on a page where the session is unauthenticated, so clearing here covers
    // all logout paths. The anonymous check keeps public booking pages from minting a new visitor per load.
    return onPendoReady(() => {
      if (window.pendo?.isAnonymousVisitor?.() === false) {
        window.pendo.clearSession?.();
      }
    });
  }, [status]);

  return null;
}
