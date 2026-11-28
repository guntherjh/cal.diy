"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

async function fetchPendoIdentity(fallback: PendoIdentity): Promise<PendoIdentity> {
  try {
    const res = await fetch("/api/pendo/identity", { credentials: "same-origin" });
    if (!res.ok) return fallback;
    return (await res.json()) as PendoIdentity;
  } catch {
    // Fall back to the session fields so the visitor is still identified
    return fallback;
  }
}

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const userId = session?.user.id;
  const email = session?.user.email ?? null;
  const name = session?.user.name ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    // Guards against identifying after sign-out when the request resolves late
    let isCurrent = true;

    fetchPendoIdentity({ visitor: { id: userId, email, full_name: name } }).then((identity) => {
      if (isCurrent) window.pendo?.identify(identity);
    });

    return (): void => {
      isCurrent = false;
    };
  }, [isAuthenticated, userId, email, name]);

  return null;
}
