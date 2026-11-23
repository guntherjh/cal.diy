"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { identifyPendoVisitor, initializePendo, resetPendoVisitorIfSignedOut } from "../lib/pendo";

const toIsoString = (value: Date | string | null | undefined): string | null | undefined => {
  if (value === null) return null;
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export function PendoTracker(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });
  const sessionUser = session?.user;

  useEffect((): void => {
    initializePendo();
  }, []);

  useEffect((): void => {
    if (status === "unauthenticated") resetPendoVisitorIfSignedOut();
  }, [status]);

  useEffect((): void => {
    if (!isAuthenticated || !sessionUser) return;

    identifyPendoVisitor({
      visitor: {
        id: sessionUser.id,
        uuid: sessionUser.uuid,
        email: me?.email ?? sessionUser.email,
        full_name: me?.name ?? sessionUser.name,
        username: sessionUser.username ?? me?.username,
        role: sessionUser.role,
        createdDate: toIsoString(me?.createdDate),
        trialEndsAt: toIsoString(me?.trialEndsAt),
        emailVerified: toIsoString(me?.emailVerified),
        completedOnboarding: me?.completedOnboarding ?? sessionUser.completedOnboarding,
        identityProvider: me?.identityProvider,
        twoFactorEnabled: me?.twoFactorEnabled,
        locale: me?.locale ?? sessionUser.locale,
        timeZone: me?.timeZone,
        timeFormat: me?.timeFormat,
        weekStart: me?.weekStart,
        appTheme: me?.appTheme,
        hideBranding: me?.hideBranding,
        allowDynamicBooking: me?.allowDynamicBooking,
        allowSEOIndexing: me?.allowSEOIndexing,
        requiresBookerEmailVerification: me?.requiresBookerEmailVerification,
      },
    });
  }, [isAuthenticated, sessionUser, me]);

  return null;
}
