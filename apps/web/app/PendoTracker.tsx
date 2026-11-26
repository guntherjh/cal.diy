"use client";

import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

type Me = RouterOutputs["viewer"]["me"]["get"];

type OrgDetails = {
  name?: string | null;
  isPlatform?: boolean;
  isPrivate?: boolean;
  hideBranding?: boolean;
  metadata?: {
    orgSeats?: number | null;
    orgPricePerSeat?: number | null;
    billingPeriod?: string;
  } | null;
};

const PASSWORD_RESET_PATH = /^\/auth\/forgot-password\/[^/]+$/;
const APP_SETUP_PATH = /^\/apps\/[^/]+\/setup$/;

const normalizePathname = (pathname: string | undefined): string =>
  String(pathname || "").replace(/\/+$/, "") || "/";

// Transforms run on every URL the SDK records, so generic keys like token, code, and state are only
// stripped on the pages where they carry auth material.
const getSensitiveQueryKeys = (search: string, url: URL): string[] => {
  const pathname = normalizePathname(url?.pathname);
  if (pathname === "/auth/verify-email-change" || pathname === "/signup") return ["token"];
  if (pathname === "/auth/oauth2/authorize") return ["state"];
  if (APP_SETUP_PATH.test(pathname)) return ["code"];
  if (pathname !== "/auth/login") return [];
  // Signed-out visitors on the OAuth authorize page are sent to login with the whole authorize URL in callbackUrl.
  const callbackUrl = new URLSearchParams(String(search || "")).get("callbackUrl") ?? "";
  if (callbackUrl.includes("auth/oauth2/authorize")) return ["callbackUrl"];
  return [];
};

// The reset request id in the path is enough to reset the password until it expires.
const redactPasswordResetPath = (pathname: string): string => {
  if (PASSWORD_RESET_PATH.test(normalizePathname(pathname))) return "/auth/forgot-password/redacted";
  return pathname;
};

const pendoLocationTransforms: PendoLocationTransform[] = [
  { attr: "search", action: "ExcludeKeys", data: getSensitiveQueryKeys },
  { attr: "pathname", action: "Replace", data: redactPasswordResetPath },
];

let hasInitializedPendo = false;

const toIsoString = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const buildPendoIdentity = (user: Session["user"], me: Me | undefined): PendoIdentity => {
  const identity: PendoIdentity = {
    visitor: {
      id: user.id,
      uuid: user.uuid,
      email: user.email ?? undefined,
      full_name: user.name ?? undefined,
      username: user.username ?? undefined,
      role: user.role,
      organizationId: me?.organizationId ?? user.org?.id ?? null,
      orgRole: user.org?.role,
      createdDate: toIsoString(me?.createdDate),
      trialEndsAt: toIsoString(me?.trialEndsAt),
      emailVerified: toIsoString(me?.emailVerified ?? user.emailVerified),
      completedOnboarding: me?.completedOnboarding ?? user.completedOnboarding,
      identityProvider: me?.identityProvider,
      twoFactorEnabled: me?.twoFactorEnabled,
      timeZone: me?.timeZone,
      locale: me?.locale ?? user.locale,
      weekStart: me?.weekStart,
      timeFormat: me?.timeFormat,
      appTheme: me?.appTheme,
      isPremium: me?.isPremium,
      belongsToActiveTeam: user.belongsToActiveTeam,
    },
  };

  const org = user.org;
  if (!org) return identity;

  // me.organization is a union whose members don't all carry every field, so read it through the optional shape.
  let orgDetails: OrgDetails | undefined;
  if (me?.organization?.id === org.id) orgDetails = me.organization;
  identity.account = {
    id: org.id,
    name: org.name ?? orgDetails?.name,
    slug: org.slug,
    // The session only carries org for teams flagged as organizations.
    isOrganization: true,
    isPlatform: orgDetails?.isPlatform,
    isPrivate: orgDetails?.isPrivate,
    hideBranding: orgDetails?.hideBranding,
    orgSeats: orgDetails?.metadata?.orgSeats,
    billingPeriod: orgDetails?.metadata?.billingPeriod,
    pricePerSeat: orgDetails?.metadata?.orgPricePerSeat,
  };
  return identity;
};

export function PendoTracker(): null {
  const { data: session, status } = useSession();
  const [isPendoReady, setIsPendoReady] = useState(false);
  const lastIdentityRef = useRef<string | null>(null);
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: status === "authenticated" });

  useEffect(() => {
    // The SDK ignores every initialize call after the first one.
    if (hasInitializedPendo || !window.pendo) return;
    hasInitializedPendo = true;
    window.pendo.initialize({
      visitor: { id: "" },
      location: { transforms: pendoLocationTransforms },
      events: { ready: () => setIsPendoReady(true) },
    });
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const identity = buildPendoIdentity(session.user, me);
    const serializedIdentity = JSON.stringify(identity);
    if (serializedIdentity === lastIdentityRef.current) return;
    lastIdentityRef.current = serializedIdentity;
    window.pendo?.identify(identity);
  }, [status, session?.user, me]);

  // Sign-out runs through many signOut() call sites that each end in a full page load, so the
  // previous visitor is cleared here once the agent reports that the session is gone.
  useEffect(() => {
    if (status !== "unauthenticated") return;
    lastIdentityRef.current = null;
    const pendoAgent = window.pendo;
    if (!isPendoReady || !pendoAgent || pendoAgent.isAnonymousVisitor?.() !== false) return;
    pendoAgent.clearSession?.();
  }, [status, isPendoReady]);

  return null;
}
