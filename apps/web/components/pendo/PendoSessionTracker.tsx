"use client";

import type { PendoAgent, PendoIdentity } from "@lib/pendo/types";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

// Lets a later page load know a visitor was identified in this browser, so sign-outs that end in a
// full-page redirect still reset Pendo to an anonymous visitor.
const IDENTIFIED_VISITOR_STORAGE_KEY = "novus-identified-visitor";

const readIdentifiedVisitor = (): string | null => {
  try {
    return window.localStorage.getItem(IDENTIFIED_VISITOR_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeIdentifiedVisitor = (visitorId: string | null): void => {
  try {
    if (visitorId) {
      window.localStorage.setItem(IDENTIFIED_VISITOR_STORAGE_KEY, visitorId);
    } else {
      window.localStorage.removeItem(IDENTIFIED_VISITOR_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private mode or sandboxed embeds.
  }
};

const whenPendoAgentLoaded = (callback: (pendo: PendoAgent) => void): void => {
  const pendo = window.pendo;
  if (typeof pendo?.clearSession === "function") {
    callback(pendo);
    return;
  }
  const agentScript = document.querySelector<HTMLScriptElement>('script[src$="/pendo.js"]');
  agentScript?.addEventListener(
    "load",
    () => {
      if (window.pendo) callback(window.pendo);
    },
    { once: true }
  );
};

export function PendoSessionTracker(): null {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !userId) {
      if (!readIdentifiedVisitor()) return;
      writeIdentifiedVisitor(null);
      whenPendoAgentLoaded((pendo) => pendo.clearSession?.());
      return;
    }

    const controller = new AbortController();
    fetch("/api/pendo/identity", { signal: controller.signal })
      .then((response): Promise<PendoIdentity> | null => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((identity) => {
        if (!identity || !window.pendo) return;
        window.pendo.identify(identity);
        writeIdentifiedVisitor(identity.visitor.id);
      })
      .catch(() => {
        // Analytics must never interrupt the app, and aborted requests land here on unmount.
      });

    return () => controller.abort();
  }, [status, userId]);

  return null;
}
