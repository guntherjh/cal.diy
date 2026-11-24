type PendoMetadataValue = string | number | boolean | null;

type PendoIdentifyOptions = {
  visitor: { id: string | number } & Record<string, PendoMetadataValue>;
};

type PendoAgent = {
  identify: (options: PendoIdentifyOptions) => void;
  clearSession?: () => void;
  getVisitorId?: () => string | number | undefined;
  isAnonymousVisitor?: (visitorId?: string | number) => boolean;
};

declare global {
  interface Window {
    pendo?: PendoAgent;
  }
}

/**
 * The install snippet plus the single app-entry `pendo.initialize` call. It runs as an inline head
 * script so the SDK boots exactly once per page load, before React hydrates.
 *
 * The `location` transforms keep credentials that this app places in URLs out of the URLs the SDK
 * records: password reset request ids (/auth/forgot-password/:id), signup invite and email change
 * tokens, OAuth `code` params on app setup callbacks, and login `callbackUrl`s that carry a token.
 * Transforms run on every recorded URL, so each one is gated on its path and must never throw.
 */
export const PENDO_INSTALL_SCRIPT = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('ec836238-3de9-4d54-99d9-ce48c050b91c');

pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var path = String(pathname || '');
          return /^\\/auth\\/forgot-password\\/[^/]+/.test(path) ? '/auth/forgot-password/redacted' : path;
        }
      },
      {
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          try {
            var path = String((url && url.pathname) || '');
            if (path === '/signup' || path === '/auth/verify-email-change') return ['token'];
            if (/^\\/apps\\/[^/]+\\/setup$/.test(path)) return ['code'];
            if (path === '/auth/login') {
              var callbackUrl = new URLSearchParams(String(search || '')).get('callbackUrl') || '';
              return callbackUrl.indexOf('token=') !== -1 ? ['callbackUrl'] : [];
            }
          } catch (e) {}
          return [];
        }
      }
    ]
  }
});
`;

/**
 * Resets the SDK to a new anonymous visitor so the next person on this browser isn't tracked as the
 * previous signed-in user. Returns false while the agent script is still loading, because
 * `clearSession` isn't part of the install snippet's stub.
 */
export function clearPendoSession(): boolean {
  const pendo = typeof window !== "undefined" ? window.pendo : undefined;
  if (!pendo?.clearSession || !pendo.getVisitorId || !pendo.isAnonymousVisitor) return false;

  // Clearing an anonymous visitor would only rotate its id and split that visitor's history
  if (!pendo.isAnonymousVisitor(pendo.getVisitorId())) {
    pendo.clearSession();
  }
  return true;
}
