// ==UserScript==
// @name         [aotified]
// @description  aoty addon
// @author       woidzero
// @namespace    https://dev.woid.world/
// @version      0
// @match        https://*.albumoftheyear.org/*
// @grant        GM_xmlhttpRequest
// @connect      dev.woid.world
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js
// ==/UserScript==

(() => {
  "use strict";

  const DEV = true;
  const CSS_KEY = "aotified:css";

  function ready(cb) {
    if (document.head) return cb(document.head);

    const obs = new MutationObserver(() => {
      if (document.head) {
        obs.disconnect();
        cb(document.head);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  let styleTag;

  // instant cache inject
  ready((head) => {
    styleTag = document.createElement("style");
    styleTag.id = "aotified-style";
    styleTag.textContent = "body{visibility:hidden}";
    head.prepend(styleTag);

    if (!DEV) {
      const cachedCSS = localStorage.getItem(CSS_KEY);

      if (cachedCSS) {
        styleTag.textContent = cachedCSS;
        console.log("[aotified.loader] CSS from cache");
      }
    }

    const script = document.createElement("script");
    script.src = DEV ? `https://dev.woid.world/aotified/dist/main.js?ts=${Date.now()}` : `https://dev.woid.world/aotified/dist/main.js`;
    script.defer = true;
    head.appendChild(script);

    fetchCSS();
  });

  function fetchCSS() {
    GM_xmlhttpRequest({
      method: "GET",
      url: DEV ? `https://dev.woid.world/aotified/dist/style.css?ts=${Date.now()}` : `https://dev.woid.world/aotified/dist/style.css`,
      onload(res) {
        const css = res.responseText;
        styleTag && (styleTag.textContent = css);

        if (!DEV) {
          localStorage.setItem(CSS_KEY, css);
          console.debug("[aotified.loader] CSS updated in local storage");
        }

        console.debug("[aotified.loader] CSS updated");
      },
      onerror(err) {
        console.error("[aotified.loader] CSS load failed", err);
      }
    });
  }

  if (DEV) setInterval(() => {
    fetchCSS();
  }, 500);
})();
