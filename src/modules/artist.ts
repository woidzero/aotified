/**
 * modules.artist
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../core/observer";

export const Artist = (): Module => {
  const module = new Module({
    name: "Artists",
    description: "Artists related settings.",
  });

  const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];
  if (!ARTIST_ID) {
    return module;
  }

  $("#centerContent").addClass("artist");

  module.loadFeatures([
    new Feature({
      name: "Fix Artist Header",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(
          ".artistHeader",
          function () {
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
      },
    }),

    new Feature({
      name: "Fix Album Output",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(
          "#albumOutput",
          function () {
            const $root = $(this);

            let $section: JQuery | null = null;
            let $header: JQuery | null = null;
            let $block: JQuery | null = null;

            $root.children().each(function () {
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
      },
    }),

    new Feature({
      name: "Move Filter Row",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer(
          "#facetContent #toggleSearch",
          function () {
            const $filterRow = $(".artistContent > .filterRow.buttons");
            const $toggleSearch = $("#facetContent > #toggleSearch");

            if (!$filterRow.length || !$toggleSearch.length) return;

            $toggleSearch.after($filterRow);
          },
          { once: true }
        );
      },
    }),

    new Feature({
      name: "Create footer",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer(
          ".fullWidth",
          function () {
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
      },
    }),

    new Feature({
      name: "Fix Related Artists",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer(".relatedArtists", function () {
          const $root = $(this);
          if ($root.children(".artistsBlock").length) return;

          const $artistBlocks = $root.find(".artistBlock");
          if (!$artistBlocks.length) return;

          const $artistsBlock = $("<div>", { class: "artistsBlock" });

          $artistBlocks.each(function () {
            $artistsBlock.append(this);
          });

          $root.append($artistsBlock);
        });
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
          ".artistCriticScoreBox, .artistUserScoreBox",
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
      name: "Color Ratings",
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
      name: "Other Fixes",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer("#facets", function () {
          const $container = $(this);
          let $currentItem: JQuery | null = null;

          $container.children().each(function () {
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

        Observer(".artistFooter", function () {
          const $footer = $(this);
          let hasLiveSection = false;

          $footer.children(".section").each(function () {
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
      },
    }),
  ]);

  return module;
};
