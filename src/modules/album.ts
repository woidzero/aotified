/**
 * modules.album
 *
 * this is module for albums appearance and modifications.
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../dom/observer";

import { sort } from "../utils/sort";

export const Album = (): Module => {
  const module = new Module({
    name: "Albums",
    description: "Albums related settings.",
  });

  const ALBUM_ID = location.pathname.match(/album\/(\d+)-/)?.[1];
  if (ALBUM_ID) {
    $("#centerContent").addClass("album");
  }

  module.loadFeatures([
    new Feature({
      name: "Fix Ratings",
      description: "Fix album ratings appearance.",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(
          ".albumCriticScoreBox, .albumUserScoreBox",
          function () {
            const $box = $(this);

            // creating new elements
            const $ratingDetails = $("<div>", { class: "ratingDetails" });
            const $ratingValue = $("<div>", { class: "ratingValue" });

            $box.prepend($ratingDetails);
            $box.prepend($ratingValue);

            // unpack & remove trash
            const $aggregate = $box.children(
              'span[itemprop="aggregateRating"]'
            );
            const $spanRatingValue = $box.find(`span[itemprop="ratingValue"]`);
            $box.find(`#moreStatsLink`).remove();
            $box.find("meta").each(function () {
              $(this).remove();
            });

            $aggregate.unwrapSmart();
            $spanRatingValue.unwrapSmart();

            // move "user/critic score text"
            const $heading = $box.children(".heading");
            $ratingValue.append($heading);

            const $ratingItem = $box.children(
              ".albumCriticScore, .albumUserScore"
            );
            $ratingItem
              .addClass("ratingItem")
              .removeAttr("style")
              .removeClass("albumCriticScore albumUserScore");
            $ratingValue.append($ratingItem);

            // first element as album score
            let score: string = "NR";
            const $scoreEl = $ratingItem.children().first();
            $scoreEl.attr("id", "score");

            if ($scoreEl.prop("tagName") === "A") {
              const rawScore = Number($scoreEl.attr("title"));
              if (!isNaN(rawScore)) score = rawScore.toFixed(1);
            }
            $scoreEl.text(score);

            // move texts into ratingDetails
            $box.find(".text").each(function () {
              $ratingDetails.append(this);
            });
          },
          { once: false }
        );
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
      name: "Fix Albums",
      description: "Fix releases and wrap albums.",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(
          ".anticipatedHome, .mobileScroll, #homeNewReleases, .section .mobileScroll",
          function () {
            const $root = $(this);
            const count = $root.find(".albumBlock").length;
            $root.addClass("releaseBlock").addClass(`count-${count}`);
          }
        );

        Observer(
          ".wideLeft",
          function () {
            const $root = $(this);
            if ($root.children(".releaseBlock").length) return;

            requestAnimationFrame(() => {
              const $albums = $root.children(".albumBlock");
              if (!$albums.length) return;
              if ($root.find(".sectionHeading").length) return;

              $("<div>", { class: "releaseBlock large" })
                .insertBefore($albums.first())
                .append($albums);
            });
          },
          { once: true }
        );

        Observer(
          "#homeNewReleases .albumBlock, #albumOutput .albumBlock",
          function () {
            $(this).addClass("slim");
          }
        );

        Observer(".ratingRow", function () {
          if ($(this).children(".ratingTextWrapper").length) return;

          const $texts = $(this).children(".ratingText");
          if ($texts.length < 2) return;

          $("<div/>", { class: "ratingTextWrapper" })
            .append($texts)
            .appendTo(this);
        });

        Observer("section", function () {
          if (
            $(this).find('.sectionHeading h2 a[href="/recently-added/"]').length
          ) {
            $(this).attr("id", "recentlyAdded");
          }
        });
      },
    }),
    new Feature({
      name: "Advanced Sorting",
      description: "More album sorting.",
      default: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(
          ".anticipatedHome",
          function () {
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

            $sort.on("click", "li[data-sort]", function (e) {
              e.preventDefault();

              const $item = $(this);
              const type = $item.data("sort");

              $sort.find("li[data-sort]").removeClass("current");
              $item.addClass("current");
              $sort.find(".menuDropSelectedText").text($item.text());

              requestAnimationFrame(() => {
                $(".releaseBlock").each(function () {
                  sort(type, $(this));
                });
              });
            });

            $sort.insertAfter($root.find(".sectionHeading"));
          },
          { once: true }
        );
      },
    }),
  ]);

  return module;
};
