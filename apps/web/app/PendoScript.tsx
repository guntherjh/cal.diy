import Script from "next/script";

// The install snippet must stay verbatim. initialize runs here, once per page load, because the root
// layout never remounts on client-side navigation; the signed-in visitor is attached later with identify.
// The location transforms keep one-time tokens and OAuth codes that this app puts in page URLs out of
// the URLs the analytics agent records. They don't change the browser URL or what the app reads from it.
const PENDO_INSTALL_SCRIPT = `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo-security.pendo-dev.com/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('1918aa46-99a2-4935-8d4e-6b617ba46221');

pendo.initialize({
  visitor: { id: "" },
  location: {
    transforms: [
      {
        attr: "search",
        action: "ExcludeKeys",
        data: function (search, url) {
          var path = (url && url.pathname) || "";
          if (path === "/signup" || path === "/teams" || path === "/auth/verify-email-change") return ["token"];
          if (/^\\/apps\\/[^/]+\\/setup\\/?$/.test(path)) return ["code"];
          if (path === "/auth/login" && /token(=|%3D)/i.test(String(search || ""))) return ["callbackUrl"];
          return [];
        }
      },
      {
        attr: "pathname",
        action: "Replace",
        data: function (pathname) {
          return String(pathname || "").replace(/^\\/auth\\/forgot-password\\/[^/]+/, "/auth/forgot-password/redacted");
        }
      }
    ]
  }
});
`;

export function PendoScript({ nonce }: { nonce?: string }): JSX.Element {
  return (
    <Script
      id="pendo-install"
      strategy="beforeInteractive"
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The Pendo install snippet requires an inline script
      dangerouslySetInnerHTML={{
        __html: PENDO_INSTALL_SCRIPT,
      }}
    />
  );
}
