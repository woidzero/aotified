import { liveQuery } from "../utils/liveQuery";

export const Essential = async () => { 
  // image upgrade
  (function upgradeImages() {
    console.log("[aotified] upgradeImages: active");

    liveQuery("img", function () {
      const $img = this;

      if ($img.data("upgraded")) return;
      $img.data("upgraded", true);

      const SIZE = "500";
      const src = $img.attr("src");
      if (!src) return;

      // already upgraded or not matching pattern
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

  // logo
  (function addLogo() {
    if ($("#GOT_AOTIFIED").length) return;

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
  })();

  // load font
  (function globalFont() {
    if ($("#aotified-inter-font").length) return;

    $("<link>", {
      id: "aotified-inter-font",
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    }).appendTo("head");
  })();

  // global font styles
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
      `,
    }).appendTo("head");
  })();

  // snow :)
  (function addSnow() {
    if ($("#aotified-snow").length) return;

    const $canvas = $("<canvas>", { id: "aotified-snow" }).css({
      position: "fixed",
      top: 0,
      left: 0,
      pointerEvents: "none",
      zIndex: 9999,
    });

    $("body").append($canvas);

    const canvas = $canvas[0] as HTMLCanvasElement;
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

  // fix dropdown cutting
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

    liveQuery(".menuDropSelected", function () {
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
  })();
};
