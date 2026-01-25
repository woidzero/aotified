import { Observer } from "../core/observer";
import { Logger } from "../core/logger";

import "./patcher";

const log = new Logger("aotified.bootstrap")

/* -------------------------
  DOM BOOTSTRAP
  runs before all the modules
------------------------- */
log.debug("initializing");

/* -------------------------
  globals
------------------------- */
const $body = $("body");
const $header = $("#header");
const $nav = $("#nav");
const $centerContent = $("#centerContent");
const $footer = $(".footer");
const $overlay = $(".overlay")

log.debug("elements found: ", [$body, $header, $nav, $centerContent, $footer, $overlay])

$header.changeTag("header");
$nav.changeTag("nav");

/* -------------------------
  dom cleaner
------------------------- */
$(".clear, .adSpacer, noscript").remove();
$("header, nav").wrapAll("<div class='pageTop'></div>");

Observer("body", function () {
  const $root = $(this)
  $root.addClass("aotified")
  $root.children("br").remove()

  $root.contents()
    .filter(function () {
      return this.nodeType === 8;
    })
    .remove();
}, { live: true })

/* -------------------------
  page context
------------------------- */
const path = location.pathname;

(function pageContext() {
  const rules: { regex: RegExp; className: string }[] = [
    { regex: /album\/\d+-/, className: "album" },
    { regex: /artist\/\d+-/, className: "artist" },
    { regex: /user\/\d+-/, className: "user" },
  ];

  rules.forEach(({ regex, className }) => {
    if (regex.test(path)) {
      $("#centerContent").addClass(className);
      log.debug(`page context: ${className}`);
    }
  });
})();

/* -------------------------
  footer unpack
------------------------- */
$footer.children(".footerContent").replaceClass("*", "footer")
$footer.unpack();

/* -------------------------
  remove score from rating texts
------------------------- */
Observer(".ratingText", function () {
  $(this).text(function (_, text) {
    return text.replace(" score", "");
  });
});

/* -------------------------
  album output no results
------------------------- */
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

/* -------------------------
  facets fixes
------------------------- */
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

/* -------------------------
  hero normalization
------------------------- */
$("#centerContent.album .fullWidth").replaceClass("*", "albumHeader")

$(".artistHeader, .albumHeader").each(function () {
  const $root = $(this);
  const $infoBox = $root.find(".artistTopBox.info, .albumTopBox.info");

  if ($infoBox.length) {
    const $detailBlock = $("<div class='detailsBlock'>");
    const $detailRow = $infoBox.children(".detailRow");
    $detailRow.wrapAll($detailBlock);

    const $tagBlock = $("<div class='tagBlock'>");
    $infoBox
      .find(".detailRow")
      .filter(function () {
        return $(this).text().trim() === "Tags";
      })
      .remove();

    $infoBox.children(".tag").wrapAll($tagBlock);
  }

  if ($root.is(".artistHeader")) {
    $root.attr("id", "artist");

    const $headline = $root.children(".artistHeadline").replaceClass("*", "Hero_headline");
    const $imageBox = $root.children(".artistImage");
    const $topBox = $root.children(".artistTopBox").not(".info").addClass("ratings");
    const $infoBox = $root.children(".artistTopBox.info");

    const $artistCover = $("<div class='Hero__cover'>");
    const $artistDetails = $("<div class='Hero__details'>");
    const $artistBoxes = $("<div class='Hero__boxes'>");

    $imageBox.appendTo($artistCover);
    $artistBoxes.append($topBox, $infoBox);
    $artistDetails.append($headline, $artistBoxes);

    $root.empty().append(
      $artistCover,
      $artistDetails
    );
  } else if ($root.is(".albumHeader")) {
    $root.attr("id", "album");

    const $albumCover = $root.children(".albumTopBox.cover");
    const $albumBoxInfo = $root.children(".albumTopBox.info");
    const $albumBoxRating = $albumCover.next(".albumTopBox").addClass("ratings");

    const $albumHeadline = $root.children(".albumHeadline").replaceClass("*", "Hero__headline");

    const $albumDetails = $("<div class='Hero__details'>");
    const $albumBoxes = $("<div class='Hero__boxes'>");

    const $selectRow = $root.children(".selectRow");
    const $wideLeft = $root.parent().find(".wideLeft");
    const $linksSection = $("<div class='section' id='links'></div>");
    $wideLeft.children(".thirdPartyLinks").prependTo($linksSection)
    $linksSection.prepend($selectRow);
    $linksSection.prependTo($wideLeft)

    $albumBoxes.append($albumBoxRating, $albumBoxInfo);
    $albumCover.wrap("<div class='Hero__cover'>");
    $albumDetails.append($albumHeadline, $albumBoxes);

    $root.append($albumDetails);
  }

  $root.replaceClass("*", "Hero");
})

