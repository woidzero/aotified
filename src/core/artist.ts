import { liveQuery } from "../utils/liveQuery";

export const Artist = async () => {
  // global consts
  const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];

  // wrap artist
  (function wrapArtist() {
    console.log("[aotified] wrapArtist: active");

    liveQuery(".fullWidth:has(.artistHeader)", function () {
      $(this).addClass("artist");
    });

    liveQuery(
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
  })();

  // releaseContainers
  (function releaseContainer() {
    console.log("[aotified] releaseContainer: active");

    liveQuery(
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
  })();

  // move filter row
  (function moveFilterRow() {
    console.log("[aotified] moveFilterRow: active");

    liveQuery(
      "#facetContent #toggleSearch",
      function () {
        const $filterRow = $(".artistContent > .filterRow.buttons");
        const $toggleSearch = $("#facetContent > #toggleSearch");

        if (!$filterRow.length || !$toggleSearch.length) return;

        $toggleSearch.after($filterRow);
      },
      { once: true }
    );
  })();

  // footer
  (function createFooter() {
    liveQuery(
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
  })();

  // related artits
  (function relatedArtists() {
    liveQuery(".relatedArtists", function () {
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
  })();

  // wrap ratings
  (function wrapRatings() {
    liveQuery(".artistCriticScoreBox, .artistUserScoreBox", function () {
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
    });
  })();

  // color ratings
  (function colorRatings() {
    liveQuery(".ratingBlock, .ratingItem", function () {
      const $el = $(this);
      const $bar = $el.find(".ratingBar");

      if (!$bar.length) return;

      $el.removeClass("green yellow red");

      if ($bar.hasClass("green")) $el.addClass("green");
      else if ($bar.hasClass("yellow")) $el.addClass("yellow");
      else if ($bar.hasClass("red")) $el.addClass("red");
    });
  })();

  // other fixes
  (function otherFixes() {
    liveQuery("#facets", function () {
      const $container = $(this);
      let $currentItem: JQuery | null = null;

      $container.children().each(function () {
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

    liveQuery(".artistFooter", function () {
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
  })();
};
