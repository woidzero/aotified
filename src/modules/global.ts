/**
 * modules.global
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../core/observer";

export const Global = (): Module => {
  const module = new Module({
    name: "Globals",
    description: "Global website features such as seasonal elements.",
  });

  module.loadFeatures([
    new Feature({
      name: "Aotified",
      description: "root",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer("body > span, body", function () {
          const $root = $(this);
          if ($root.prop("tagName") === "SPAN") $root.unpack();
        });
        
        Observer("body", function () {
          const $root = $(this);

          $root.children("#header").changeTag("header");
          $root.children("#nav").changeTag("nav");
          const $top = $root.children("header, nav");
        
          if ($top.parent(".pageTop").length === 0 && $top.length) {
            $top.wrapAll("<div class='pageTop'></div>");
          }
        });

        Observer(".ratingText", function () {
          $(this).text(function (_, text) {
            return text.replace(" score", "");
          });
        });

        Observer(".overlay", function () {
          $(this).prependTo("body");
        })

        Observer(".overlay > .content", function () {
          const $content = $(this);
        
          let $header = $content.children("header");
          if (!$header.length) {
            $header = $("<header></header>");
            $content.prepend($header);
          }
        
          const $headerElements = $content.find(".close, .subHeadline, .heading");
        
          $headerElements.each(function () {
            $(this).appendTo($header);
          });
        
          const $section = $content.children("section");
          if (!$section.length) {
            $content.children().not("header").wrapAll("<section></section>");
            $content.find(".center").unpack()
          }
        
          $content.removeAttr("style");
          $content.find("br, .clear").remove()
        
          ctx.logger.info($content);
        }, { once: false });
        
        Observer(".ratingRowContainer", function() {
          const $root = $(this); 
          
          if ($root.find(".icon").length) {
            $root.addClass("user")

            const $ratingRow = $(this).find(".ratingRow")
            $ratingRow.find("span:has(> .deleteRatingBlock)").remove()

            const $message = $root.children("div[id^='message']")

            if($message) {
              $message.unpack();
              $root.find("div[id^='deleteRating']").unpack()
              $root.find("div[id^='insertRating']").remove()
            }
            
            const $ratingIcons = $("<div class='ratingIcons'>")
            $ratingRow.find("a:has(.icon)").appendTo($ratingIcons)
            $root.append($ratingIcons);
          }
        })
      },
    }),

    new Feature({
      name: "Wrap Ratings",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer(
          ".artistCriticScoreBox, .artistUserScoreBox, .albumCriticScoreBox, .albumUserScoreBox",
          function () {
            const $root = $(this);

            let $ratingItem = $root.children(".ratingItem");

            const $score = $root.children(".artistCriticScore").first().length
              ? $root.children(".artistCriticScore")
              : $root.children(".artistUserScore");

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
      },
    }),

    new Feature({
      name: "Colorize Ratings",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer(".ratingBlock, .ratingItem", function () {
          const $el = $(this);
          const $bar = $el.find(".ratingBar");

          if (!$bar.length) return;

          $el.removeClass("green yellow red");

          if ($bar.hasClass("green")) $el.addClass("green");
          else if ($bar.hasClass("yellow")) $el.addClass("yellow");
          else if ($bar.hasClass("red")) $el.addClass("red");
        });
      },
    }),

    new Feature({
      name: "Show Logo",
      description: "Show [aotified] logo near AOTY logo.",
      default: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        $(`body`).addClass("aotified");

        $(".logoHead").append(
          $("<div>", {
            id: "GOT_AOTIFIED",
            text: "[aotified]",
            css: {
              color: "gray",
              marginLeft: "5px",
            },
          })
        );
      },
    }),

    new Feature({
      name: "Global Font",
      description: "Global font styles.",
      default: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        $("<link>", {
          id: "aotified-inter-font",
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
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
          `,
        }).appendTo("head");
      },
    }),

    new Feature({
      name: "Seasonal",
      description: "Enable seasonal appearance such as snow.",
      default: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        const $canvas = $("<canvas>", { id: "aotified-snow" }).css({
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 9999,
        });

        $("body").append($canvas);

        const canvas = $canvas[0] as HTMLCanvasElement;
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
          d: Math.random() * 0.6 + 0.2,
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
      },
    }),
    new Feature({
      name: "Dropdown Rework",
      description: "Global dropdown rework.",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
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

        return Observer(".menuDropSelected", function () {
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
              display: "block",
            });
          }

          function closeMenu() {
            $menu.hide();
            $(document).off("click." + id);
          }

          $button.on("click", function (e) {
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

          $menu.on("click", "li", function (e) {
            e.stopPropagation();
            closeMenu();
          });

          $(window).on("resize", () => {
            if ($menu.is(":visible")) positionMenu();
          });
        });
      },
    }),
  ]);

  return module;
};
