"use strict";
(() => {
  // src/utils/jquery.dom.ts
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

  // src/utils/liveQuery.ts
  function liveQuery(selector, callback, {
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

  // src/core/essential.ts
  var Essential = async () => {
    (function upgradeImages() {
      console.log("[aotified] upgradeImages: active");
      liveQuery("img", function() {
        const $img = this;
        if ($img.data("upgraded")) return;
        $img.data("upgraded", true);
        const SIZE = "500";
        const src = $img.attr("src");
        if (!src) return;
        if (!/\/\d+x0\//.test(src) || src.includes(`${SIZE}x0`)) return;
        const upgraded = src.replace(/\/\d+x0\//, `/${SIZE}x0/`);
        const preloader = new Image();
        preloader.src = upgraded;
        preloader.onload = () => {
          $img.attr("src", upgraded);
          console.debug("[aotified] upgraded image:", upgraded);
        };
        preloader.onerror = (e) => {
          console.warn("[aotified] image upgrade failed:", upgraded, e);
        };
      });
    })();
    (function addLogo() {
      if ($("#GOT_AOTIFIED").length) return;
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
    })();
    (function globalFont() {
      if ($("#aotified-inter-font").length) return;
      $("<link>", {
        id: "aotified-inter-font",
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
      }).appendTo("head");
    })();
    (function globalFontStyle() {
      if ($("#aotified-inter-style").length) return;
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
    })();
    (function addSnow() {
      if ($("#aotified-snow").length) return;
      const $canvas = $("<canvas>", { id: "aotified-snow" }).css({
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999
      });
      $("body").append($canvas);
      const canvas = $canvas[0];
      const ctx = canvas.getContext("2d");
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
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        for (const f of flakes) {
          ctx.moveTo(f.x, f.y);
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        }
        ctx.fill();
        update();
        requestAnimationFrame(draw);
      }
      draw();
    })();
    (function portalDropdown() {
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
      liveQuery(".menuDropSelected", function() {
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
    })();
  };

  // src/utils/misc.ts
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

  // src/core/album.ts
  var Album = async () => {
    const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];
    (() => {
      $(
        'body > span[itemtype="http://schema.org/MusicAlbum"] #centerContent'
      ).addClass("album");
      $(".clear").remove();
    })();
    (function fixRatings() {
      liveQuery(
        ".albumCriticScoreBox, .albumUserScoreBox",
        function() {
          const $box = $(this);
          console.debug($box);
          const $ratingDetails = $("<div>", { class: "ratingDetails" });
          const $ratingValue = $("<div>", { class: "ratingValue" });
          $box.prepend($ratingDetails);
          $box.prepend($ratingValue);
          const $aggregate = $box.children('span[itemprop="aggregateRating"]');
          const $spanRatingValue = $box.find(`span[itemprop="ratingValue"]`);
          $box.find(`#moreStatsLink`).remove();
          $box.find("meta").each(function() {
            this.remove();
          });
          $aggregate.unwrapSmart();
          $spanRatingValue.unwrapSmart();
          const $heading = $box.children(".heading");
          $ratingValue.append($heading);
          const $ratingItem = $box.children(".albumCriticScore, .albumUserScore");
          $ratingItem.addClass("ratingItem");
          $ratingItem.removeAttr("style");
          $ratingItem.removeClass("albumCriticScore albumUserScore");
          $ratingValue.append($ratingItem);
          let score = "NR";
          const $scoreEl = $ratingItem.children().first();
          $scoreEl.attr("id", "score");
          if ($scoreEl.prop("tagName") === "A") {
            const rawScore = Number($scoreEl.attr("title"));
            if (!isNaN(rawScore)) {
              score = rawScore.toFixed(1);
            }
          }
          $scoreEl.text(score);
          $box.find(".text").each(function() {
            $ratingDetails.append(this);
          });
        },
        { once: true }
      );
    })();
    (function showStats() {
      liveQuery(
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
            console.log("[showStats] initialized");
          } catch (err) {
            console.error("[aotified] moreStats failed", err);
            $box.addClass("error");
          }
        },
        { once: true }
      );
    })();
    (function wrapReleases() {
      liveQuery(
        ".anticipatedHome, .mobileScroll, #homeNewReleases, .section .mobileScroll",
        function() {
          const $root = $(this);
          const count = $root.find(".albumBlock").length;
          $root.addClass("releaseBlock").addClass(`count-${count}`);
        }
      );
      liveQuery(
        ".wideLeft",
        function() {
          const $root = $(this);
          if ($root.children(".releaseBlock").length) return;
          requestAnimationFrame(() => {
            const $albums = $root.children(".albumBlock");
            if (!$albums.length) return;
            $("<div>", { class: "releaseBlock large" }).insertBefore($albums.first()).append($albums);
          });
        },
        { once: true }
      );
      liveQuery(
        "#homeNewReleases .albumBlock, #albumOutput .albumBlock",
        function() {
          this.addClass("slim");
        }
      );
      liveQuery(".ratingRow", function() {
        if (this.children(".ratingTextWrapper").length) return;
        const $texts = this.children(".ratingText");
        if ($texts.length < 2) return;
        $("<div/>", { class: "ratingTextWrapper" }).append($texts).appendTo(this);
      });
      liveQuery("section", function() {
        if (this.find('.sectionHeading h2 a[href="/recently-added/"]').length) {
          this.attr("id", "recentlyAdded");
        }
      });
    })();
    (function addAotySortDropdown() {
      liveQuery(
        ".anticipatedHome",
        function() {
          const $root = $(this);
          if ($root.find(".filterRow").length) return;
          const $sort = $(`
          <div class="filterRow">
          <div class="menuDropFloatRight albumSort">
            <div class="menuDropText">
              Sort
            </div>
  
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
    })();
  };

  // src/core/artist.ts
  var Artist = async () => {
    const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];
    (function wrapArtist() {
      console.log("[aotified] wrapArtist: active");
      liveQuery(".fullWidth:has(.artistHeader)", function() {
        $(this).addClass("artist");
      });
      liveQuery(
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
    })();
    (function releaseContainer() {
      console.log("[aotified] releaseContainer: active");
      liveQuery(
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
    })();
    (function moveFilterRow() {
      console.log("[aotified] moveFilterRow: active");
      liveQuery(
        "#facetContent #toggleSearch",
        function() {
          const $filterRow = $(".artistContent > .filterRow.buttons");
          const $toggleSearch = $("#facetContent > #toggleSearch");
          if (!$filterRow.length || !$toggleSearch.length) return;
          $toggleSearch.after($filterRow);
        },
        { once: true }
      );
    })();
    (function createFooter() {
      liveQuery(
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
    })();
    (function relatedArtists() {
      liveQuery(".relatedArtists", function() {
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
    })();
    (function wrapRatings() {
      liveQuery(".artistCriticScoreBox, .artistUserScoreBox", function() {
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
      });
    })();
    (function colorRatings() {
      liveQuery(".ratingBlock, .ratingItem", function() {
        const $el = $(this);
        const $bar = $el.find(".ratingBar");
        if (!$bar.length) return;
        $el.removeClass("green yellow red");
        if ($bar.hasClass("green")) $el.addClass("green");
        else if ($bar.hasClass("yellow")) $el.addClass("yellow");
        else if ($bar.hasClass("red")) $el.addClass("red");
      });
    })();
    (function otherFixes() {
      liveQuery("#facets", function() {
        const $container = $(this);
        let $currentItem = null;
        $container.children().each(function() {
          const $el = $(this);
          if ($el.hasClass("center")) {
            $el.addClass("facetButton").removeClass("center");
          }
          if ($el.hasClass("facetItem")) return;
          if ($el.hasClass("facetTitle")) {
            $currentItem = $("<div>", { class: "facetItem" });
            $currentItem.insertBefore($container);
            $el.append($currentItem);
            return;
          }
          if ($currentItem && $el.hasClass("facet")) {
            $el.append($currentItem);
          }
        });
      });
      liveQuery(".artistFooter", function() {
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
    })();
  };

  // src/main.ts
  (async () => {
    (() => {
      const body = document.querySelector(`body`);
      body?.classList.add("aotified");
    })();
    await Artist();
    await Album();
    await Essential();
    console.log("[aotified] initialized");
  })();
})();
