const pendoSnippet = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('ad5fd552-8a0e-4472-8558-dbd13e8a5524');
`;

// Initialized here, once per document load, so the signed-in user can later be attached with pendo.identify.
// The transforms keep one-time credentials out of the URLs Pendo records: password reset links carry the
// reset request id in the path, and invite, email-change, and OAuth authorize links carry tokens in the query.
// Transforms must never throw, because Pendo falls back to the untransformed URL when they do.
const pendoInitialize = `
pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          var path = String((url && url.pathname) || '').replace(/\\/+$/, '');
          if (path === '/signup' || path === '/teams' || path === '/auth/verify-email-change') return ['token'];
          if (path === '/auth/oauth2/authorize') return ['state'];
          return [];
        }
      },
      {
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var path = String(pathname || '');
          return /^\\/auth\\/forgot-password\\/[^/]+/.test(path) ? '/auth/forgot-password/redacted' : path;
        }
      }
    ]
  }
});
`;

export function PendoScript({ nonce }: { nonce?: string }): JSX.Element {
  return (
    <script
      id="pendo-install"
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Pendo install snippet must run inline before the app renders
      dangerouslySetInnerHTML={{ __html: `${pendoSnippet}${pendoInitialize}` }}
    />
  );
}
