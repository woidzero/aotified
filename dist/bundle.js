"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/dom/plugins.ts
  var $2 = window.jQuery || window.$;
  if (!$2) {
    throw new Error("[aotified] jQuery not found on window");
  }
  $2.fn.wrapSmart = function(wrapper) {
    return this.each(function() {
      const $w = typeof wrapper === "function" ? wrapper() : wrapper.clone();
      $2(this).before($w);
      $w.append(this);
    });
  };
  $2.fn.unwrapSmart = function() {
    return this.each(function() {
      const $this = $2(this);
      $this.replaceWith($this.contents());
    });
  };
  $2.fn.changeTag = function(tag) {
    tag = tag.replace(/[<>]/g, "");
    return this.map(function() {
      const $old = $2(this);
      const $new = $2(`<${tag}/>`, $old.attr());
      $new.append($old.contents());
      $old.replaceWith($new);
      return $new.get(0);
    });
  };
  $2.fn.replaceClass = function(from, to) {
    const fromList = Array.isArray(from) ? from : [from];
    const toList = to ? Array.isArray(to) ? to : [to] : [];
    return this.each(function() {
      const $el = $2(this);
      if (fromList.length) $el.removeClass(fromList.join(" "));
      if (toList.length) $el.addClass(toList.join(" "));
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
      const module = this.modules.find((m) => m.name === moduleName);
      const feature = module?.features.find((f) => f.name === featureName);
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

  // src/dom/observer.ts
  function Observer(selector, callback, {
    once = false,
    root = document,
    idle = false,
    intersection = false,
    intersectionOptions
  } = {}) {
    const processed = /* @__PURE__ */ new WeakSet();
    const getRootEl = () => root?.[0] ?? root;
    const run = (el) => {
      if (processed.has(el)) return;
      processed.add(el);
      const $el = $(el);
      const exec = () => callback.call($el);
      if (idle && "requestIdleCallback" in window) {
        requestIdleCallback(exec);
      } else {
        exec();
      }
    };
    const io = intersection && "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        run(e.target);
        io.unobserve(e.target);
      }
    }, intersectionOptions) : null;
    const handle = (el) => {
      if (processed.has(el)) return;
      if (io) {
        io.observe(el);
      } else {
        run(el);
      }
    };
    $(getRootEl()).find(selector).each((_, el) => handle(el));
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (!(node instanceof Element)) continue;
          if (node.matches(selector)) handle(node);
          node.querySelectorAll?.(selector).forEach((el) => handle(el));
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
            for (const f of flakes) {
              f.y += f.d;
              if (f.y > canvas.height) {
                f.y = -10;
                f.x = Math.random() * canvas.width;
              }
            }
          }
          function draw() {
            if (!cnv_ctx) return ctx.logger.error("can't get canvas context.");
            cnv_ctx.clearRect(0, 0, canvas.width, canvas.height);
            cnv_ctx.fillStyle = "rgba(255,255,255,0.8)";
            cnv_ctx.beginPath();
            for (const f of flakes) {
              cnv_ctx.moveTo(f.x, f.y);
              cnv_ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
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
            $button.on("click", function(e) {
              e.stopPropagation();
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
            $menu.on("click", "li", function(e) {
              e.stopPropagation();
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

  // src/utils/utils.ts
  function parseDate(text) {
    text = text.trim();
    if (text === "TBA") return 0;
    const date = Date.parse(text + " 2025");
    return isNaN(date) ? 0 : date;
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
    const sorted = $items.get().sort((a, b) => getValue(b) - getValue(a));
    $root.append(sorted);
  }

  // src/modules/album.ts
  var Album = () => {
    const module = new Module({
      name: "Albums",
      description: "Albums related settings."
    });
    const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];
    if (!ALBUM_ID) {
      return module;
    }
    $("#centerContent").addClass("album");
    module.loadFeatures([
      new Feature({
        name: "Fix Ratings",
        description: "Fix album ratings appearance.",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(
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
              $aggregate.unwrapSmart();
              $spanRatingValue.unwrapSmart();
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
              return;
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
              return;
            },
            { once: true }
          );
          Observer(
            "#homeNewReleases .albumBlock, #albumOutput .albumBlock",
            function() {
              $(this).addClass("slim");
              return;
            }
          );
          Observer(".ratingRow", function() {
            if ($(this).children(".ratingTextWrapper").length) return;
            const $texts = $(this).children(".ratingText");
            if ($texts.length < 2) return;
            $("<div/>", { class: "ratingTextWrapper" }).append($texts).appendTo(this);
            return;
          });
          Observer("section", function() {
            if ($(this).find('.sectionHeading h2 a[href="/recently-added/"]').length) {
              $(this).attr("id", "recentlyAdded");
            }
            return;
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
              $sort.on("click", "li[data-sort]", function(e) {
                e.preventDefault();
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
    module.loadFeatures([
      new Feature({
        name: "Fix Ratings",
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
        }
      }),
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
      }),
      new Feature({
        name: "Wrap Ratings",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          return Observer(
            ".artistCriticScoreBox, .artistUserScoreBox",
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
        name: "Color Ratings",
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
        name: "Other Fixes",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx) => {
          ctx.logger.log(`enabled`);
          Observer("#facets", function() {
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
          });
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
          Observer("#centerContent.user", function() {
            const $root = $(this);
            const pfp = $(".profileImage img").attr("src");
            console.debug(`[userRework]: ${pfp}`);
            const $profileLayout = $root.children(".flexContainer");
            $profileLayout.removeClass("flexContainer");
            $profileLayout.addClass("profileLayout");
            const $profileSidebar = $profileLayout.children(".rightContent");
            $profileSidebar.removeClass("rightContent");
            $profileSidebar.addClass("profileSidebar");
            const $profileContent = $profileLayout.children(".wideLeft");
            $profileContent.removeClass("wideLeft alignTop");
            $profileContent.addClass("profileContent");
            const $profileDetails = $root.children(
              ".fullWidth:has(#profileHead)"
            );
            $profileDetails.removeClass("fullWidth");
            $profileDetails.addClass("profileDetails");
            const $profileNav = $profileDetails.children(".profileNav");
            $profileContent.prepend($profileNav);
            const $profileText = $profileDetails.find(".headline.profile");
            $profileText.attr("data-username", USERNAME);
            $profileSidebar.insertBefore($profileContent);
            $profileSidebar.prepend($profileDetails);
          });
          Observer("#favBlock", function() {
            $(this).addClass("releaseBlock");
          });
          Observer(".profileContent", function() {
            const $root = $(this);
            const $headings = $root.children(".sectionHeading");
            $headings.each(function(_) {
              const $heading = $(this);
              const $releaseBlock = $("<div class='releaseBlock'>");
              const $releaseContainer = $("<div class='releaseContainer'>");
              $heading.nextUntil(".sectionHeading", ".albumBlock").addClass("user").appendTo($releaseBlock);
              $heading.wrapSmart($releaseContainer);
              $releaseBlock.insertAfter($heading);
            });
          });
        }
      })
    ]);
    return module;
  };

  // src/main.ts
  var composer = new Composer([Global(), Album(), Artist(), User()]);
  composer.start();
})();
