import Script from "next/script";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeX",
  description:
    "Track real-time stock prices, get personalized details and explore detailed company insights.",
};

const removeInjectedAttrs = `(function(){
  function log(...args){ try { console.debug('[removeInjectedAttrs]', ...args); } catch(e){} }

  function removeStyleIfContains(el, needle){
    try {
      if (!el) return false;
      const s = el.getAttribute && el.getAttribute('style');
      if (s && s.indexOf(needle) !== -1) {
        el.removeAttribute('style');
        log('removed style containing', needle, 'from', el.tagName);
        return true;
      }
    } catch(e){}
    return false;
  }

  function removePrefixedAttrs(el, prefixes){
    if (!el || !el.attributes) return;
    Array.from(el.attributes).forEach(attr => {
      const name = String(attr.name || '');
      for (const p of prefixes) {
        if (name.indexOf(p) === 0) {
          try {
            el.removeAttribute(name);
            log('removed attribute', name, 'from', el.tagName);
          } catch(e){}
        }
      }
    });
  }

  function removeVscCssVars(el){
    try {
      if (!el || !el.style) return;
      // style is CSSStyleDeclaration; iterate its properties
      Array.from(el.style).forEach(key => {
        if (typeof key === 'string' && (key.indexOf('--vsc-') === 0 || key.indexOf('--vscode-') === 0)) {
          try {
            el.style.removeProperty(key);
            log('removed css var', key, 'from', el.tagName);
          } catch(e){}
        }
      });
    } catch(e){}
  }

  function sweepOnce(){
    try {
      const html = document && document.documentElement;
      const body = document && document.body;
      if (!html || !body) return;

      // known prefixes to remove (add more if you see new ones)
      const prefixes = ['data-gr-', 'data-new-gr-', 'data-vscode-', 'data-vsc-', 'data-extension-', 'data-grammarly', 'data-moz', 'data-chrome'];

      // remove attributes starting with these prefixes from html and body
      removePrefixedAttrs(html, prefixes);
      removePrefixedAttrs(body, prefixes);

      // also remove some exact attributes if present
      ['data-gr-ext-installed', 'data-new-gr-c-s-check-loaded', 'data-vscode-preview'].forEach(a=>{
        try { if (html.hasAttribute && html.hasAttribute(a)) { html.removeAttribute(a); log('removed', a, 'from html'); } } catch(e){}
        try { if (body.hasAttribute && body.hasAttribute(a)) { body.removeAttribute(a); log('removed', a, 'from body'); } } catch(e){}
      });

      // remove style attr if it contains vsc domain or vsc var
      removeStyleIfContains(html, '--vsc-domain');
      removeStyleIfContains(body, '--vsc-domain');
      removeStyleIfContains(html, '--vscode-');
      removeStyleIfContains(body, '--vscode-');

      // remove CSS custom properties on html that start with --vsc- or --vscode-
      removeVscCssVars(html);
      removeVscCssVars(body);
    } catch(e){}
  }

  // run immediately
  try { sweepOnce(); } catch(e) {}

  // watch for mutations to catch later-injected attributes
  try {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        try {
          // if attributes changed on html or body or children, sweep to clean
          if (m.type === 'attributes' || m.addedNodes?.length) {
            sweepOnce();
          }
        } catch(e){}
      });
    });
    if (document && document.documentElement) {
      observer.observe(document.documentElement, { attributes: true, subtree: true, childList: true, attributeFilter: ['style'] });
      observer.observe(document.body, { attributes: true, subtree: true, childList: true, attributeFilter: ['style'] });
      log('observer attached');
    }
    // safety stop after 7s
    setTimeout(()=>{ try { observer.disconnect(); log('observer disconnected after timeout'); } catch(e){} }, 7000);
  } catch(e){}

  // extra fallback interval for a few seconds
  let tries = 0;
  const id = setInterval(()=>{ tries++; try { sweepOnce(); } catch(e){} if (tries > 8) clearInterval(id); }, 500);

})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="remove-injected-attrs-robust" strategy="beforeInteractive">
          {removeInjectedAttrs}
        </Script>

        {children}
      </body>
    </html>
  );
}
