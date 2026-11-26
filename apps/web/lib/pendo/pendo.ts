// These pages receive one-time credentials (invite, email-change, and app OAuth codes) in the query string.
// The paths are matched explicitly because "token" and "code" are generic names that other pages may use.
const TOKEN_QUERY_PATHS: string[] = ["/signup", "/teams", "/auth/verify-email-change"];
const APP_SETUP_PATH: RegExp = /^\/apps\/[^/]+\/setup$/;
// The password reset request ID in this path is enough to set a new password, so it must not be recorded.
const PASSWORD_RESET_PATH: RegExp = /^\/auth\/forgot-password\/[^/]+$/;

const normalizePathname = (pathname: unknown): string => String(pathname || "").replace(/\/+$/, "");

// Transforms run on every recorded URL and a throwing transform makes the agent fall back to the raw URL,
// so each callback guards its inputs instead of assuming a shape.
const pendoLocationTransforms: PendoLocationTransform[] = [
  {
    attr: "search",
    action: "ExcludeKeys",
    data: (_search: string, url: URL): string[] => {
      const pathname = normalizePathname(url?.pathname);
      if (TOKEN_QUERY_PATHS.includes(pathname)) return ["token"];
      if (APP_SETUP_PATH.test(pathname)) return ["code"];
      return [];
    },
  },
  {
    attr: "pathname",
    action: "Replace",
    data: (pathname: string): string => {
      if (!PASSWORD_RESET_PATH.test(normalizePathname(pathname))) return pathname;
      return "/auth/forgot-password/redacted";
    },
  },
];

export const PENDO_INSTALL_SNIPPET: string = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('bc8934f1-3a9f-4f13-a98b-5f1c512a9468');
`;

export function initializePendo(): void {
  if (typeof window === "undefined" || typeof pendo === "undefined") return;
  pendo.initialize({
    visitor: { id: "" },
    location: { transforms: pendoLocationTransforms },
  });
}

export function clearPendoSession(): void {
  if (typeof pendo === "undefined") return;
  pendo.clearSession?.();
}
