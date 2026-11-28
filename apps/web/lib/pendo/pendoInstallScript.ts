// Kept verbatim from the Pendo install snippet so it stays easy to compare with the Novus setup instructions.
const PENDO_SNIPPET: string = `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('3f33c2c1-d968-47fd-bc0d-0a47650738cc');`;

// Initialize runs in the document head so it happens exactly once per page load. The signed-in
// visitor is attached later with pendo.identify from PendoSessionTracker.
// The location transforms keep one-time credentials out of recorded URLs: invite and email-change
// tokens, OAuth codes on app setup pages, and password reset ids in the pathname. They are gated on
// the pathname so ordinary "token" or "code" parameters elsewhere are still recorded.
const PENDO_INITIALIZE: string = `window.pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          var pathname = String((url && url.pathname) || '');
          if (pathname === '/signup' || pathname === '/teams' || pathname === '/auth/verify-email-change') {
            return ['token'];
          }
          var parts = pathname.split('/');
          if (parts.length === 4 && parts[1] === 'apps' && parts[3] === 'setup') {
            return ['code'];
          }
          return [];
        }
      },
      {
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var value = String(pathname || '');
          var resetPrefix = '/auth/forgot-password/';
          if (value.indexOf(resetPrefix) === 0 && value.length > resetPrefix.length) {
            return resetPrefix + 'redacted';
          }
          return value;
        }
      }
    ]
  }
});`;

export const PENDO_INSTALL_SCRIPT: string = `${PENDO_SNIPPET}\n${PENDO_INITIALIZE}`;
