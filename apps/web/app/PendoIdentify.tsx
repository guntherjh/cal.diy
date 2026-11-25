"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const IDENTIFIED_STORAGE_KEY = "novus-pendo-identified";
const AGENT_POLL_INTERVAL_MS = 200;
const AGENT_POLL_MAX_ATTEMPTS = 50;

// Storage can be unavailable (privacy modes, embeds in third-party iframes), and analytics must never break the page.
function setIdentifiedFlag(identified: boolean): void {
  try {
    if (identified) {
      window.localStorage.setItem(IDENTIFIED_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(IDENTIFIED_STORAGE_KEY);
    }
  } catch {
    return;
  }
}

function hasIdentifiedFlag(): boolean {
  try {
    return window.localStorage.getItem(IDENTIFIED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });
  const uuid = session?.user.uuid;
  const role = session?.user.role;

  useEffect(() => {
    if (!isAuthenticated || !me) return;

    window.pendo?.identify({
      visitor: {
        id: me.id,
        email: me.email,
        full_name: me.name,
        uuid,
        username: me.username,
        role,
        createdDate: toIsoString(me.createdDate),
        emailVerified: toIsoString(me.emailVerified),
        trialEndsAt: toIsoString(me.trialEndsAt),
        completedOnboarding: me.completedOnboarding,
        twoFactorEnabled: me.twoFactorEnabled,
        identityProvider: me.identityProvider,
        locale: me.locale,
        timeZone: me.timeZone,
        timeFormat: me.timeFormat,
        weekStart: me.weekStart,
        appTheme: me.appTheme,
        theme: me.theme,
        hideBranding: me.hideBranding,
        allowDynamicBooking: me.allowDynamicBooking,
        allowSEOIndexing: me.allowSEOIndexing,
        receiveMonthlyDigestEmail: me.receiveMonthlyDigestEmail,
        requiresBookerEmailVerification: me.requiresBookerEmailVerification,
        bufferTime: me.bufferTime,
        isPremium: me.isPremium,
      },
    });
    setIdentifiedFlag(true);
  }, [isAuthenticated, me, uuid, role]);

  // Every signOut call in the app ends in a full page load, so the sign-out is only observable on the next
  // page as an unauthenticated session. The agent would otherwise keep the previous visitor from storage.
  // clearSession isn't stubbed by the install snippet, so wait for the agent script to load.
  useEffect(() => {
    if (status !== "unauthenticated" || !hasIdentifiedFlag()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const agent = window.pendo;
      if (agent?.clearSession) {
        agent.clearSession();
        setIdentifiedFlag(false);
        window.clearInterval(timer);
        return;
      }
      if (attempts >= AGENT_POLL_MAX_ATTEMPTS) window.clearInterval(timer);
    }, AGENT_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [status]);

  return null;
}