// @ts-ignore
$(".albumButton").contents().filter(function () {
  // @ts-ignore
  return this.nodeType === 3 && this.textContent.trim();
}).wrap("<span></span>");

Observer(".yourRatingContainer .content", function () {
  const $root = $(this);
  const $userButtons = $root.children(`div[style="float:right;"]`).addClass("userAreaButtons").removeAttr("style")
  const $ratingTextBoxContainer = $root.children(`.ratingTextBoxContainer`);

  $userButtons
    .add($ratingTextBoxContainer)
    .wrapAll("<div class='userArea'></div>");

  $ratingTextBoxContainer.children("#ratingContainer").unpack();
  $ratingTextBoxContainer.unpack();
  $root.unpack()
}, { live: true })

Observer(".yourRatingContainer", function () {
  const $root = $(this);

  const $userArea = $root.children(".userArea")

  const $currentRatingBlock = $userArea.children("#currentRatingBlock")
  const $ratingBlock = $userArea.children("#ratingBlock");

  const $userRating = $("<div class='userRating'></div>")

  $userRating.append($currentRatingBlock, $ratingBlock)
  $userArea.prepend($userRating)

  if ($currentRatingBlock.length) {
    $ratingBlock.hide();
  }
})

/* -------------------------
  headings patch
------------------------- */
Observer(".section", function () {
  const $section = $(this);

  $section.children(".sectionHeading").each(function () {
    $(this)
      .children("i, h2, .viewAll, a")
      .wrapAll("<hgroup></hgroup>");
  });

  $section.find(".menuDropFloatRight").each(function () {
    const $menu = $(this);

    const $headings = $section.children(".sectionHeading");
    // @ts-ignore
    const $headingsAbove = $headings.filter(function () {
      return this.compareDocumentPosition($menu[0]) & Node.DOCUMENT_POSITION_FOLLOWING;
    });

    if (!$headingsAbove.length) return;

    const $menuClone = $menu.clone(true, true);
    log.debug($menuClone)

    $headingsAbove.last().append($menuClone);

    // $menu.remove();
    $menu.hide();
    log.debug($menu)
  });
});

$("#sortDrop li").each(function () {
  const $li = $(this);

  if ($li.find("button.criticSort").length === 0) {
    const text = $li.text().trim();

    const $btn = $(`<button class='criticSort' year='2026' albumid='1537608' sort='highest'>${text}</button>`, {
      disabled: $li.hasClass("current")
    });

    $li.empty().append($btn);
  }
});

/* -------------------------
  dot drop menu patch
------------------------- */
import type { Instance as PopperInstance } from '@popperjs/core';
import { createPopper } from '@popperjs/core';

let $activeMenu: JQuery<HTMLElement> | null = null;
let activePopper: PopperInstance | null = null;

function closeMenu() {
  if (!$activeMenu) return;

  $activeMenu.removeClass("active");
  if (activePopper) {
    activePopper.destroy();
    activePopper = null;
  }

  $activeMenu = null;
}

$(".dotDropMenuContainer, .menuDropSelected").each(function () {
  const $root = $(this);

  if ($root.data("aotified")) return;
  $root.data("aotified", true);

  const isSortMenu = $root.hasClass("menuDropSelected");

  $root.on("click mouseenter mouseleave", function (e) {
    // prevent hovering (useless)
    e.preventDefault();
    e.stopImmediatePropagation();
  });

  const $btn = isSortMenu
    ? $root.children(".menuDropSelectedText")
    : $root.children(".dotDropMenuButton > button, .dotDropMenuButton, button").first();

  const $menu = $root.find(".dotDropDown, ul").first();
  if (isSortMenu) $menu.addClass("dotDropDown")

  $menu.children().each(function () {
    const $row = $(this);
    if ($row.hasClass("row")) {
      $row.changeTag("li");
      $row.removeAttr("class");
    }
  })

  if (!$btn.length || !$menu.length) return;

  $btn.on("click", function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if ($activeMenu && $activeMenu[0] === $menu[0]) {
      closeMenu();
      return;
    }

    closeMenu();

    $menu.addClass("active");

    activePopper = createPopper($btn[0], $menu[0], {
      placement: 'bottom-end',
      modifiers: [
        { name: 'offset', options: { offset: [0, 6] } },
        { name: 'flip', options: { fallbackPlacements: ['top-end'] } },
        { name: 'preventOverflow', options: { padding: 8 } },
      ],
    });

    $activeMenu = $menu;
  });

  $menu.on("click", e => e.stopPropagation());
});

