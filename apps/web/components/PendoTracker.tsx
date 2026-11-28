"use client";

import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Me = RouterOutputs["viewer"]["me"]["get"];

// Pages that receive a credential in the query string, mapped to the parameters to drop from the URL
// the SDK records. Gated by path so ordinary parameters with the same name elsewhere are left alone.
const SENSITIVE_QUERY_KEYS_BY_PATH: { pattern: RegExp; keys: string[] }[] = [
  { pattern: /^\/signup\/?$/, keys: ["token"] },
  { pattern: /^\/teams\/?$/, keys: ["token"] },
  { pattern: /^\/auth\/verify-email-change\/?$/, keys: ["token"] },
  { pattern: /^\/apps\/[^/]+\/setup\/?$/, keys: ["code"] },
];

// The password reset request ID in this path is enough to reset the account password.
const PASSWORD_RESET_PATH = /^\/auth\/forgot-password\/[^/]+/;

// Transforms must never throw: the SDK would fall back to recording the untransformed URL.
const locationTransforms: PendoLocationTransform[] = [
  {
    attr: "search",
    action: "ExcludeKeys",
    data: (_search: string, url: URL): string[] => {
      const pathname = String(url?.pathname || "");
      const match = SENSITIVE_QUERY_KEYS_BY_PATH.find(({ pattern }) => pattern.test(pathname));
      return match?.keys ?? [];
    },
  },
  {
    attr: "pathname",
    action: "Replace",
    data: (pathname: string): string =>
      String(pathname || "").replace(PASSWORD_RESET_PATH, "/auth/forgot-password/redacted"),
  },
];

let isPendoInitialized = false;

const toIsoString = (value: Date | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const buildPendoIdentity = (user: Session["user"], me: Me | undefined): PendoIdentity => {
  const org = user.org;
  const visitor: PendoIdentity["visitor"] = {
    id: user.id,
    email: user.email,
    full_name: user.name,
    uuid: user.uuid,
    username: user.username,
    role: user.role,
    accountId: org?.id,
    orgRole: org?.role,
    belongsToActiveTeam: user.belongsToActiveTeam,
    createdDate: toIsoString(me?.createdDate),
    emailVerified: toIsoString(me?.emailVerified),
    trialEndsAt: toIsoString(me?.trialEndsAt),
    completedOnboarding: me?.completedOnboarding,
    identityProvider: me?.identityProvider,
    twoFactorEnabled: me?.twoFactorEnabled,
    locale: me?.locale ?? user.locale,
    timeZone: me?.timeZone,
    weekStart: me?.weekStart,
    timeFormat: me?.timeFormat,
    appTheme: me?.appTheme,
    hideBranding: me?.hideBranding,
  };
  if (!org) return { visitor };

  let meOrganization: Me["organization"] | undefined;
  if (me?.organization?.id === org.id) meOrganization = me.organization;
  let orgMetadata: Extract<Me["organization"], { metadata: unknown }>["metadata"] | undefined;
  if (meOrganization && "metadata" in meOrganization) orgMetadata = meOrganization.metadata;
  return {
    visitor,
    account: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isOrganization: true,
      isPlatform: meOrganization?.isPlatform,
      orgSeats: orgMetadata?.orgSeats,
      orgPricePerSeat: orgMetadata?.orgPricePerSeat,
      billingPeriod: orgMetadata?.billingPeriod,
    },
  };
};

export function PendoTracker(): null {
  const { data: session, status } = useSession();
  const [isAgentReady, setIsAgentReady] = useState(false);
  const isAuthenticated = status === "authenticated";
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (isPendoInitialized || !window.pendo) return;
    isPendoInitialized = true;
    window.pendo.initialize({
      visitor: { id: "" },
      location: { transforms: locationTransforms },
      events: { ready: (): void => setIsAgentReady(true) },
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !session?.user || !window.pendo) return;
    window.pendo.identify(buildPendoIdentity(session.user, me));
  }, [isAuthenticated, session, me]);

  useEffect(() => {
    if (status !== "unauthenticated" || !isAgentReady || !window.pendo) return;
    // A sign-out redirect lands on a fresh page where the agent still holds the previous visitor.
    if (window.pendo.isAnonymousVisitor?.() === false) {
      window.pendo.clearSession?.();
    }
  }, [status, isAgentReady]);

  return null;
}
