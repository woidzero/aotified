"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/core/plugins.ts
  var $2 = window.$ || window.JQuery;
  if (!$2) {
    throw new Error("[aotified] jQuery not found on window");
  }
  $2.fn.wrapChildren = function(childSelector, wrapper) {
    return this.each(function() {
      $2(this).children(childSelector).wrapAll(wrapper);
    });
  };
  $2.fn.wrapSmart = function(wrapper) {
    return this.each(function() {
      const $w = typeof wrapper === "function" ? wrapper() : wrapper.clone();
      $2(this).before($w);
      $w.append(this);
    });
  };
  $2.fn.unpack = function() {
    return this.each(function() {
      const $this = $2(this);
      $this.replaceWith($this.contents());
    });
  };
  $2.fn.changeTag = function(tag) {
    tag = tag.replace(/[<>]/g, "");
    return this.map(function() {
      const oldEl = this;
      const $old = $2(oldEl);
      const newEl = document.createElement(tag);
      for (const attr of Array.from(oldEl.attributes)) {
        newEl.setAttribute(attr.name, attr.value);
      }
      $2(newEl).append($old.contents());
      oldEl.replaceWith(newEl);
      return newEl;
    });
  };
  $2.fn.replaceClass = function(from, to) {
    const fromList = from ? Array.isArray(from) ? from : [from] : [];
    const toList = to ? Array.isArray(to) ? to : [to] : [];
    return this.each(function() {
      const $el = $2(this);
      if (fromList.length) {
        $el.removeClass(fromList.join(" "));
      }
      if (from === "*") {
        $el.removeAttr("class");
      }
      if (toList.length) {
        $el.addClass(toList.join(" "));
      }
    });
  };

  // src/core/logger.ts
  var Logger = class {
    constructor(scope, clear = false, style) {
      __publicField(this, "scope");
      __publicField(this, "clear");
      __publicField(this, "style");
      this.scope = scope;
      this.clear = clear;
      this.style = style;
      if (this.clear) console.clear();
    }
    formatArgs(args, color) {
      return [
        `%c[${this.scope}]:`,
        `color: ${color}; font-weight: bold;`,
        ...args
      ];
    }
    log(...args) {
      console.log(...this.formatArgs(args, "white"));
    }
    info(...args) {
      console.info(...this.formatArgs(args, "#2196F3"));
    }
    debug(...args) {
      console.debug(...this.formatArgs(args, "gray"));
    }
    warn(...args) {
      console.warn(...this.formatArgs(args, "orange"));
    }
    error(...args) {
      console.error(...this.formatArgs(args, "red"));
    }
  };

  // src/core/settings.ts
  var Settings = class {
    constructor(modules) {
      __publicField(this, "schema", {});
      __publicField(this, "key", "__userscript_settings__");
      __publicField(this, "cache");
      this.cache = this.load();
      for (const mod of modules) {
        if (!this.cache[mod.name]) {
          this.cache[mod.name] = {};
        }
        const moduleCache = this.cache[mod.name];
        for (const feature of mod.features) {
          if (!(feature.name in moduleCache)) {
            moduleCache[feature.name] = feature.default ?? false;
          }
        }
      }
      this.save();
    }
    load() {
      try {
        return JSON.parse(localStorage.getItem(this.key) || "{}");
      } catch {
        return {};
      }
    }
    save() {
      localStorage.setItem(this.key, JSON.stringify(this.cache));
    }
    isEnabled(module, feature) {
      return !!this.cache[module]?.[feature];
    }
    setEnabled(module, feature, value) {
      var _a;
      (_a = this.cache)[module] ?? (_a[module] = {});
      this.cache[module][feature] = value;
      this.save();
    }
    toggle(module, feature) {
      this.setEnabled(module, feature, !this.isEnabled(module, feature));
    }
    getModule(module) {
      return this.cache[module] ?? {};
    }
  };

  // src/core/composer.ts
  var Feature = class {
    constructor(options) {
      __publicField(this, "name");
      __publicField(this, "description");
      __publicField(this, "default", false);
      __publicField(this, "hidden", false);
      __publicField(this, "requires");
      __publicField(this, "cleanup");
      __publicField(this, "run");
      __publicField(this, "toggle");
      __publicField(this, "module");
      if (options) Object.assign(this, options);
      const proto = Object.getPrototypeOf(this);
      for (const key of Object.getOwnPropertyNames(proto)) {
        const val = this[key];
        if (typeof val === "function" && key !== "constructor") {
          this[key] = val.bind(this);
        }
      }
    }
    shouldRun() {
      if (this.toggle) return this.toggle();
      return this.default;
    }
  };
  var Module = class {
    constructor(options, sharedInit) {
      __publicField(this, "name");
      __publicField(this, "description");
      __publicField(this, "features", []);
      __publicField(this, "shared", {});
      __publicField(this, "settings");
      this.name = options.name;
      this.description = options.description;
      if (sharedInit) sharedInit(this.shared);
    }
    loadFeatures(features) {
      this.features.push(...features);
      for (const feature of features) {
        feature.module = this;
        feature.shared = this.shared;
      }
    }
  };
  var Composer = class {
    constructor(modules) {
      __publicField(this, "modules");
      __publicField(this, "settings");
      this.modules = modules;
      this.settings = new Settings(modules);
      for (const module of this.modules) {
        module.settings = this.settings;
      }
    }
    start() {
      for (const module of this.modules) {
        this.startModule(module);
      }
    }
    startModule(module) {
      const logger = new Logger(`Module:${module.name}`);
      for (const feature of module.features) {
        if (!feature.shouldRun?.()) {
          logger.log(`feature "${feature.name}" skipped by toggle/default`);
          continue;
        }
        try {
          const ctx = {
            module,
            feature,
            settings: this.settings,
            logger: new Logger(`${module.name}/${feature.name}`)
          };
          const cleanup = feature.run(ctx);
          if (typeof cleanup === "function") feature.cleanup = cleanup;
        } catch (err) {
          logger.error(`Failed to start feature "${feature.name}"`, err);
        }
      }
    }
    disableFeature(moduleName, featureName) {
      const module = this.modules.find((m3) => m3.name === moduleName);
      const feature = module?.features.find((f4) => f4.name === featureName);
      if (!feature) return;
      feature.cleanup?.();
      feature.cleanup = void 0;
      this.settings.setEnabled(moduleName, featureName, false);
    }
    enableFeature(moduleName, featureName) {
      this.settings.setEnabled(moduleName, featureName, true);
      this.start();
    }
  };

  // src/core/observer.ts
  function Observer(selector, callback, {
    root = document,
    idle = false,
    intersection = false,
    intersectionOptions
  } = {}) {
    const getRootEl = () => root?.[0] ?? root;
    const run = (el) => {
      const $el = $(el);
      const exec = () => callback.call($el);
      if (idle && "requestIdleCallback" in window) {
        requestIdleCallback(exec);
      } else {
        exec();
      }
    };
    const io = intersection && "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      for (const e2 of entries) {
        if (!e2.isIntersecting) continue;
        run(e2.target);
        io.unobserve(e2.target);
      }
    }, intersectionOptions) : null;
    const handle = (el) => {
      if (io) {
        io.observe(el);
      } else {
        run(el);
      }
    };
    $(getRootEl()).find(selector).each((_3, el) => handle(el));
    const observer = new MutationObserver((mutations) => {
      for (const m3 of mutations) {
        for (let i3 = 0; i3 < m3.addedNodes.length; i3++) {
          const node = m3.addedNodes[i3];
          if (!(node instanceof Element)) continue;
          if (node.matches(selector)) handle(node);
          node.querySelectorAll?.(selector).forEach((el) => handle(el));
          if (node.parentElement?.matches(selector)) {
            handle(node.parentElement);
          }
        }
      }
    });
    observer.observe(getRootEl(), {
      childList: true,
      subtree: true
    });
    const stop = () => {
      observer.disconnect();
      io?.disconnect();
    };
    return stop;
  }

  // src/modules/global.ts
  var Global = () => {
    const module = new Module({
      name: "Globals",
      description: "Global website features such as seasonal elements."
    });
    module.loadFeatures([
      new Feature({
        name: "Aotified",
        description: "root",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer("body > span, body", function() {
            const $root = $(this);
            if ($root.prop("tagName") === "SPAN") $root.unpack();
          });
          Observer("body", function() {
            const $root = $(this);
            $root.children("#header").changeTag("header");
            $root.children("#nav").changeTag("nav");
            const $top = $root.children("header, nav");
            if ($top.parent(".pageTop").length === 0 && $top.length) {
              $top.wrapAll("<div class='pageTop'></div>");
            }
          });
          Observer(".ratingText", function() {
            $(this).text(function(_3, text) {
              return text.replace(" score", "");
            });
          });
          Observer(".overlay", function() {
            $(this).prependTo("body");
          });
          Observer(".overlay > .content", function() {
            const $content = $(this);
            let $header = $content.children("header");
            if (!$header.length) {
              $header = $("<header></header>");
              $content.prepend($header);
            }
            const $headerElements = $content.find(".close, .subHeadline, .heading");
            $headerElements.each(function() {
              $(this).appendTo($header);
            });
            const $section = $content.children("section");
            if (!$section.length) {
              $content.children().not("header").wrapAll("<section></section>");
              $content.find(".center").unpack();
            }
            $content.removeAttr("style");
            $content.find("br, .clear").remove();
            ctx.logger.info($content);
          }, { once: false });
          Observer(".ratingRowContainer", function() {
            const $root = $(this);
            if ($root.find(".icon").length) {
              $root.addClass("user");
              const $ratingRow = $(this).find(".ratingRow");
              $ratingRow.find("span:has(> .deleteRatingBlock)").remove();
              const $message = $root.children("div[id^='message']");
              if ($message) {
                $message.unpack();
                $root.find("div[id^='deleteRating']").unpack();
                $root.find("div[id^='insertRating']").remove();
              }
              const $ratingIcons = $("<div class='ratingIcons'>");
              $ratingRow.find("a:has(.icon)").appendTo($ratingIcons);
              $root.append($ratingIcons);
            }
          });
        }
      }),
      new Feature({
        name: "Wrap Ratings",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(
            ".artistCriticScoreBox, .artistUserScoreBox, .albumCriticScoreBox, .albumUserScoreBox",
            function() {
              const $root = $(this);
              let $ratingItem = $root.children(".ratingItem");
              const $score = $root.children(".artistCriticScore").first().length ? $root.children(".artistCriticScore") : $root.children(".artistUserScore");
              const $ratingBar = $root.children(".ratingBar");
              const $text = $root.children(".text");
              if (!$score.length || !$ratingBar.length || !$text.length) return;
              if (!$ratingItem.length) {
                $ratingItem = $("<div>", { class: "ratingItem" });
                $score.before($ratingItem);
                $ratingItem.append($score, $ratingBar);
              }
              if (!$ratingItem.closest(".ratingValue").length) {
                const $ratingValue = $("<div>", { class: "ratingValue" });
                $ratingItem.before($ratingValue);
                $ratingValue.append($ratingItem, $text);
              }
            }
          );
        }
      }),
      new Feature({
        name: "Colorize Ratings",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(".ratingBlock, .ratingItem", function() {
            const $el = $(this);
            const $bar = $el.find(".ratingBar");
            if (!$bar.length) return;
            $el.removeClass("green yellow red");
            if ($bar.hasClass("green")) $el.addClass("green");
            else if ($bar.hasClass("yellow")) $el.addClass("yellow");
            else if ($bar.hasClass("red")) $el.addClass("red");
          });
        }
      }),
      new Feature({
        name: "Show Logo",
        description: "Show [aotified] logo near AOTY logo.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          $(`body`).addClass("aotified");
          $(".logoHead").append(
            $("<div>", {
              id: "GOT_AOTIFIED",
              text: "[aotified]",
              css: {
                color: "gray",
                marginLeft: "5px"
              }
            })
          );
        }
      }),
      new Feature({
        name: "Global Font",
        description: "Global font styles.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          $("<link>", {
            id: "aotified-inter-font",
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          }).appendTo("head");
          $("<style>", {
            id: "aotified-inter-style",
            text: `
            code, pre, kbd, samp {
              font-family: ui-monospace, SFMono-Regular, monospace !important;
            }
    
            *:not(i[class^="fa"], i[class*=" fa"]) {
              font-family: "Inter", system-ui, -apple-system, sans-serif !important;
            }
          `
          }).appendTo("head");
        }
      }),
      new Feature({
        name: "Seasonal",
        description: "Enable seasonal appearance such as snow.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          const $canvas = $("<canvas>", { id: "aotified-snow" }).css({
            position: "fixed",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 9999
          });
          $("body").append($canvas);
          const canvas = $canvas[0];
          const cnv_ctx = canvas.getContext("2d");
          function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
          }
          resize();
          $(window).on("resize", resize);
          const flakes = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            d: Math.random() * 0.6 + 0.2
          }));
          function update() {
            for (const f4 of flakes) {
              f4.y += f4.d;
              if (f4.y > canvas.height) {
                f4.y = -10;
                f4.x = Math.random() * canvas.width;
              }
            }
          }
          function draw() {
            if (!cnv_ctx) return ctx.logger.error("can't get canvas context.");
            cnv_ctx.clearRect(0, 0, canvas.width, canvas.height);
            cnv_ctx.fillStyle = "rgba(255,255,255,0.8)";
            cnv_ctx.beginPath();
            for (const f4 of flakes) {
              cnv_ctx.moveTo(f4.x, f4.y);
              cnv_ctx.arc(f4.x, f4.y, f4.r, 0, Math.PI * 2);
            }
            cnv_ctx.fill();
            update();
            requestAnimationFrame(draw);
          }
          draw();
        }
      }),
      new Feature({
        name: "Dropdown Rework",
        description: "Global dropdown rework.",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          const PORTAL_CLASS = "dropdownItems";
          function ensurePortal() {
            let $portal = $("body > ." + PORTAL_CLASS);
            if (!$portal.length) {
              $portal = $("<div>", { class: PORTAL_CLASS }).appendTo("body");
            }
            return $portal;
          }
          function uid() {
            return "dropdown-" + Math.random().toString(36).slice(2, 9);
          }
          return Observer(".menuDropSelected", function() {
            const $dropdown = $(this);
            if ($dropdown.data("portalized")) return;
            $dropdown.data("portalized", true);
            const id = uid();
            const $portal = ensurePortal();
            const $button = $dropdown.children(".menuDropSelectedText");
            const $menu = $dropdown.children("ul");
            if (!$menu.length || !$button.length) return;
            $dropdown.attr("data-dropdown-id", id);
            $menu.attr("data-owner", id).addClass("portal dropdownContent");
            $menu.hide();
            $menu.appendTo($portal);
            function positionMenu() {
              const rect = $button?.[0]?.getBoundingClientRect();
              $menu.css({
                position: "fixed",
                top: rect?.bottom + "px",
                left: rect?.left + "px",
                minWidth: rect?.width + "px",
                zIndex: 9999,
                display: "block"
              });
            }
            function closeMenu() {
              $menu.hide();
              $(document).off("click." + id);
            }
            $button.on("click", function(e2) {
              e2.stopPropagation();
              if ($menu.is(":visible")) {
                closeMenu();
                return;
              }
              $(".menuDrop.portal").hide();
              positionMenu();
              setTimeout(() => {
                $(document).on("click." + id, closeMenu);
              });
            });
            $menu.on("click", "li", function(e2) {
              e2.stopPropagation();
              closeMenu();
            });
            $(window).on("resize", () => {
              if ($menu.is(":visible")) positionMenu();
            });
          });
        }
      })
    ]);
    return module;
  };

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var o;
  var r;
  var e;
  var f;
  var c;
  var s;
  var a;
  var h;
  var p = {};
  var v = [];
  var y = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var d = Array.isArray;
  function w(n2, l3) {
    for (var u4 in l3) n2[u4] = l3[u4];
    return n2;
  }
  function g(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function _(l3, u4, t2) {
    var i3, o3, r3, e2 = {};
    for (r3 in u4) "key" == r3 ? i3 = u4[r3] : "ref" == r3 ? o3 = u4[r3] : e2[r3] = u4[r3];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l3 && null != l3.defaultProps) for (r3 in l3.defaultProps) void 0 === e2[r3] && (e2[r3] = l3.defaultProps[r3]);
    return m(l3, e2, i3, o3, null);
  }
  function m(n2, t2, i3, o3, r3) {
    var e2 = { type: n2, props: t2, key: i3, ref: o3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == r3 ? ++u : r3, __i: -1, __u: 0 };
    return null == r3 && null != l.vnode && l.vnode(e2), e2;
  }
  function k(n2) {
    return n2.children;
  }
  function x(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function S(n2, l3) {
    if (null == l3) return n2.__ ? S(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
    return "function" == typeof n2.type ? S(n2) : null;
  }
  function C(n2) {
    var l3, u4;
    if (null != (n2 = n2.__) && null != n2.__c) {
      for (n2.__e = n2.__c.base = null, l3 = 0; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) {
        n2.__e = n2.__c.base = u4.__e;
        break;
      }
      return C(n2);
    }
  }
  function M(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !$3.__r++ || o != l.debounceRendering) && ((o = l.debounceRendering) || r)($3);
  }
  function $3() {
    for (var n2, u4, t2, o3, r3, f4, c3, s3 = 1; i.length; ) i.length > s3 && i.sort(e), n2 = i.shift(), s3 = i.length, n2.__d && (t2 = void 0, o3 = void 0, r3 = (o3 = (u4 = n2).__v).__e, f4 = [], c3 = [], u4.__P && ((t2 = w({}, o3)).__v = o3.__v + 1, l.vnode && l.vnode(t2), O(u4.__P, t2, o3, u4.__n, u4.__P.namespaceURI, 32 & o3.__u ? [r3] : null, f4, null == r3 ? S(o3) : r3, !!(32 & o3.__u), c3), t2.__v = o3.__v, t2.__.__k[t2.__i] = t2, N(f4, t2, c3), o3.__e = o3.__ = null, t2.__e != r3 && C(t2)));
    $3.__r = 0;
  }
  function I(n2, l3, u4, t2, i3, o3, r3, e2, f4, c3, s3) {
    var a3, h4, y3, d3, w3, g3, _3, m3 = t2 && t2.__k || v, b2 = l3.length;
    for (f4 = P(u4, l3, m3, f4, b2), a3 = 0; a3 < b2; a3++) null != (y3 = u4.__k[a3]) && (h4 = -1 == y3.__i ? p : m3[y3.__i] || p, y3.__i = a3, g3 = O(n2, y3, h4, i3, o3, r3, e2, f4, c3, s3), d3 = y3.__e, y3.ref && h4.ref != y3.ref && (h4.ref && B(h4.ref, null, y3), s3.push(y3.ref, y3.__c || d3, y3)), null == w3 && null != d3 && (w3 = d3), (_3 = !!(4 & y3.__u)) || h4.__k === y3.__k ? f4 = A(y3, f4, n2, _3) : "function" == typeof y3.type && void 0 !== g3 ? f4 = g3 : d3 && (f4 = d3.nextSibling), y3.__u &= -7);
    return u4.__e = w3, f4;
  }
  function P(n2, l3, u4, t2, i3) {
    var o3, r3, e2, f4, c3, s3 = u4.length, a3 = s3, h4 = 0;
    for (n2.__k = new Array(i3), o3 = 0; o3 < i3; o3++) null != (r3 = l3[o3]) && "boolean" != typeof r3 && "function" != typeof r3 ? ("string" == typeof r3 || "number" == typeof r3 || "bigint" == typeof r3 || r3.constructor == String ? r3 = n2.__k[o3] = m(null, r3, null, null, null) : d(r3) ? r3 = n2.__k[o3] = m(k, { children: r3 }, null, null, null) : void 0 === r3.constructor && r3.__b > 0 ? r3 = n2.__k[o3] = m(r3.type, r3.props, r3.key, r3.ref ? r3.ref : null, r3.__v) : n2.__k[o3] = r3, f4 = o3 + h4, r3.__ = n2, r3.__b = n2.__b + 1, e2 = null, -1 != (c3 = r3.__i = L(r3, u4, f4, a3)) && (a3--, (e2 = u4[c3]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c3 && (i3 > s3 ? h4-- : i3 < s3 && h4++), "function" != typeof r3.type && (r3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h4-- : c3 == f4 + 1 ? h4++ : (c3 > f4 ? h4-- : h4++, r3.__u |= 4))) : n2.__k[o3] = null;
    if (a3) for (o3 = 0; o3 < s3; o3++) null != (e2 = u4[o3]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = S(e2)), D(e2, e2));
    return t2;
  }
  function A(n2, l3, u4, t2) {
    var i3, o3;
    if ("function" == typeof n2.type) {
      for (i3 = n2.__k, o3 = 0; i3 && o3 < i3.length; o3++) i3[o3] && (i3[o3].__ = n2, l3 = A(i3[o3], l3, u4, t2));
      return l3;
    }
    n2.__e != l3 && (t2 && (l3 && n2.type && !l3.parentNode && (l3 = S(n2)), u4.insertBefore(n2.__e, l3 || null)), l3 = n2.__e);
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function L(n2, l3, u4, t2) {
    var i3, o3, r3, e2 = n2.key, f4 = n2.type, c3 = l3[u4], s3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e2 || s3 && e2 == c3.key && f4 == c3.type) return u4;
    if (t2 > (s3 ? 1 : 0)) {
      for (i3 = u4 - 1, o3 = u4 + 1; i3 >= 0 || o3 < l3.length; ) if (null != (c3 = l3[r3 = i3 >= 0 ? i3-- : o3++]) && 0 == (2 & c3.__u) && e2 == c3.key && f4 == c3.type) return r3;
    }
    return -1;
  }
  function T(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || y.test(l3) ? u4 : u4 + "px";
  }
  function j(n2, l3, u4, t2, i3) {
    var o3, r3;
    n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l3 in t2) u4 && l3 in u4 || T(n2.style, l3, "");
      if (u4) for (l3 in u4) t2 && u4[l3] == t2[l3] || T(n2.style, l3, u4[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) o3 = l3 != (l3 = l3.replace(f, "$1")), r3 = l3.toLowerCase(), l3 = r3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? r3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + o3] = u4, u4 ? t2 ? u4.u = t2.u : (u4.u = c, n2.addEventListener(l3, o3 ? a : s, o3)) : n2.removeEventListener(l3, o3 ? a : s, o3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u4 ? "" : u4;
        break n;
      } catch (n3) {
      }
      "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
    }
  }
  function F(n2) {
    return function(u4) {
      if (this.l) {
        var t2 = this.l[u4.type + n2];
        if (null == u4.t) u4.t = c++;
        else if (u4.t < t2.u) return;
        return t2(l.event ? l.event(u4) : u4);
      }
    };
  }
  function O(n2, u4, t2, i3, o3, r3, e2, f4, c3, s3) {
    var a3, h4, p3, v3, y3, _3, m3, b2, S2, C3, M3, $5, P3, A3, H2, L2, T2, j2 = u4.type;
    if (void 0 !== u4.constructor) return null;
    128 & t2.__u && (c3 = !!(32 & t2.__u), r3 = [f4 = u4.__e = t2.__e]), (a3 = l.__b) && a3(u4);
    n: if ("function" == typeof j2) try {
      if (b2 = u4.props, S2 = "prototype" in j2 && j2.prototype.render, C3 = (a3 = j2.contextType) && i3[a3.__c], M3 = a3 ? C3 ? C3.props.value : a3.__ : i3, t2.__c ? m3 = (h4 = u4.__c = t2.__c).__ = h4.__E : (S2 ? u4.__c = h4 = new j2(b2, M3) : (u4.__c = h4 = new x(b2, M3), h4.constructor = j2, h4.render = E), C3 && C3.sub(h4), h4.state || (h4.state = {}), h4.__n = i3, p3 = h4.__d = true, h4.__h = [], h4._sb = []), S2 && null == h4.__s && (h4.__s = h4.state), S2 && null != j2.getDerivedStateFromProps && (h4.__s == h4.state && (h4.__s = w({}, h4.__s)), w(h4.__s, j2.getDerivedStateFromProps(b2, h4.__s))), v3 = h4.props, y3 = h4.state, h4.__v = u4, p3) S2 && null == j2.getDerivedStateFromProps && null != h4.componentWillMount && h4.componentWillMount(), S2 && null != h4.componentDidMount && h4.__h.push(h4.componentDidMount);
      else {
        if (S2 && null == j2.getDerivedStateFromProps && b2 !== v3 && null != h4.componentWillReceiveProps && h4.componentWillReceiveProps(b2, M3), u4.__v == t2.__v || !h4.__e && null != h4.shouldComponentUpdate && false === h4.shouldComponentUpdate(b2, h4.__s, M3)) {
          for (u4.__v != t2.__v && (h4.props = b2, h4.state = h4.__s, h4.__d = false), u4.__e = t2.__e, u4.__k = t2.__k, u4.__k.some(function(n3) {
            n3 && (n3.__ = u4);
          }), $5 = 0; $5 < h4._sb.length; $5++) h4.__h.push(h4._sb[$5]);
          h4._sb = [], h4.__h.length && e2.push(h4);
          break n;
        }
        null != h4.componentWillUpdate && h4.componentWillUpdate(b2, h4.__s, M3), S2 && null != h4.componentDidUpdate && h4.__h.push(function() {
          h4.componentDidUpdate(v3, y3, _3);
        });
      }
      if (h4.context = M3, h4.props = b2, h4.__P = n2, h4.__e = false, P3 = l.__r, A3 = 0, S2) {
        for (h4.state = h4.__s, h4.__d = false, P3 && P3(u4), a3 = h4.render(h4.props, h4.state, h4.context), H2 = 0; H2 < h4._sb.length; H2++) h4.__h.push(h4._sb[H2]);
        h4._sb = [];
      } else do {
        h4.__d = false, P3 && P3(u4), a3 = h4.render(h4.props, h4.state, h4.context), h4.state = h4.__s;
      } while (h4.__d && ++A3 < 25);
      h4.state = h4.__s, null != h4.getChildContext && (i3 = w(w({}, i3), h4.getChildContext())), S2 && !p3 && null != h4.getSnapshotBeforeUpdate && (_3 = h4.getSnapshotBeforeUpdate(v3, y3)), L2 = a3, null != a3 && a3.type === k && null == a3.key && (L2 = V(a3.props.children)), f4 = I(n2, d(L2) ? L2 : [L2], u4, t2, i3, o3, r3, e2, f4, c3, s3), h4.base = u4.__e, u4.__u &= -161, h4.__h.length && e2.push(h4), m3 && (h4.__E = h4.__ = null);
    } catch (n3) {
      if (u4.__v = null, c3 || null != r3) if (n3.then) {
        for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
        r3[r3.indexOf(f4)] = null, u4.__e = f4;
      } else {
        for (T2 = r3.length; T2--; ) g(r3[T2]);
        z(u4);
      }
      else u4.__e = t2.__e, u4.__k = t2.__k, n3.then || z(u4);
      l.__e(n3, u4, t2);
    }
    else null == r3 && u4.__v == t2.__v ? (u4.__k = t2.__k, u4.__e = t2.__e) : f4 = u4.__e = q(t2.__e, u4, t2, i3, o3, r3, e2, c3, s3);
    return (a3 = l.diffed) && a3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function z(n2) {
    n2 && n2.__c && (n2.__c.__e = true), n2 && n2.__k && n2.__k.forEach(z);
  }
  function N(n2, u4, t2) {
    for (var i3 = 0; i3 < t2.length; i3++) B(t2[i3], t2[++i3], t2[++i3]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function V(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b && n2.__b > 0 ? n2 : d(n2) ? n2.map(V) : w({}, n2);
  }
  function q(u4, t2, i3, o3, r3, e2, f4, c3, s3) {
    var a3, h4, v3, y3, w3, _3, m3, b2 = i3.props || p, k3 = t2.props, x3 = t2.type;
    if ("svg" == x3 ? r3 = "http://www.w3.org/2000/svg" : "math" == x3 ? r3 = "http://www.w3.org/1998/Math/MathML" : r3 || (r3 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (a3 = 0; a3 < e2.length; a3++) if ((w3 = e2[a3]) && "setAttribute" in w3 == !!x3 && (x3 ? w3.localName == x3 : 3 == w3.nodeType)) {
        u4 = w3, e2[a3] = null;
        break;
      }
    }
    if (null == u4) {
      if (null == x3) return document.createTextNode(k3);
      u4 = document.createElementNS(r3, x3, k3.is && k3), c3 && (l.__m && l.__m(t2, e2), c3 = false), e2 = null;
    }
    if (null == x3) b2 === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e2 = e2 && n.call(u4.childNodes), !c3 && null != e2) for (b2 = {}, a3 = 0; a3 < u4.attributes.length; a3++) b2[(w3 = u4.attributes[a3]).name] = w3.value;
      for (a3 in b2) if (w3 = b2[a3], "children" == a3) ;
      else if ("dangerouslySetInnerHTML" == a3) v3 = w3;
      else if (!(a3 in k3)) {
        if ("value" == a3 && "defaultValue" in k3 || "checked" == a3 && "defaultChecked" in k3) continue;
        j(u4, a3, null, w3, r3);
      }
      for (a3 in k3) w3 = k3[a3], "children" == a3 ? y3 = w3 : "dangerouslySetInnerHTML" == a3 ? h4 = w3 : "value" == a3 ? _3 = w3 : "checked" == a3 ? m3 = w3 : c3 && "function" != typeof w3 || b2[a3] === w3 || j(u4, a3, w3, b2[a3], r3);
      if (h4) c3 || v3 && (h4.__html == v3.__html || h4.__html == u4.innerHTML) || (u4.innerHTML = h4.__html), t2.__k = [];
      else if (v3 && (u4.innerHTML = ""), I("template" == t2.type ? u4.content : u4, d(y3) ? y3 : [y3], t2, i3, o3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : r3, e2, f4, e2 ? e2[0] : i3.__k && S(i3, 0), c3, s3), null != e2) for (a3 = e2.length; a3--; ) g(e2[a3]);
      c3 || (a3 = "value", "progress" == x3 && null == _3 ? u4.removeAttribute("value") : null != _3 && (_3 !== u4[a3] || "progress" == x3 && !_3 || "option" == x3 && _3 != b2[a3]) && j(u4, a3, _3, b2[a3], r3), a3 = "checked", null != m3 && m3 != u4[a3] && j(u4, a3, m3, b2[a3], r3));
    }
    return u4;
  }
  function B(n2, u4, t2) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
      } else n2.current = u4;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function D(n2, u4, t2) {
    var i3, o3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || B(i3, null, u4)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u4);
      }
      i3.base = i3.__P = null;
    }
    if (i3 = n2.__k) for (o3 = 0; o3 < i3.length; o3++) i3[o3] && D(i3[o3], u4, t2 || "function" != typeof n2.type);
    t2 || g(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function E(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  n = v.slice, l = { __e: function(n2, l3, u4, t2) {
    for (var i3, o3, r3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((o3 = i3.constructor) && null != o3.getDerivedStateFromError && (i3.setState(o3.getDerivedStateFromError(n2)), r3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t2 || {}), r3 = i3.__d), r3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, x.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = w({}, this.state), "function" == typeof n2 && (n2 = n2(w({}, u4), this.props)), n2 && w(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), M(this));
  }, x.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), M(this));
  }, x.prototype.render = k, i = [], r = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, $3.__r = 0, f = /(PointerCapture)$|Capture$/i, c = 0, s = F(false), a = F(true), h = 0;

  // node_modules/preact-render-to-string/dist/index.module.js
  var r2 = "diffed";
  var o2 = "__c";
  var i2 = "__s";
  var a2 = "__c";
  var c2 = "__k";
  var u2 = "__d";
  var s2 = "__s";
  var l2 = /[\s\n\\/='"\0<>]/;
  var f2 = /^(xlink|xmlns|xml)([A-Z])/;
  var p2 = /^(?:accessK|auto[A-Z]|cell|ch|col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|popoverT|readO|rowS|src[A-Z]|tabI|useM|item[A-Z])/;
  var h2 = /^ac|^ali|arabic|basel|cap|clipPath$|clipRule$|color|dominant|enable|fill|flood|font|glyph[^R]|horiz|image|letter|lighting|marker[^WUH]|overline|panose|pointe|paint|rendering|shape|stop|strikethrough|stroke|text[^L]|transform|underline|unicode|units|^v[^i]|^w|^xH/;
  var d2 = /* @__PURE__ */ new Set(["draggable", "spellcheck"]);
  function v2(e2) {
    void 0 !== e2.__g ? e2.__g |= 8 : e2[u2] = true;
  }
  function m2(e2) {
    void 0 !== e2.__g ? e2.__g &= -9 : e2[u2] = false;
  }
  function y2(e2) {
    return void 0 !== e2.__g ? !!(8 & e2.__g) : true === e2[u2];
  }
  var _2 = /["&<]/;
  function g2(e2) {
    if (0 === e2.length || false === _2.test(e2)) return e2;
    for (var t2 = 0, n2 = 0, r3 = "", o3 = ""; n2 < e2.length; n2++) {
      switch (e2.charCodeAt(n2)) {
        case 34:
          o3 = "&quot;";
          break;
        case 38:
          o3 = "&amp;";
          break;
        case 60:
          o3 = "&lt;";
          break;
        default:
          continue;
      }
      n2 !== t2 && (r3 += e2.slice(t2, n2)), r3 += o3, t2 = n2 + 1;
    }
    return n2 !== t2 && (r3 += e2.slice(t2, n2)), r3;
  }
  var b = {};
  var x2 = /* @__PURE__ */ new Set(["animation-iteration-count", "border-image-outset", "border-image-slice", "border-image-width", "box-flex", "box-flex-group", "box-ordinal-group", "column-count", "fill-opacity", "flex", "flex-grow", "flex-negative", "flex-order", "flex-positive", "flex-shrink", "flood-opacity", "font-weight", "grid-column", "grid-row", "line-clamp", "line-height", "opacity", "order", "orphans", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width", "tab-size", "widows", "z-index", "zoom"]);
  var k2 = /[A-Z]/g;
  function w2(e2) {
    var t2 = "";
    for (var n2 in e2) {
      var r3 = e2[n2];
      if (null != r3 && "" !== r3) {
        var o3 = "-" == n2[0] ? n2 : b[n2] || (b[n2] = n2.replace(k2, "-$&").toLowerCase()), i3 = ";";
        "number" != typeof r3 || o3.startsWith("--") || x2.has(o3) || (i3 = "px;"), t2 = t2 + o3 + ":" + r3 + i3;
      }
    }
    return t2 || void 0;
  }
  function C2() {
    this.__d = true;
  }
  function A2(e2, t2) {
    return { __v: e2, context: t2, props: e2.props, setState: C2, forceUpdate: C2, __d: true, __h: new Array(0) };
  }
  var D2;
  var P2;
  var $4;
  var U;
  var F2 = {};
  var M2 = [];
  var W = Array.isArray;
  var z2 = Object.assign;
  var H = "";
  var N2 = "<!--$s-->";
  var q2 = "<!--/$s-->";
  function B2(a3, u4, s3) {
    var l3 = l[i2];
    l[i2] = true, D2 = l.__b, P2 = l[r2], $4 = l.__r, U = l.unmount;
    var f4 = _(k, null);
    f4[c2] = [a3];
    try {
      var p3 = O2(a3, u4 || F2, false, void 0, f4, false, s3);
      return W(p3) ? p3.join(H) : p3;
    } catch (e2) {
      if (e2.then) throw new Error('Use "renderToStringAsync" for suspenseful rendering.');
      throw e2;
    } finally {
      l[o2] && l[o2](a3, M2), l[i2] = l3, M2.length = 0;
    }
  }
  function I2(e2, t2) {
    var n2, r3 = e2.type, o3 = true;
    return e2[a2] ? (o3 = false, (n2 = e2[a2]).state = n2[s2]) : n2 = new r3(e2.props, t2), e2[a2] = n2, n2.__v = e2, n2.props = e2.props, n2.context = t2, v2(n2), null == n2.state && (n2.state = F2), null == n2[s2] && (n2[s2] = n2.state), r3.getDerivedStateFromProps ? n2.state = z2({}, n2.state, r3.getDerivedStateFromProps(n2.props, n2.state)) : o3 && n2.componentWillMount ? (n2.componentWillMount(), n2.state = n2[s2] !== n2.state ? n2[s2] : n2.state) : !o3 && n2.componentWillUpdate && n2.componentWillUpdate(), $4 && $4(e2), n2.render(n2.props, n2.state, t2);
  }
  function O2(t2, r3, o3, i3, u4, _3, b2) {
    if (null == t2 || true === t2 || false === t2 || t2 === H) return H;
    var x3 = typeof t2;
    if ("object" != x3) return "function" == x3 ? H : "string" == x3 ? g2(t2) : t2 + H;
    if (W(t2)) {
      var k3, C3 = H;
      u4[c2] = t2;
      for (var S2 = t2.length, L2 = 0; L2 < S2; L2++) {
        var E2 = t2[L2];
        if (null != E2 && "boolean" != typeof E2) {
          var j2, T2 = O2(E2, r3, o3, i3, u4, _3, b2);
          "string" == typeof T2 ? C3 += T2 : (k3 || (k3 = new Array(S2)), C3 && k3.push(C3), C3 = H, W(T2) ? (j2 = k3).push.apply(j2, T2) : k3.push(T2));
        }
      }
      return k3 ? (C3 && k3.push(C3), k3) : C3;
    }
    if (void 0 !== t2.constructor) return H;
    t2.__ = u4, D2 && D2(t2);
    var Z = t2.type, M3 = t2.props;
    if ("function" == typeof Z) {
      var B3, V2, K, J = r3;
      if (Z === k) {
        if ("tpl" in M3) {
          for (var Q = H, X = 0; X < M3.tpl.length; X++) if (Q += M3.tpl[X], M3.exprs && X < M3.exprs.length) {
            var Y = M3.exprs[X];
            if (null == Y) continue;
            "object" != typeof Y || void 0 !== Y.constructor && !W(Y) ? Q += Y : Q += O2(Y, r3, o3, i3, t2, _3, b2);
          }
          return Q;
        }
        if ("UNSTABLE_comment" in M3) return "<!--" + g2(M3.UNSTABLE_comment) + "-->";
        V2 = M3.children;
      } else {
        if (null != (B3 = Z.contextType)) {
          var ee = r3[B3.__c];
          J = ee ? ee.props.value : B3.__;
        }
        var te = Z.prototype && "function" == typeof Z.prototype.render;
        if (te) V2 = /**#__NOINLINE__**/
        I2(t2, J), K = t2[a2];
        else {
          t2[a2] = K = /**#__NOINLINE__**/
          A2(t2, J);
          for (var ne = 0; y2(K) && ne++ < 25; ) {
            m2(K), $4 && $4(t2);
            try {
              V2 = Z.call(K, M3, J);
            } catch (e2) {
              throw _3 && e2 && "function" == typeof e2.then && (t2._suspended = true), e2;
            }
          }
          v2(K);
        }
        if (null != K.getChildContext && (r3 = z2({}, r3, K.getChildContext())), te && l.errorBoundaries && (Z.getDerivedStateFromError || K.componentDidCatch)) {
          V2 = null != V2 && V2.type === k && null == V2.key && null == V2.props.tpl ? V2.props.children : V2;
          try {
            return O2(V2, r3, o3, i3, t2, _3, false);
          } catch (e2) {
            return Z.getDerivedStateFromError && (K[s2] = Z.getDerivedStateFromError(e2)), K.componentDidCatch && K.componentDidCatch(e2, F2), y2(K) ? (V2 = I2(t2, r3), null != (K = t2[a2]).getChildContext && (r3 = z2({}, r3, K.getChildContext())), O2(V2 = null != V2 && V2.type === k && null == V2.key && null == V2.props.tpl ? V2.props.children : V2, r3, o3, i3, t2, _3, b2)) : H;
          } finally {
            P2 && P2(t2), U && U(t2);
          }
        }
      }
      V2 = null != V2 && V2.type === k && null == V2.key && null == V2.props.tpl ? V2.props.children : V2;
      try {
        var re = O2(V2, r3, o3, i3, t2, _3, b2);
        return P2 && P2(t2), l.unmount && l.unmount(t2), t2._suspended ? "string" == typeof re ? N2 + re + q2 : W(re) ? (re.unshift(N2), re.push(q2), re) : re.then(function(e2) {
          return N2 + e2 + q2;
        }) : re;
      } catch (n2) {
        if (!_3 && b2 && b2.onError) {
          var oe = (function e2(n3) {
            return b2.onError(n3, t2, function(t3, n4) {
              try {
                return O2(t3, r3, o3, i3, n4, _3, b2);
              } catch (t4) {
                return e2(t4);
              }
            });
          })(n2);
          if (void 0 !== oe) return oe;
          var ie = l.__e;
          return ie && ie(n2, t2), H;
        }
        if (!_3) throw n2;
        if (!n2 || "function" != typeof n2.then) throw n2;
        return n2.then(function e2() {
          try {
            var n3 = O2(V2, r3, o3, i3, t2, _3, b2);
            return t2._suspended ? N2 + n3 + q2 : n3;
          } catch (t3) {
            if (!t3 || "function" != typeof t3.then) throw t3;
            return t3.then(e2);
          }
        });
      }
    }
    var ae, ce = "<" + Z, ue = H;
    for (var se in M3) {
      var le = M3[se];
      if ("function" != typeof (le = G(le) ? le.value : le) || "class" === se || "className" === se) {
        switch (se) {
          case "children":
            ae = le;
            continue;
          case "key":
          case "ref":
          case "__self":
          case "__source":
            continue;
          case "htmlFor":
            if ("for" in M3) continue;
            se = "for";
            break;
          case "className":
            if ("class" in M3) continue;
            se = "class";
            break;
          case "defaultChecked":
            se = "checked";
            break;
          case "defaultSelected":
            se = "selected";
            break;
          case "defaultValue":
          case "value":
            switch (se = "value", Z) {
              case "textarea":
                ae = le;
                continue;
              case "select":
                i3 = le;
                continue;
              case "option":
                i3 != le || "selected" in M3 || (ce += " selected");
            }
            break;
          case "dangerouslySetInnerHTML":
            ue = le && le.__html;
            continue;
          case "style":
            "object" == typeof le && (le = w2(le));
            break;
          case "acceptCharset":
            se = "accept-charset";
            break;
          case "httpEquiv":
            se = "http-equiv";
            break;
          default:
            if (f2.test(se)) se = se.replace(f2, "$1:$2").toLowerCase();
            else {
              if (l2.test(se)) continue;
              "-" !== se[4] && !d2.has(se) || null == le ? o3 ? h2.test(se) && (se = "panose1" === se ? "panose-1" : se.replace(/([A-Z])/g, "-$1").toLowerCase()) : p2.test(se) && (se = se.toLowerCase()) : le += H;
            }
        }
        null != le && false !== le && (ce = true === le || le === H ? ce + " " + se : ce + " " + se + '="' + ("string" == typeof le ? g2(le) : le + H) + '"');
      }
    }
    if (l2.test(Z)) throw new Error(Z + " is not a valid HTML tag name in " + ce + ">");
    if (ue || ("string" == typeof ae ? ue = g2(ae) : null != ae && false !== ae && true !== ae && (ue = O2(ae, r3, "svg" === Z || "foreignObject" !== Z && o3, i3, t2, _3, b2))), P2 && P2(t2), U && U(t2), !ue && R.has(Z)) return ce + "/>";
    var fe = "</" + Z + ">", pe = ce + ">";
    return W(ue) ? [pe].concat(ue, [fe]) : "string" != typeof ue ? [pe, ue, fe] : pe + ue + fe;
  }
  var R = /* @__PURE__ */ new Set(["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]);
  function G(e2) {
    return null !== e2 && "object" == typeof e2 && "function" == typeof e2.peek && "value" in e2;
  }

  // src/utils/dom.ts
  function normalizeContent(content) {
    if (typeof content === "string") {
      return content;
    }
    if (content.jquery) {
      return content.prop("outerHTML");
    }
    if (content instanceof HTMLElement) {
      return content.outerHTML;
    }
    throw new Error("Unsupported content type");
  }

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  function u3(e2, t2, n2, o3, i3, u4) {
    t2 || (t2 = {});
    var a3, c3, p3 = t2;
    if ("ref" in p3) for (c3 in p3 = {}, t2) "ref" == c3 ? a3 = t2[c3] : p3[c3] = t2[c3];
    var l3 = { type: e2, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
    if ("function" == typeof e2 && (a3 = e2.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
  }

  // src/components/Overlay.tsx
  function Overlay(options) {
    const html = normalizeContent(options.content);
    const markup = B2(
      /* @__PURE__ */ u3("div", { class: "content", id: options.id, children: [
        /* @__PURE__ */ u3("header", { children: [
          /* @__PURE__ */ u3("div", { class: "close", children: /* @__PURE__ */ u3("button", { class: "overlayClose", children: /* @__PURE__ */ u3("i", { class: "far fa-times-circle" }) }) }),
          /* @__PURE__ */ u3("div", { class: "heading", children: [
            options.heading.icon && /* @__PURE__ */ u3("i", { class: "fas fa-" + options.heading.icon }),
            /* @__PURE__ */ u3("span", { children: options.heading.label })
          ] })
        ] }),
        /* @__PURE__ */ u3("section", { dangerouslySetInnerHTML: { __html: html } })
      ] })
    );
    const $overlay = $(".overlay");
    $overlay.children().remove();
    const $el = $(markup).hide();
    $el.find(".overlayClose").on("click", () => $el.remove());
    $overlay.append($el);
    return $el.show();
  }

  // src/utils/utils.ts
  function parseDate(text) {
    text = text.trim();
    if (text === "TBA") return 0;
    const date = Date.parse(text + " 2025");
    return isNaN(date) ? 0 : date;
  }
  function getYTID(url) {
    const regExp = /(?:youtube\.com\/(?:.*v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  // src/utils/sort.ts
  function sort(type, $root) {
    const $items = $root.children(".albumBlock");
    const getValue = (el) => {
      const $el = $(el);
      switch (type) {
        case "comments":
          return parseInt(
            $el.find(".comment_count").first().text().replace(/,/g, ""),
            10
          ) || 0;
        case "saved":
          return parseInt(
            $el.find(".comment_count").last().text().replace(/,/g, ""),
            10
          ) || 0;
        case "date":
        default:
          return parseDate($el.find(".type").text());
      }
    };
    const sorted = $items.get().sort((a3, b2) => getValue(b2) - getValue(a3));
    $root.append(sorted);
  }

  // src/modules/album.ts
  var Album = () => {
    const module = new Module({
      name: "Albums",
      description: "Albums related settings."
    });
    const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];
    if (ALBUM_ID) {
      $("#centerContent").addClass("album");
    }
    module.loadFeatures([
      new Feature({
        name: "Aotified",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer("#centerContent.album", function() {
            const $root = $(this);
            const $fullWidth = $root.children(".fullWidth");
            const $wideLeft = $root.find(".flexContainer .wideLeft.alignTop");
            $fullWidth.replaceClass("*", "albumHeader");
            const $albumCover = $fullWidth.children(".albumTopBox.cover");
            const $albumBoxInfo = $fullWidth.children(".albumTopBox.info");
            const $albumBoxRating = $albumCover.next(".albumTopBox");
            $albumBoxRating.addClass("ratings");
            const $albumHeadline = $fullWidth.children(".albumHeadline");
            const $albumNav = $fullWidth.children(".selectRow");
            const $albumDetails = $("<div class='albumDetails'>");
            const $albumBoxes = $("<div class='albumBoxes'>");
            $albumBoxes.append($albumBoxRating, $albumBoxInfo);
            $albumCover.wrap("<div class='albumCover'>");
            $albumNav.prependTo($wideLeft);
            $albumDetails.append($albumHeadline, $albumBoxes);
            $fullWidth.append($albumDetails);
          });
          Observer(
            ".albumCriticScoreBox, .albumUserScoreBox",
            function() {
              const $box = $(this);
              const $ratingDetails = $("<div>", { class: "ratingDetails" });
              const $ratingValue = $("<div>", { class: "ratingValue" });
              $box.prepend($ratingDetails);
              $box.prepend($ratingValue);
              const $aggregate = $box.children(
                'span[itemprop="aggregateRating"]'
              );
              const $spanRatingValue = $box.find(`span[itemprop="ratingValue"]`);
              $box.find(`#moreStatsLink`).remove();
              $box.find("meta").each(function() {
                $(this).remove();
              });
              $aggregate.unpack();
              $spanRatingValue.unpack();
              const $heading = $box.children(".heading");
              $ratingValue.append($heading);
              const $ratingItem = $box.children(
                ".albumCriticScore, .albumUserScore"
              );
              $ratingItem.addClass("ratingItem").removeAttr("style").removeClass("albumCriticScore albumUserScore");
              $ratingValue.append($ratingItem);
              let score = "NR";
              const $scoreEl = $ratingItem.children().first();
              $scoreEl.attr("id", "score");
              if ($scoreEl.prop("tagName") === "A") {
                const rawScore = Number($scoreEl.attr("title"));
                if (!isNaN(rawScore)) score = rawScore.toFixed(1);
              }
              $scoreEl.text(score);
              $box.find(".text").each(function() {
                $ratingDetails.append(this);
              });
            },
            { once: false }
          );
        }
      }),
      new Feature({
        name: "Embedded Videos",
        description: "Shows embedded video if available",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          let video_url;
          Observer(".album:has(.albumTopBox.cover.video)", function() {
            const $root = $(this);
            const $link = $root.find(
              ".albumLinksFlex a:has(.albumButton.youtube)"
            );
            video_url = $link.attr("href");
            if (video_url) {
              ctx.logger.log(`video: ${video_url}`);
              const videoId = getYTID(video_url);
              if (!videoId) {
                alert("\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F YouTube \u0441\u0441\u044B\u043B\u043A\u0430");
                return;
              }
              const $iframe = $("<iframe>", {
                src: `https://www.youtube.com/embed/${videoId}`,
                frameborder: 0,
                allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowfullscreen: true
              });
              $root.find(".showImage").on("click", function(e2) {
                e2.preventDefault();
                e2.stopPropagation();
                Overlay({
                  id: "AOTIFIED_videoEmbed",
                  heading: { label: "Video", icon: "camera" },
                  content: $iframe
                });
              });
            }
          });
        }
      }),
      new Feature({
        name: "More Stats",
        description: "Fix album page layout and ratings.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(
            "#moreStats",
            async function() {
              const $box = $(this);
              $box.html("<div class='loader'/>");
              try {
                const res = await fetch("/scripts/moreStatsAlbum.php", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest"
                  },
                  body: `albumID=${ALBUM_ID}`,
                  credentials: "same-origin"
                });
                if (!res.ok) throw new Error(res.statusText);
                $box.children("loading").remove();
                $box.html(await res.text());
                ctx.logger.log("showStats initialized");
              } catch (err) {
                ctx.logger.error("moreStats failed", err);
                $box.addClass("error");
              }
            },
            { once: true }
          );
        }
      }),
      new Feature({
        name: "Fix Albums",
        description: "Fix releases and wrap albums.",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(
            ".anticipatedHome, .mobileScroll, #homeNewReleases, .section .mobileScroll",
            function() {
              const $root = $(this);
              const count = $root.find(".albumBlock").length;
              $root.addClass("releaseBlock").addClass(`count-${count}`);
            }
          );
          Observer(
            ".wideLeft",
            function() {
              const $root = $(this);
              if ($root.children(".releaseBlock").length) return;
              requestAnimationFrame(() => {
                const $albums = $root.children(".albumBlock");
                if (!$albums.length) return;
                if ($root.find(".sectionHeading").length) return;
                $("<div>", { class: "releaseBlock large" }).insertBefore($albums.first()).append($albums);
              });
            },
            { once: true }
          );
          Observer(
            "#homeNewReleases .albumBlock, #albumOutput .albumBlock",
            function() {
              $(this).addClass("slim");
            }
          );
          Observer(".ratingRow", function() {
            if ($(this).children(".ratingTextWrapper").length) return;
            const $texts = $(this).children(".ratingText");
            if ($texts.length < 2) return;
            $("<div/>", { class: "ratingTextWrapper" }).append($texts).appendTo(this);
          });
          Observer("section", function() {
            if ($(this).find('.sectionHeading h2 a[href="/recently-added/"]').length) {
              $(this).attr("id", "recentlyAdded");
            }
          });
        }
      }),
      new Feature({
        name: "Advanced Sorting",
        description: "More album sorting.",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(
            ".anticipatedHome",
            function() {
              const $root = $(this);
              if ($root.find(".filterRow").length) return;
              const $sort = $(`
            <div class="filterRow">
              <div class="menuDropFloatRight albumSort">
                <div class="menuDropText">Sort</div>
                <ul class="menuDrop">
                  <li id="sort" class="menuDropSelected">
                    <div class="menuDropSelectedText">Release date</div>
                    <ul>
                      <li class="current" data-sort="date">Release date</li>
                      <li data-sort="comments">Comments</li>
                      <li data-sort="saved">Saved</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          `);
              $sort.on("click", "li[data-sort]", function(e2) {
                e2.preventDefault();
                const $item = $(this);
                const type = $item.data("sort");
                $sort.find("li[data-sort]").removeClass("current");
                $item.addClass("current");
                $sort.find(".menuDropSelectedText").text($item.text());
                requestAnimationFrame(() => {
                  $(".releaseBlock").each(function() {
                    sort(type, $(this));
                  });
                });
              });
              $sort.insertAfter($root.find(".sectionHeading"));
            },
            { once: true }
          );
        }
      })
    ]);
    return module;
  };

  // src/modules/artist.ts
  var Artist = () => {
    const module = new Module({
      name: "Artists",
      description: "Artists related settings."
    });
    const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];
    if (!ARTIST_ID) {
      return module;
    }
    $("#centerContent").addClass("artist");
    Observer(".facetContent", function() {
      const $root = $(this);
      console.debug("Observer triggered");
      const $albums = $root.children(".albumBlock");
      if ($albums.length) {
        let $albumOutput = $root.children("#albumOutput");
        if (!$albumOutput.length) {
          $albumOutput = $("<div id='albumOutput'></div>");
          $albums.first().before($albumOutput);
        }
        $albums.appendTo($albumOutput);
      }
    });
    Observer(
      "#albumOutput",
      function() {
        const $root = $(this);
        if ($root.children().length === 1 && $root.children(".adTagWide").length === 1) {
          $root.append("<div class='noResults'>No Releases</div>");
        }
      },
      { once: true }
    );
    Observer("#facetContent:has(> .subHeadline)", function() {
      const $root = $(this);
      const $releaseContainer = $("<div class='releaseContainer'></div>");
      const $releaseBlock = $root.children("#albumOutput").addClass("releaseBlock").removeAttr("id");
      const $releaseHeaderItems = $root.children(
        ".subHeadline, .listenRow.artist"
      );
      if ($releaseHeaderItems.length) {
        $releaseHeaderItems.wrapAll("<div class='releaseHeader'></div>");
      }
      const $releaseHeader = $root.children(".releaseHeader");
      if ($releaseBlock.length || $releaseHeader.length) {
        $releaseContainer.append($releaseHeader, $releaseBlock);
        $root.append($releaseContainer);
      }
      $releaseContainer.wrap("<div id='albumOutput'></div>");
    });
    Observer(
      "#facets",
      function() {
        const $container = $(this);
        let $currentItem = null;
        $container.children().each(function() {
          const $el = $(this);
          if ($el.hasClass("facetItem")) return;
          if ($el.hasClass("center")) {
            $el.addClass("facetButton").removeClass("center");
            return;
          }
          if ($el.hasClass("facetTitle")) {
            $currentItem = $("<div class='facetItem'>");
            $el.before($currentItem);
            $currentItem.append($el);
            return;
          }
          if ($currentItem && $el.hasClass("facet")) {
            $currentItem.append($el);
          }
        });
      },
      { once: true }
    );
    Observer(".artistFooter", function() {
      const $footer = $(this);
      let hasLiveSection = false;
      $footer.children(".section").each(function() {
        const $section = $(this);
        if ($section.hasClass("relatedArtists")) {
          if ($section.find(".artistBlock").length) hasLiveSection = true;
          return;
        }
        if (!$section.find(".noDisplay").length) {
          hasLiveSection = true;
        }
      });
      if (!hasLiveSection) {
        $footer.remove();
      }
    });
    module.loadFeatures([
      new Feature({
        name: "Fix Artist Header",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(
            ".artistHeader",
            function() {
              const $fullWidth = $(".fullWidth").first();
              const $header = $fullWidth.children(".artistHeader");
              if (!$fullWidth.length || !$header.length) return;
              if ($fullWidth.children(".artistContent").length) return;
              const $artistContent = $("<div>", { class: "artistContent" });
              let $node = $header.next();
              while ($node.length) {
                const $next = $node.next();
                $artistContent.append($node);
                $node = $next;
              }
              $fullWidth.append($artistContent);
            },
            { once: true }
          );
        }
      }),
      new Feature({
        name: "Fix Album Output",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(
            "#albumOutput",
            function() {
              const $root = $(this);
              let $section = null;
              let $header = null;
              let $block = null;
              $root.children().each(function() {
                const $el = $(this);
                if ($el.hasClass("subHeadline")) {
                  $section = $("<div>", { class: "releaseContainer" });
                  $header = $("<div>", { class: "releaseHeader" });
                  $block = $("<div>", { class: "releaseBlock" });
                  $section.insertBefore($el);
                  $section.append($header, $block);
                  $header.append($el);
                  return;
                }
                if (!$section || !$header || !$block) return;
                if ($el.hasClass("listenRow")) {
                  $header.append($el);
                  return;
                }
                if ($el.hasClass("albumBlock")) {
                  $el.addClass("slim");
                  $block.append($el);
                }
              });
            },
            { once: true }
          );
        }
      }),
      new Feature({
        name: "Move Filter Row",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(
            "#facetContent #toggleSearch",
            function() {
              const $filterRow = $(".artistContent > .filterRow.buttons");
              const $toggleSearch = $("#facetContent > #toggleSearch");
              if (!$filterRow.length || !$toggleSearch.length) return;
              $toggleSearch.after($filterRow);
            },
            { once: true }
          );
        }
      }),
      new Feature({
        name: "Create footer",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(
            ".fullWidth",
            function() {
              const $root = $(this);
              if ($root.children(".artistFooter").length) return;
              const $mediaList = $root.find(".artistContent .section.mediaList");
              const $relatedArtists = $root.find(
                ".artistContent .section.relatedArtists"
              );
              const $footer = $("<div>", { class: "artistFooter" });
              if ($mediaList.length) $footer.append($mediaList);
              if ($relatedArtists.length) $footer.append($relatedArtists);
              $root.append($footer);
            },
            { once: true }
          );
        }
      }),
      new Feature({
        name: "Fix Related Artists",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(".relatedArtists", function() {
            const $root = $(this);
            if ($root.children(".artistsBlock").length) return;
            const $artistBlocks = $root.find(".artistBlock");
            if (!$artistBlocks.length) return;
            const $artistsBlock = $("<div>", { class: "artistsBlock" });
            $artistBlocks.each(function() {
              $artistsBlock.append(this);
            });
            $root.append($artistsBlock);
          });
        }
      })
    ]);
    return module;
  };

  // src/modules/user.ts
  var User = () => {
    const module = new Module({
      name: "Users",
      description: "Users related settings."
    });
    const USERNAME = location.pathname.match(/^\/user\/([^/]+)\/?$/)?.[1];
    if (!USERNAME) {
      return module;
    }
    $("#centerContent").addClass("user");
    module.loadFeatures([
      new Feature({
        name: "Wrap Profile",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(".profileContent", function() {
            const $root = $(this);
            if ($root.data("releaseWrapped")) return;
            $root.data("releaseWrapped", true);
            const $headings = $root.children(".sectionHeading").not("#favSection .sectionHeading");
            $headings.each(function() {
              const $heading = $(this);
              const $releaseContainer = $("<div class='releaseContainer'>");
              const $releaseBlock = $("<div class='releaseBlock'>");
              $heading.nextUntil(".sectionHeading", ".albumBlock").addClass("user").appendTo($releaseBlock);
              if (!$releaseBlock.children().length) return;
              $heading.wrap($releaseContainer);
              $releaseBlock.insertAfter($heading);
            });
          });
          Observer("#centerContent.user", function() {
            const $root = $(this);
            const pfp = $(".profileImage img").attr("src");
            ctx.logger.debug(pfp);
            const $profileLayout = $root.children(".flexContainer");
            $profileLayout.removeClass("flexContainer");
            $profileLayout.addClass("profileLayout");
            const $profileSidebar = $profileLayout.children(".rightContent");
            $profileSidebar.removeClass("rightContent");
            $profileSidebar.addClass("profileSidebar");
            $profileSidebar.find(".rightBox:has(.tag)").wrapChildren(".tag", "<div class='tagBlock'>");
            $profileSidebar.find(`.rightBox:has(a[href^="/user/"])`).wrapChildren(`a`, "<div class='usersBlock'>");
            const $profileContent = $profileLayout.children(".wideLeft");
            $profileContent.removeClass("wideLeft alignTop");
            $profileContent.addClass("profileContent");
            const $fullWidth = $root.children(".fullWidth:has(> #profileHead)");
            const $profileHead = $fullWidth.children("#profileHead");
            const $profileInfo = $profileHead.children(".profileHeadLeft").replaceClass("*", "rightBox profileInfo");
            const $profileStats = $profileHead.children(".profileHeadRight").replaceClass("*", "rightBox profileStats");
            $profileStats.children(".profileStatContainer").replaceClass("*", "statsBlock").wrapAll("<div class='statsContainer'></div>");
            $profileStats.prepend(`<h2 class="sectionHeading">Stats</h2>`);
            const $profileNav = $fullWidth.children(".profileNav");
            $profileContent.prepend($profileNav);
            const $profileText = $fullWidth.find(".headline.profile");
            $profileText.each(function() {
              const $span = $(this).children("span").addClass("profileName").removeAttr("style");
              const $donor = $(this).children(".donor");
              if ($span.length && $donor.length) {
                $span.append($donor);
              }
            });
            $profileText.find(".profileName").each(function() {
              const node = this.childNodes[0];
              if (node && node.nodeType === 3) {
                const span = document.createElement("span");
                span.className = "nickname";
                span.textContent = node.textContent;
                this.replaceChild(span, node);
              }
            });
            $profileHead.unpack();
            $fullWidth.unpack();
            $profileSidebar.insertBefore($profileContent);
            $profileSidebar.prepend($profileStats);
            $profileSidebar.prepend($profileInfo);
          });
          Observer("#favBlock", function() {
            $(this).addClass("releaseBlock");
          });
          Observer(".profileContent", function() {
            const $root = $(this);
            const $headings = $root.children(".sectionHeading");
            $headings.each(function(_3) {
              const $heading = $(this);
              const $releaseBlock = $("<div class='releaseBlock'>");
              const $releaseContainer = $("<div class='releaseContainer'>");
              $heading.nextUntil(".sectionHeading", ".albumBlock").addClass("user").appendTo($releaseBlock);
              $heading.wrapSmart($releaseContainer);
              $releaseBlock.insertAfter($heading);
            });
          });
        }
      }),
      new Feature({
        name: "Badges",
        description: "Show custom badges under user names",
        default: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer(".profileSidebar", function() {
            const $root = $(this);
            const $profileDetails = $root.find(".profileHeadText").replaceClass("*", "profileDetails");
            const $profileBadges = $("<div class='profileBadges'>");
            const now = /* @__PURE__ */ new Date();
            const memberSinceText = $root.find("div:contains('Member since')").first().text().trim().replace("StatsContributions", "").replace("Member since ", "");
            const memberDate = new Date(memberSinceText);
            let years = now.getFullYear() - memberDate.getFullYear();
            const hasHadAnniversary = now.getMonth() > memberDate.getMonth() || now.getMonth() === memberDate.getMonth() && now.getDate() >= memberDate.getDate();
            if (!hasHadAnniversary) {
              years--;
            }
            console.log(years);
            const $yearBadge = $(
              `<div class='badge year'><span id="year">${years}</span><span>year</span></div>`
            );
            let $devBadge = $(`<div class='badge dev'><span>DEV</span></div>`);
            if (USERNAME === "woidzero") {
              $profileBadges.append($devBadge);
            } else if (USERNAME === "rob") {
              $devBadge = $(`<div class='badge dev'><span>AOTY</span></div>`);
              $profileBadges.append($devBadge);
            }
            if (years > 0) {
              $profileBadges.append($yearBadge);
            }
            $profileDetails.append($profileBadges);
          });
        }
      })
    ]);
    return module;
  };

  // src/modules/images.ts
  var Images = () => {
    const module = new Module({
      name: "Images",
      description: "Images related settings."
    });
    module.loadFeatures([
      new Feature({
        name: "Upgrade Images",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer("img", function() {
            const $img = $(this);
            if ($img.data("upgraded")) return;
            $img.data("upgraded", true);
            const SIZE = "700";
            const src = $img.attr("src");
            if (!src) return;
            if (!/\/\d+x0\//.test(src) || src.includes(`${SIZE}x0`)) return;
            const upgraded = src.replace(/\/\d+x0\//, `/${SIZE}x0/`);
            const preloader = new Image();
            preloader.src = upgraded;
            preloader.onload = () => {
              $img.attr("src", upgraded);
              ctx.logger.debug("upgraded image:", upgraded);
            };
            preloader.onerror = (e2) => {
              ctx.logger.warn("image upgrade failed:", upgraded, e2);
            };
          });
        }
      })
    ]);
    return module;
  };

  // src/main.ts
  var composer = new Composer([Global(), Album(), Artist(), User(), Images()]);
  composer.start();
})();
