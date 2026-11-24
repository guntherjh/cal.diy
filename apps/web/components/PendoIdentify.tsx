"use client";

import { trpc } from "@calcom/trpc/react";
import { clearPendoSession } from "@lib/pendo";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const AGENT_POLL_INTERVAL_MS = 500;
const AGENT_POLL_TIMEOUT_MS = 15000;

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export function PendoIdentify() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });

  const sessionUsername = session?.user.username;
  const sessionRole = session?.user.role;
  const sessionLocale = session?.user.locale;

  useEffect(() => {
    if (!isAuthenticated || !me) return;

    window.pendo?.identify({
      visitor: {
        id: me.id,
        email: me.email,
        full_name: me.name,
        uuid: me.uuid,
        username: sessionUsername ?? me.username ?? null,
        role: sessionRole ?? null,
        createdDate: toIsoString(me.createdDate),
        lastActiveAt: toIsoString(me.lastActiveAt),
        emailVerified: toIsoString(me.emailVerified),
        trialEndsAt: toIsoString(me.trialEndsAt),
        completedOnboarding: me.completedOnboarding,
        identityProvider: me.identityProvider,
        twoFactorEnabled: me.twoFactorEnabled,
        creationSource: me.creationSource,
        locale: me.locale ?? sessionLocale ?? null,
        timeZone: me.timeZone,
        timeFormat: me.timeFormat,
        weekStart: me.weekStart,
        appTheme: me.appTheme,
        hideBranding: me.hideBranding,
        locked: me.locked,
        isPlatformManaged: me.isPlatformManaged,
      },
    });
  }, [isAuthenticated, me, sessionUsername, sessionRole, sessionLocale]);

  // Every sign-out path ends on a fresh page load without a session, where the SDK restores the
  // previous visitor from storage. The agent loads asynchronously, so retry until it's available.
  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (clearPendoSession()) return;

    const interval = window.setInterval(() => {
      if (clearPendoSession()) window.clearInterval(interval);
    }, AGENT_POLL_INTERVAL_MS);
    const timeout = window.setTimeout(() => window.clearInterval(interval), AGENT_POLL_TIMEOUT_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [status]);

  return null;
}

export default PendoIdentify;