$(document).on("click", closeMenu);
$(document).on("keydown", e => { if (e.key === "Escape") closeMenu(); });

/* -------------------------
  icons instead of text
------------------------- */
Observer(".viewAll", function () {
  const $root = $(this);
  const $a = $root.children("a")

  if ($a.text().startsWith("Add")) {
    $a.empty();
    $a.append($("<i class='fas fa-plus'></i>"));
  }
})

/* -------------------------
  artist page
------------------------- */
$("#centerContent.artist").each(function () {
  const $fullWidth = $(".fullWidth").first();
  const $header = $fullWidth.children(".Hero");

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
});

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

Observer(
  "#facetContent #toggleSearch",
  function () {
    const $filterRow = $(".artistContent > .filterRow.buttons");
    const $toggleSearch = $("#facetContent > #toggleSearch");

    if (!$filterRow.length || !$toggleSearch.length) return;

    $toggleSearch.after($filterRow);
  },
  { once: true }
);

Observer(
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


Observer(".relatedArtists", function () {
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

/* -------------------------
  album wrapping
------------------------- */
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

Observer(
  ".albumCriticScoreBox, .albumUserScoreBox, .artistUserScoreBox, .artistCriticScoreBox",
  function () {
    const $box = $(this);
    if ($box.children(".ratingValue").length) return;

    // wrappers
    const $ratingDetails = $("<div class='ratingDetails'>");
    const $ratingValue = $("<div class='ratingValue'>");

    // move details FIRST (sibling)
    $ratingDetails.prepend($box.children(".text"));
    $box.prepend($ratingDetails);
    $box.prepend($ratingValue);

    // heading
    $ratingValue.append($box.children(".heading"));

    // removing
    $box.find(`[itemprop="aggregateRating"]`).unpack();

    // score block
    const $ratingItem = $box.children(
      ".albumCriticScore, .albumUserScore, .artistUserScore, .artistCriticScore"
    );

    $ratingItem
      .addClass("ratingItem")
      .removeAttr("style")
      .removeClass("albumCriticScore albumUserScore artistUserScore artistCriticScore");

    // extract score
    let score = "NR";

    const $rv = $ratingItem.find('[itemprop="ratingValue"]');
    const $rawScore = $rv.find(`a[href="#users"]`)

    if ($rawScore.length) {
      score = String($rawScore.attr('title'))
    } else {
      if ($rv.length) {
        score = $rv.text().trim();
      } else {
        const raw = $ratingItem.text().trim();
        if (!isNaN(Number(raw))) score = raw;
      }
    }

    log.debug(score)
    $rv.remove();

    // cleanup inner
    $box.find("meta, #moreStatsLink").remove();
    $ratingItem.children("a[href='#users'], a[href='#critics']").remove();

    // remove floating text nodes
    $ratingItem
      .contents()
      .filter((_, node) => node.nodeType === Node.TEXT_NODE)
      .remove();

    // build final ratingItem
    const $score = $("<div>", { id: "score", text: score });
    const $bar = $box.children(".ratingBar");

    $ratingItem.prepend($score);
    $ratingItem.append($bar);

    $ratingValue.append($ratingItem);

    // inner texts patches
    $box.find(".text").each(function () {
      const $text = $(this);

      function findNode(predicate: (node: Text) => boolean) {
        // @ts-ignore
        return $text.contents().filter(function () {
          return (
            this.nodeType === 3 &&
            this.nodeValue &&
            predicate(this as Text)
          );
        });
      }

      // "2015 / All Time" rating (only for user score box)
      if ($text.hasClass("gray") && $box.hasClass("albumUserScoreBox")) {
        $text.replaceClass("gray", "rows")

        // @ts-ignore
        const firstText = findNode(node => node.nodeValue!.trim()).first();
        const firstStrong = $text.children("strong").first();

        if (firstText.length && firstStrong.length) {
          firstText.add(firstStrong).wrapAll("<span></span>");
        }

        const $inner = $text.children("span[style]");
        $inner.removeAttr("style");
      }

      $ratingDetails.append($text);
    });
  },
  { live: true }
);

$(".ratingDetails .text").each(function () {
  const $textDiv = $(this);

  let html = $textDiv.html().replace(/\u00A0/g, ' ');
  const match = html.match(/^(Based on)\s*(.*)$/);

  if (match) {
    const part1 = match[1];
    const part2 = match[2];

    $textDiv.addClass("numReviews")
    $textDiv.html(`<span>${part1}</span> <b>${part2}</b>`);
  }
});

$(".numReviews").each(function () {
  const $textDiv = $(this);
  const $parent = $textDiv.parent();

  $parent.prepend($textDiv);
});

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
}, { live: true });

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

log.debug("initialized");