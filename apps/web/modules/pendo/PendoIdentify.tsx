"use client";

import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { clearPendoSession } from "@lib/pendo/pendo";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

type Me = RouterOutputs["viewer"]["me"]["get"];

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return new Date(value).toISOString();
};

function buildPendoIdentity(session: Session, me: Me): PendoIdentifyOptions {
  const sessionUser = session.user;
  const visitor = {
    id: me.id,
    email: me.email,
    full_name: me.name,
    uuid: sessionUser.uuid,
    username: me.username,
    role: sessionUser.role,
    organizationId: me.organizationId,
    orgRole: sessionUser.org?.role,
    belongsToActiveTeam: sessionUser.belongsToActiveTeam,
    createdDate: toIsoString(me.createdDate),
    emailVerified: toIsoString(me.emailVerified),
    trialEndsAt: toIsoString(me.trialEndsAt),
    completedOnboarding: me.completedOnboarding,
    locale: me.locale,
    timeZone: me.timeZone,
    timeFormat: me.timeFormat,
    weekStart: me.weekStart,
    identityProvider: me.identityProvider,
    twoFactorEnabled: me.twoFactorEnabled,
    appTheme: me.appTheme,
  };

  if (!me.organizationId) return { visitor };

  // Platform users get a placeholder organization without these fields, so narrow before reading them.
  const organization = me.organization && "isPrivate" in me.organization ? me.organization : null;

  return {
    visitor,
    account: {
      id: me.organizationId,
      name: sessionUser.org?.name ?? organization?.name,
      slug: sessionUser.org?.slug ?? organization?.slug,
      isPlatform: organization?.isPlatform,
      hideBranding: organization?.hideBranding,
      isPrivate: organization?.isPrivate,
    },
  };
}

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: status === "authenticated" });
  const hasIdentifiedVisitor = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session || !me || typeof pendo === "undefined") return;
    pendo.identify(buildPendoIdentity(session, me));
    hasIdentifiedVisitor.current = true;
  }, [status, session, me]);

  useEffect(() => {
    if (status !== "unauthenticated" || !hasIdentifiedVisitor.current) return;
    // Without this the next person to use this browser would be tracked as the previous visitor.
    clearPendoSession();
    hasIdentifiedVisitor.current = false;
  }, [status]);

  return null;
}
