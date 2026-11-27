// The Pendo install snippet must run as an inline <head> script so the agent boots once per page load,
// before any React code renders. The location transforms keep credentials that this app reads from
// rendered page URLs out of the URLs the agent records.
export const PENDO_INSTALL_SCRIPT = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('1c561141-28b1-462b-b96c-100f838a5f29');

pendo.initialize({
  visitor: { id: '' },
  location: {
    transforms: [
      {
        attr: 'search',
        action: 'ExcludeKeys',
        data: function (search, url) {
          var path = String((url && url.pathname) || '').replace(/\\/+$/, '');
          if (path === '/signup' || path === '/auth/verify-email-change') return ['token'];
          if (/^\\/apps\\/[^/]+\\/setup$/.test(path)) return ['code'];
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
