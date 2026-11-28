// Inlined into the root layout's <head> so the agent boots before any UI renders.
// The location transforms keep auth material that this app puts in page URLs out of what Pendo records:
// - /signup, /teams and /auth/verify-email-change carry an invite or email verification `token`
// - /apps/<slug>/setup receives an OAuth authorization `code` from the payment app popup flows
// - /auth/forgot-password/<id> carries the password reset request id in the path
// Both transforms are gated on the pathname because `token` and `code` are generic names on other pages.
export const PENDO_INSTALL_SCRIPT = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('78b0623d-fe69-40f8-895a-ac374fdec17f');

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
          if (/^\\/apps\\/[^/]+\\/setup$/.test(path)) return ['code'];
          return [];
        }
      },
      {
        attr: 'pathname',
        action: 'Replace',
        data: function (pathname) {
          var path = String(pathname || '');
          return /^\\/auth\\/forgot-password\\/[^/]+\\/?$/.test(path) ? '/auth/forgot-password/redacted' : path;
        }
      }
    ]
  }
});
`;
