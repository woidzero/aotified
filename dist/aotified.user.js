// ==UserScript==
// @name         [aotified]
// @description  aoty addon
// @namespace    https://dev.woid.world/
// @version      1.0.0
// @match        https://*.albumoftheyear.org/*
// @grant        GM_xmlhttpRequest
// @connect      dev.woid.world
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js
// ==/UserScript==

(() => {
    const DEV = false;
  
    const url = DEV
      ? `https://dev.woid.world/aotified/dist/bundle.js?ts=${Date.now()}`
      : `https://dev.woid.world/aotified/dist/bundle.js`;
  
    const script = document.createElement("script");
    script.src = url;
    script.defer = true;
  
    document.documentElement.appendChild(script);
  })();
  