/**
 * modules.global
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../dom/observer";

export const Global = (): Module => {
  const module = new Module({
    name: "Globals",
    description: "Global website features such as seasonal elements.",
  });

  module.loadFeatures([
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
