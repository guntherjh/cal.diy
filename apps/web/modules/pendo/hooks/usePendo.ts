import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const toIsoString = (value: Date | string | null | undefined): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

export const usePendo = (): void => {
  const { data: user, isLoading } = useMeQuery();
  const { data: session } = useSession();

  useEffect(() => {
    if (isLoading || !user || !session || typeof pendo === "undefined") return;

    const sessionUser = session.user;
    const org = sessionUser.org;

    pendo.identify({
      visitor: {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.name,
        uuid: sessionUser.uuid,
        username: sessionUser.username,
        role: sessionUser.role,
        organizationId: org?.id,
        orgRole: org?.role,
        belongsToActiveTeam: sessionUser.belongsToActiveTeam,
        createdDate: toIsoString(user.createdDate),
        trialEndsAt: toIsoString(user.trialEndsAt),
        emailVerified: toIsoString(user.emailVerified),
        completedOnboarding: user.completedOnboarding,
        identityProvider: user.identityProvider,
        twoFactorEnabled: user.twoFactorEnabled,
        timeZone: user.timeZone,
        locale: user.locale,
        timeFormat: user.timeFormat,
        weekStart: user.weekStart,
        appTheme: user.appTheme,
        isPremium: user.isPremium,
      },
      // The session only carries an org for non-platform organizations, so visitors without one have no account.
      ...(org
        ? {
            account: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              isOrganization: true,
              isPlatform: user.organization?.isPlatform,
            },
          }
        : {}),
    });
  }, [isLoading, user, session]);
};
