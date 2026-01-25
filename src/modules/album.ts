/**
 * modules.album
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../core/observer";

import { Overlay } from "../components/Overlay";
import { getYTID } from "../utils/utils";

export const Album = (): Module => {
  const mod = new Module({
    name: "Albums",
    description: "Album page related features.",
  });

  const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];

  if (ALBUM_ID) {
    mod.loadFeatures([
      new Feature({
        name: "Embedded Videos",
        description: "Shows embedded video if available",
        default: true,
        run: (ctx: FeatureContext) => {
          ctx.logger.log(`enabled`);

          let video_url: string | undefined;

          Observer(".album:has(.albumTopBox.cover.video)", function () {
            const $root = $(this);
            const $link = $root.find(
              ".albumLinksFlex a:has(.albumButton.youtube)"
            );
            video_url = $link.attr("href");

            if (video_url) {
              ctx.logger.log(`video: ${video_url}`);
              const videoId = getYTID(video_url);

              if (!videoId) {
                alert("Неверная YouTube ссылка");
                return;
              }

              const $iframe = $("<iframe>", {
                src: `https://www.youtube.com/embed/${videoId}`,
                frameborder: 0,
                allow:
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowfullscreen: true,
              });

              $root.find(".showImage").on("click", function (e) {
                e.preventDefault();
                e.stopPropagation();

                Overlay({
                  id: "AOTIFIED_videoEmbed",
                  heading: { label: "Video", icon: "camera" },
                  content: $iframe
                });
              });
            }
          });
        },
      }),

      new Feature({
        name: "More Stats",
        description: "Fix album page layout and ratings.",
        default: true,
        run: (ctx: FeatureContext) => {
          ctx.logger.log(`enabled`);

          Observer(
            "#moreStats",
            async function () {
              const $box = $(this);
              $box.html("<div class='loader'/>");

              try {
                const res = await fetch("/scripts/moreStatsAlbum.php", {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest",
                  },
                  body: `albumID=${ALBUM_ID}`,
                  credentials: "same-origin",
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
        },
      }),
    ]);
  }

  return mod;
};
