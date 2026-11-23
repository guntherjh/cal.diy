"use client";

import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const SENSITIVE_QUERY_KEYS_BY_PATH: { pathname: RegExp; keys: string[] }[] = [
  // Team invite tokens and email change verification tokens
  { pathname: /^\/signup\/?$/, keys: ["token"] },
  { pathname: /^\/teams\/?$/, keys: ["token"] },
  { pathname: /^\/auth\/verify-email-change\/?$/, keys: ["token"] },
  // OAuth authorization codes returned to the payment app setup callbacks
  { pathname: /^\/apps\/[^/]+\/setup\/?$/, keys: ["code"] },
];

const PASSWORD_RESET_PATHNAME = /^\/auth\/forgot-password\/[^/]+\/?$/;

// Transforms run on every URL the SDK records, so keys are only stripped on the pages that carry them.
// A transform that throws makes the SDK fall back to the raw URL, so the callbacks never throw.
const pendoLocationTransforms: PendoLocationTransform[] = [
  {
    attr: "search",
    action: "ExcludeKeys",
    data: (_search: string, url: URL): string[] => {
      const pathname = String(url?.pathname ?? "");
      const match = SENSITIVE_QUERY_KEYS_BY_PATH.find((entry) => entry.pathname.test(pathname));
      return match?.keys ?? [];
    },
  },
  {
    attr: "pathname",
    action: "Replace",
    data: (pathname: string): string => {
      const value = String(pathname ?? "");
      if (!PASSWORD_RESET_PATHNAME.test(value)) return value;
      return "/auth/forgot-password/redacted";
    },
  },
];

let isPendoInitialized = false;
let isPendoReady = false;
let isSignedOut = false;

// Sign-out happens from many places and usually ends in a full page redirect, so the identified
// visitor is cleared on the first page that loads without a session instead of at each call site.
function clearIdentifiedVisitorAfterSignOut(): void {
  const agent = window.pendo;
  if (!isPendoReady || !isSignedOut || !agent?.clearSession || !agent.getVisitorId) return;
  if (!agent.isAnonymousVisitor || agent.isAnonymousVisitor(agent.getVisitorId())) return;
  agent.clearSession();
}

function initializePendo(): void {
  if (isPendoInitialized || !window.pendo) return;
  isPendoInitialized = true;
  window.pendo.initialize({
    visitor: { id: "" },
    location: { transforms: pendoLocationTransforms },
    events: {
      ready: (): void => {
        isPendoReady = true;
        clearIdentifiedVisitorAfterSignOut();
      },
    },
  });
}

export function PendoTracker(): null {
  const { status } = useSession();
  const { data: identity } = trpc.viewer.me.pendoMetadata.useQuery(undefined, {
    enabled: status === "authenticated",
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    initializePendo();
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    isSignedOut = status === "unauthenticated";
    clearIdentifiedVisitorAfterSignOut();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !identity) return;
    window.pendo?.identify(identity);
  }, [status, identity]);

  return null;
}
