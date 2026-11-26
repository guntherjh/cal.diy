import type { RouterOutputs } from "@calcom/trpc/react/trpc";
import type { Session } from "next-auth";

type MeOutput = RouterOutputs["viewer"]["me"]["get"];
type MetadataInput = Record<string, PendoMetadataValue | Date | null | undefined>;

const REDACTED_RESET_PATHNAME = "/auth/forgot-password/redacted";
const PASSWORD_RESET_PATHNAME = /^\/auth\/forgot-password\/[^/]+\/?$/;

// Token-carrying query parameters, scoped to the pages that actually receive them so the same
// generic names on other pages are still recorded.
const SENSITIVE_QUERY_KEYS_BY_PATHNAME: { pathname: RegExp; keys: string[] }[] = [
  { pathname: /^\/(signup|teams|auth\/verify-email-change)\/?$/, keys: ["token"] },
  { pathname: /^\/apps\/[^/]+\/setup\/?$/, keys: ["code"] },
];

let isPendoInitialized = false;

// A transform that throws makes the agent record the untransformed URL, so both callbacks
// guard their inputs instead of assuming a well-formed value.
const pendoLocationTransforms: PendoLocationTransform[] = [
  {
    attr: "search",
    action: "ExcludeKeys",
    data: (_search, url) => {
      const pathname = String(url?.pathname ?? "");
      const match = SENSITIVE_QUERY_KEYS_BY_PATHNAME.find((entry) => entry.pathname.test(pathname));
      return match ? match.keys : [];
    },
  },
  {
    attr: "pathname",
    action: "Replace",
    data: (pathname) => {
      const value = String(pathname ?? "");
      return PASSWORD_RESET_PATHNAME.test(value) ? REDACTED_RESET_PATHNAME : value;
    },
  },
];

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const withoutEmptyValues = (metadata: MetadataInput) => {
  const result: Record<string, PendoMetadataValue> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    result[key] = value instanceof Date ? value.toISOString() : value;
  });
  return result;
};

export const initializePendo = (onReady: () => void) => {
  if (isPendoInitialized || typeof window === "undefined" || !window.pendo) return;
  isPendoInitialized = true;
  window.pendo.initialize({
    visitor: { id: "" },
    location: { transforms: pendoLocationTransforms },
    events: { ready: onReady },
  });
};

export const identifyPendoVisitor = (user: Session["user"], me: MeOutput | undefined) => {
  if (typeof window === "undefined" || !window.pendo) return;

  const visitor = {
    ...withoutEmptyValues({
      email: user.email,
      full_name: user.name,
      uuid: user.uuid,
      username: user.username,
      role: user.role,
      organizationId: user.org?.id ?? me?.organizationId,
      orgRole: user.org?.role,
      belongsToActiveTeam: user.belongsToActiveTeam,
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
    }),
    id: user.id,
  };

  const org = user.org;
  if (!org) {
    window.pendo.identify({ visitor });
    return;
  }

  const meOrganization = me?.organization?.id === org.id ? me.organization : undefined;
  // The platform branch of viewer.me.get returns a reduced organization shape without these fields.
  const meOrganizationName = meOrganization && "name" in meOrganization ? meOrganization.name : undefined;
  const meHideBranding =
    meOrganization && "hideBranding" in meOrganization ? meOrganization.hideBranding : undefined;
  const account = {
    ...withoutEmptyValues({
      name: org.name ?? meOrganizationName,
      slug: org.slug,
      // session.user.org is only ever set for a Team with isOrganization=true.
      isOrganization: true,
      isPlatform: meOrganization?.isPlatform,
      hideBranding: meHideBranding,
    }),
    id: org.id,
  };

  window.pendo.identify({ visitor, account });
};

export const clearPendoSession = () => {
  if (typeof window === "undefined") return;
  window.pendo?.clearSession?.();
};

export const clearPendoSessionIfIdentified = () => {
  if (typeof window === "undefined" || !window.pendo?.isAnonymousVisitor) return;
  if (window.pendo.isAnonymousVisitor()) return;
  clearPendoSession();
};
