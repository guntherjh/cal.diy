"use client";

import { trpc } from "@calcom/trpc/react/trpc";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { clearPendoSessionIfIdentified, identifyPendoVisitor, initializePendo } from "./pendo";

export function PendoTracker() {
  const { data: session, status } = useSession();
  const [isAgentReady, setIsAgentReady] = useState(false);
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: status === "authenticated" });

  useEffect(() => {
    initializePendo(() => setIsAgentReady(true));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    identifyPendoVisitor(session.user, me);
  }, [status, session?.user, me]);

  // Every sign-out path ends on a page without a session, so this also covers sign-outs that
  // reload the page before the agent has loaded and can clear the previous visitor.
  useEffect(() => {
    if (status !== "unauthenticated" || !isAgentReady) return;
    clearPendoSessionIfIdentified();
  }, [status, isAgentReady]);

  return null;
}
