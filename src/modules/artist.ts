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

  Observer(".facetContent", function () {
    const $root = $(this);
    console.debug("Observer triggered");

    const $albums = $root.children(".albumBlock");

    if ($albums.length) {
      let $albumOutput = $root.children("#albumOutput");

      if (!$albumOutput.length) {
        $albumOutput = $("<div id='albumOutput'></div>");
        $albums.first().before($albumOutput);
      }

      $albums.appendTo($albumOutput);
    }
  });

  Observer(
    "#albumOutput",
    function () {
      const $root = $(this);

      if (
        $root.children().length === 1 &&
        $root.children(".adTagWide").length === 1
      ) {
        $root.append("<div class='noResults'>No Releases</div>");
      }
    },
    { once: true }
  );

  Observer("#facetContent:has(> .subHeadline)", function () {
    const $root = $(this);
    const $releaseContainer = $("<div class='releaseContainer'></div>");

    const $releaseBlock = $root
      .children("#albumOutput")
      .addClass("releaseBlock")
      .removeAttr("id");

    const $releaseHeaderItems = $root.children(
      ".subHeadline, .listenRow.artist"
    );

    if ($releaseHeaderItems.length) {
      $releaseHeaderItems.wrapAll("<div class='releaseHeader'></div>");
    }

    const $releaseHeader = $root.children(".releaseHeader");

    if ($releaseBlock.length || $releaseHeader.length) {
      $releaseContainer.append($releaseHeader, $releaseBlock);
      $root.append($releaseContainer);
    }

    $releaseContainer.wrap("<div id='albumOutput'></div>");
  });

  Observer(
    "#facets",
    function () {
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
    },
    { once: true }
  );

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
  ]);

  return module;
};
