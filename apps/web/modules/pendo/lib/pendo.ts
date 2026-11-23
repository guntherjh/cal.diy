// Credential query parameters are only stripped on the routes that carry them, because
// "token" and "code" are generic names that other pages may use for ordinary data.
const CREDENTIAL_QUERY_KEYS_BY_ROUTE: { route: RegExp; keys: string[] }[] = [
  { route: /^\/auth\/verify-email-change\/?$/, keys: ["token"] },
  { route: /^\/signup\/?$/, keys: ["token"] },
  { route: /^\/teams\/?$/, keys: ["token"] },
  { route: /^\/apps\/[^/]+\/setup\/?$/, keys: ["code"] },
];

// The password reset request id in this path is enough to reset the account password.
const PASSWORD_RESET_ROUTE = /^\/auth\/forgot-password\/[^/]+/;
const REDACTED_PASSWORD_RESET_ROUTE = "/auth/forgot-password/redacted";

// Transforms must never throw: the agent falls back to recording the untransformed URL.
const getCredentialQueryKeys = (_search: string, url?: URL): string[] => {
  const pathname = url?.pathname;
  if (typeof pathname !== "string") return [];
  const match = CREDENTIAL_QUERY_KEYS_BY_ROUTE.find(({ route }) => route.test(pathname));
  return match?.keys ?? [];
};

const redactPasswordResetId = (pathname: string): string => {
  if (typeof pathname !== "string" || !PASSWORD_RESET_ROUTE.test(pathname)) return pathname;
  return pathname.replace(PASSWORD_RESET_ROUTE, REDACTED_PASSWORD_RESET_ROUTE);
};

const PENDO_LOCATION_TRANSFORMS: PendoLocationTransform[] = [
  { attr: "search", action: "ExcludeKeys", data: getCredentialQueryKeys },
  { attr: "pathname", action: "Replace", data: redactPasswordResetId },
];

let isInitialized = false;
let isAgentReady = false;
let hasSignedInVisitor = false;
let lastIdentityPayload: string | null = null;
const onAgentReady: (() => void)[] = [];

const getPendo = (): PendoAgent | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.pendo;
};

const whenAgentReady = (callback: () => void): void => {
  if (isAgentReady) {
    callback();
    return;
  }
  onAgentReady.push(callback);
};

export const initializePendo = (): void => {
  const agent = getPendo();
  if (isInitialized || !agent) return;
  isInitialized = true;

  agent.initialize({
    visitor: { id: "" },
    location: { transforms: PENDO_LOCATION_TRANSFORMS },
    events: {
      ready: (): void => {
        isAgentReady = true;
        for (const callback of onAgentReady.splice(0)) {
          callback();
        }
      },
    },
  });
};

export const identifyPendoVisitor = (identity: PendoIdentity): void => {
  const agent = getPendo();
  if (!agent) return;

  hasSignedInVisitor = true;
  const payload = JSON.stringify(identity);
  if (payload === lastIdentityPayload) return;
  lastIdentityPayload = payload;
  agent.identify(identity);
};

export const clearPendoSession = (): void => {
  hasSignedInVisitor = false;
  lastIdentityPayload = null;
  getPendo()?.clearSession?.();
};

// Most sign-out flows redirect with a full page load, so the next page can start with the
// previous visitor still stored by the agent. Reset it once the agent can report who it holds.
export const resetPendoVisitorIfSignedOut = (): void => {
  hasSignedInVisitor = false;
  lastIdentityPayload = null;
  whenAgentReady((): void => {
    const agent = getPendo();
    if (hasSignedInVisitor || !agent?.isAnonymousVisitor || agent.isAnonymousVisitor()) return;
    clearPendoSession();
  });
};
