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

      new Feature({
        name: "Sort Tracklist",
        description: "Sort tracklist by date, comments, saved.",
        default: true,
        run: (ctx: FeatureContext) => {
          ctx.logger.log(`enabled`);

          $(".rightBox.trackList").each(function () {
            /**
             * example tracklist
             * 
             * <table class="trackListTable"><tr><td class="trackNumber">3</td><td class="trackTitle"><a href="/song/285224-chihiro/" style="font-weight: bold;">CHIHIRO</a><div class="length">5:03</div></td><td class="trackRating"><span class="green-font" title="4949 Ratings">91</span></td></tr><tr><td class="trackNumber">4</td><td class="trackTitle"><a href="/song/285225-birds-of-a-feather/" style="font-weight: bold;">BIRDS OF A FEATHER</a><div class="length">3:30</div></td><td class="trackRating"><span class="green-font" title="4944 Ratings">90</span></td></tr><tr><td class="trackNumber">5</td><td class="trackTitle"><a href="/song/285226-wildflower/">WILDFLOWER</a><div class="length">4:21</div></td><td class="trackRating"><span class="green-font" title="4766 Ratings">88</span></td></tr><tr><td class="trackNumber">6</td><td class="trackTitle"><a href="/song/285227-the-greatest/">THE GREATEST</a><div class="length">4:53</div></td><td class="trackRating"><span class="green-font" title="4786 Ratings">88</span></td></tr><tr><td class="trackNumber">10</td><td class="trackTitle"><a href="/song/285231-blue/">BLUE</a><div class="length">5:43</div></td><td class="trackRating"><span class="green-font" title="4706 Ratings">88</span></td></tr><tr><td class="trackNumber">1</td><td class="trackTitle"><a href="/song/285222-skinny/">SKINNY</a><div class="length">3:39</div></td><td class="trackRating"><span class="green-font" title="4817 Ratings">85</span></td></tr><tr><td class="trackNumber">7</td><td class="trackTitle"><a href="/song/285228-lamour-de-ma-vie/">L'AMOUR DE MA VIE</a><div class="length">5:33</div></td><td class="trackRating"><span class="green-font" title="4739 Ratings">85</span></td></tr><tr><td class="trackNumber">2</td><td class="trackTitle"><a href="/song/285223-lunch/">LUNCH</a><div class="length">2:59</div></td><td class="trackRating"><span class="green-font" title="4895 Ratings">84</span></td></tr><tr><td class="trackNumber">9</td><td class="trackTitle"><a href="/song/285230-bittersuite/">BITTERSUITE</a><div class="length">4:58</div></td><td class="trackRating"><span class="green-font" title="4642 Ratings">81</span></td></tr><tr><td class="trackNumber">8</td><td class="trackTitle"><a href="/song/285229-the-diner/">THE DINER</a><div class="length">3:06</div></td><td class="trackRating"><span class="green-font" title="4682 Ratings">78</span></td></tr></table>
             *
             * features: sort by track number, track rating, track title
            */
            const $root = $("#tracklist");
            if (!$root.length) return;

            const $table = $root.find(".trackListTable tbody");
            if (!$table.length) return;

            // сохраняем оригинальный порядок
            const original = $table.find("tr").toArray();

            const $container = $("<div class='aotified-ui sorting'><span>Sorting by: </span> <button class='button'>number</button></div>")
            
            $root.find(".sectionHeading").after($container);
            const $btn = $container.children(".button")

            let mode = 0;

            // 0 — rating
            // 1 — title
            // 2 — number (original)
            function getRating(tr: HTMLElement) {
              return parseFloat(
                $(tr).find(".trackRating span").text().trim()
              ) || 0;
            }

            function getTitle(tr: HTMLElement) {
              return $(tr)
                .find(".trackTitle a")
                .text()
                .trim()
                .toLowerCase();
            }

            $btn.on("click", function () {
              const rows = $table.find("tr").toArray();

              if (mode === 0) {
                rows.sort((a, b) => getRating(b) - getRating(a));
                $btn.text("rating");
              } else if (mode === 1) {
                rows.sort((a, b) =>
                  getTitle(a).localeCompare(getTitle(b))
                );
                $btn.text("title");
              } else {
                $table.append(original);
                $btn.text("number");
                mode = 0;
                return;
              }

              $table.append(rows);
              mode++;

            });
          });
        },
      }),
    ]);
  }

  return mod;
};

export default Album;
