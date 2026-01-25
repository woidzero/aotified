// ==UserScript==
// @name         [aotified]
// @description  aoty addon
// @namespace    https://dev.woid.world/
// @version      1.0.5
// @match        https://*.albumoftheyear.org/*
// @grant        GM_xmlhttpRequest
// @connect      dev.woid.world
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js
// ==/UserScript==

(() => {
  const DEV = true;

  const styleTag = document.createElement('style');
  styleTag.id = 'aotified-style';
  document.head.prepend(styleTag);

  function loadCSS() {
    const CSS_URL = DEV
      ? `https://dev.woid.world/aotified/dist/style.css?ts=${Date.now()}`
      : `https://dev.woid.world/aotified/dist/style.css`;

    GM_xmlhttpRequest({
      method: 'GET',
      url: CSS_URL,
      onload(res) {
        styleTag.textContent = res.responseText;
        console.log('[aotified] CSS loaded');
      },
      onerror(err) {
        console.error('[aotified] CSS load failed', err);
      }
    });
  }

  loadCSS();

  const JS_URL = DEV
    ? `https://dev.woid.world/aotified/dist/bundle.js?ts=${Date.now()}`
    : `https://dev.woid.world/aotified/dist/bundle.js`;

  const script = document.createElement('script');
  script.src = JS_URL;
  script.defer = true;
  document.documentElement.appendChild(script);

  if (DEV) {
    setInterval(loadCSS, 500);
  }
})();
