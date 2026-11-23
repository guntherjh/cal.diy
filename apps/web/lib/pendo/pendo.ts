type PendoMetadataValue = string | number | boolean | null | undefined;

type PendoMetadata = Record<string, PendoMetadataValue>;

type PendoIdentifyOptions = {
  visitor: PendoMetadata & { id: string | number };
  account?: PendoMetadata & { id: string | number };
};

type PendoAgent = {
  initialize: (options: Record<string, unknown>) => void;
  identify: (options: PendoIdentifyOptions) => void;
  // Not part of the install snippet's stubs, so it stays undefined until the agent script has loaded.
  clearSession?: () => void;
};

declare global {
  var pendo: PendoAgent | undefined;
}

// The search transform drops one-time tokens (signup invites, email-change verification) and the pathname
// transform hides the password reset request id, so these credentials never reach recorded URLs.
export const PENDO_SNIPPET: string = String.raw`
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('4e22dfc3-a69d-4676-a66d-7c1221eea12e');

pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          var path = String((url && url.pathname) || '').replace(/\/+$/, '');
          return ['/signup', '/teams', '/auth/verify-email-change'].indexOf(path) !== -1 ? ['token'] : [];
        }
      },
      {
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var path = String(pathname || '');
          var prefix = '/auth/forgot-password/';
          if (path.indexOf(prefix) !== 0 || path.length === prefix.length) return path;
          return prefix + 'redacted';
        }
      }
    ]
  }
});
`;

export const clearPendoSession = (): void => {
  window.pendo?.clearSession?.();
};

export type { PendoIdentifyOptions };
