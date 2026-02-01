import { Observer } from "../core/observer";
import { Logger } from "../core/logger";

import { Hook } from "../core/hook";

import "./patcher";

import type { Instance as PopperInstance } from '@popperjs/core';
import { createPopper } from '@popperjs/core';

import { SectionHeading } from "../components/SectionHeading";
import { Overlay } from "../components/Overlay";

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
const $footerButtons = $('.footerButtons');
const $overlay = $(".overlay")

log.debug("elements found: ", [$body, $header, $nav, $centerContent, $footer, $overlay])

/* -------------------------
dom cleaner
------------------------- */
$header.changeTag("header");
$nav.changeTag("nav");
$(".clear, .adSpacer, noscript").remove();
$("header#header, nav#nav").wrapAll("<div class='pageTop'></div>");

$("body").each(function () {
  const $root = $(this)
  $root.addClass("aotified")

  $footer
    .add($footerButtons)
    .wrapAll("<footer></footer>")

  $($centerContent).wrapAll("<main></main>")
})

Observer("body", function () {
  const $root = $(this)
  $root.children("br").remove()
}, { live: true })

/**
 * overlay patch
 */
Observer(".overlay", function () {
  const $inner = $(this).find("div.content div.inner")
  $inner.unpack();
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

    const $albumCover = $root.children(".albumTopBox.cover, .albumHeaderCover");
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

  $root.find("br").remove();
  $root.replaceClass("*", "Hero");
})

/**
 * controlsGroup wrapping
 */
$("div:has(> .selectRow ~ .headline ~ .filterRow), div:has(> .selectRow ~ .filterRow)").each(function () {
  const $root = $(this);

  const $selectRow = $root.children(".selectRow");
  const $filterRow = $root.children(".filterRow");
  const $headline = $root.children(".headline");

  const $wrapper = $('<div class="controlsGroup"></div>');

  if ($headline.length) {
    $headline.after($wrapper);
    $wrapper.append($selectRow, $filterRow);
  } else {
    $selectRow
      .add($filterRow)
      .wrapAll($wrapper)
  }
});

// @ts-ignore
$(".albumButton").contents().filter(function () {
  // @ts-ignore
  return this.nodeType === 3 && this.textContent.trim();
}).wrap("<span></span>");

Observer(".yourRatingContainer .content", function () {
  const $root = $(this);
  const $ratingTextBoxContainer = $root.children(`.ratingTextBoxContainer`);
  const $albumActions = $root.children(".albumActions")

  $albumActions
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

/**
 * wrap notification rows
 */
$(".notificationRow",).each(function () {
  const $row = $(this)
  let $block = $(".aotified-group.vertical")

  if (!$block.length) {
    $block = $("<div class='aotified-group vertical'></div>")
    $block.appendTo($row.parent())
  }

  $row.appendTo($block)
})

/**
 * wrap log rows
 */
$(".logRow").each(function () {
  const $rows = $(".logRow");
  if (!$rows.length) return;

  let $block = $(".aotified-group.vertical");

  if (!$block.length) {
    $block = $("<div class='aotified-group vertical'></div>");
    $block.insertBefore($rows.first());
  }

  $rows.appendTo($block);
})

/**
 * wrap log rows
 */
$(".thisDay").each(function () {
  const $row = $(this)
  let $block = $(".aotified-group")

  if (!$block.length) {
    $block = $("<div class='aotified-group'></div>")
    $block.appendTo($row.parent())
  }

  $row.appendTo($block)
})

/**
 * wrap log rows
 */
$(".userBlock").each(function () {
  const $row = $(this)
  let $block = $(".aotified-group#users")

  if (!$block.length) {
    $block = $("<div class='aotified-group grid grid-5x2 gap-10' id='users'></div>")
    $block.appendTo($row.parent())
  }

  $row.appendTo($block)
})

/**
 * removing styles from full width
 */
$(".fullWidth").removeAttr("style")

/**
 * mini navs wrapper
 */
$(".fullWidth").has(".profileAccount, .profileNav.small").replaceClass("*", "userNav");

/**
 * bottom squares panels
 */
$(".left").has(".fullWidth.bottomSquare").replaceClass("*", "aotified-panels");

/**
 * bottom squares wrapper
 */
$(".flexContainer").has(".fullWidth.bestHome, .fullWidth.anticipatedHome").replaceClass("*", "aotified-panels aotified-collections");

$(".aotified-collections .fullWidth").each(function () {
  const $root = $(this);

  if ($root.is(".anticipatedHome")) {
    $root.replaceClass("*", "aotified-panel").attr('id', "anticipated")
    $root.children(".albumBlock").wrapAll("<div class='releaseBlock'></div>")
  } else if ($root.is(".bestHome")) {
    $root.replaceClass("*", "aotified-panel").attr('id', "best")
    $root.children(".listItemSmall").replaceClass("*", "item").wrapAll("<div class='itemList small'></div>")
  }

  $root.addClass("aotified-panel")
})

/**
 * headings wrapper
 */
$(".sectionHeading").each(function () {
  $(this)
    .contents()
    .filter(function () {
      // @ts-ignore
      return (this.nodeType === 1 && /^(I|H1|H2|A)$/i.test(this.tagName)) ||
        // @ts-ignore
        (this.nodeType === 3 && this.nodeValue.trim() !== "");
    })
    .wrapAll("<hgroup></hgroup>");
});

/**
 * rice's addon is incompatible + useless i will make my own
 */
Observer(".sorttracklist", function () {
  $(this).remove()
}, { live: true });

Observer(".section", function () {
  const $section = $(this);

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

    $menu.hide();
    log.debug($menu)
  });
});

/**
 * donorbanner wrapper
 */
$("a").has(".donorBanner").unpack();
$(".rightBox.donorBanner").on("click", function () {
  window.location.href = "/subscribe/"
})

/**
 * sort drop patch
 */
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

/**
 * user dropdown
 */
Observer("#accountLinks", function () {

})

/**
 * section group
 */
$(".sectionButton").wrapAll("<div class='aotified-group center'></div>")

/**
 * news group
 */
$(".newsBlockLarge").wrapAll("<div class='aotified-group grid grid-3x2'></div>")

/**
 * bottom groups
 */
$(".bottomSquare").each(function () {
  $(this).children(".listItem").replaceClass("*", "aotified-list-item").wrapAll("<div class='aotified-list'></div>")
})

/**
 * user review
 */
$(".popularHome .userReviewBlock").wrapAll("<div class='aotified-group no-wrap'></div>")

$(".userReviewBlock").each(function () {
  const $root = $(this);
  $root.addClass("aotified-review container")
  $root.attr("id", "user")

  const $cover = $root.children(".cover");
  const $title = $root.find("a:has(.artistTitle)");

  const $reviewHeader = $("<div class='aotified-review header'></div>");
  $reviewHeader.append($cover, $title)

  const $userName = $root.children(".userName")
  $userName.replaceClass("*", "aotified-label username small")

  const $profilePic = $root.children(".profilePic")
  $profilePic.replaceClass("*", "aotified-image pfp small")

  const $ratingBlock = $root.children(".ratingBlock")
  $ratingBlock.replaceClass("*", "aotified-rating box small")

  // const $userProfile = $("<div class='aotified-review profile'></div>")
  const $userHeader = $("<div class='aotified-review header user'></div>")

  $userHeader.append($profilePic, $userName, $ratingBlock)
  $root.prepend($reviewHeader, $userHeader)

  const $reviewText = $root.children(".reviewText")
  $reviewText.replaceClass("*", "aotified-review text small")

  const $actionBlock = $reviewText.next("div")
  $actionBlock.addClass('aotified-review actions box').removeAttr("style")

  $actionBlock.children(".actionContainer").each(function () {
    $(this).replaceClass("*", "aotified-review actions item")
  })

  $actionBlock
    .add($reviewText)
    .wrapAll("<div class='aotified-review body'></div>")

  $root.removeClass("userReviewBlock")
})

/**
 * search form
 */
Observer(".aotified-search-panel", function () {
  const $root = $(this)
  const $searchForm = $root.find(".searchForm")
  $searchForm.removeClass("halfWidth large")

  const $results = $root.children("#albumResults")
  $results.addClass("releaseContainer small")
  $results.appendTo($root)

  const $div = $searchForm.children("div:last")

  const $sectionHeading = $("<div class='sectionHeading'></div>")
  const $label = $searchForm.children("label")
  $label
    .changeTag("h2")
    .text("Search (Apple Music)")
    .appendTo($sectionHeading)

  $sectionHeading.prependTo($root)

  $div.unpack()
  $root.append($searchForm)
})

/**
 * dropdowns
 */
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

/**
 * icons instead of text in view all buttons
 */
Observer(".viewAll", function () {
  const $root = $(this);
  const $a = $root.children("a")

  if ($a.text().startsWith("Add")) {
    $a.empty()
      .append($("<i class='fas fa-plus'></i>"));

    $root.unpack()
  }
})

/**
 * artist page
 */
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

/**
 * album outputs
 */
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

/**
 * artist footer maker
 */
$(".artist .fullWidth").each(function () {
  const $root = $(this);
  const $mediaList = $root.find(".section.mediaList");
  const $relatedArtists = $root.find(".section.relatedArtists");

  const $footer = $("<div>", { class: "aotified-panels" });

  if ($mediaList.length) $footer.append($mediaList);
  if ($relatedArtists.length) $footer.append($relatedArtists);

  $root.append($footer);
});

/**
 * related artists wrapper
 */
$(".relatedArtists").each(function () {
  const $root = $(this);

  const $artistBlocks = $root.find(".artistBlock");
  if (!$artistBlocks.length) return;

  const $group = $("<div class='aotified-group grid grid-5x2'>");

  $artistBlocks.each(function () {
    $group.append(this);
  });

  $root.append($group);
});

/**
 * releaseBlock maker
 */
Observer(
  ".anticipatedHome, .mobileScroll, #homeNewReleases, .section .mobileScroll",
  function () {
    const $root = $(this);
    const count = $root.find(".albumBlock").length;

    // removing if count is 0
    if (!count) {
      $root.remove()
      return;
    }

    $root.addClass("releaseBlock").addClass(`count-${count}`);
  }
);

Observer(
  ".wideLeft",
  function () {
    const $root = $(this);
    $root.removeAttr("style")

    if ($root.children(".releaseBlock").length) return;

    requestAnimationFrame(() => {
      const $albums = $root.children(".albumBlock");
      if (!$albums.length) return;
      if ($root.find(".sectionHeading").length) return;

      $("<div>", { class: "releaseBlock large" })
        .insertBefore($albums.first())
        .append($albums);
    });
  }
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

/**
 * album & artist score boxes
 */
Observer(
  ".albumCriticScoreBox, .albumUserScoreBox, .artistUserScoreBox, .artistCriticScoreBox",
  function () {
    const $box = $(this);
    if ($box.children(".ratingValue").length) return;

    const $ratingDetails = $("<div class='ratingDetails'>");
    const $ratingValue = $("<div class='ratingValue'>");

    $ratingDetails.prepend($box.children(".text"));
    $box.prepend($ratingDetails);
    $box.prepend($ratingValue);

    $ratingValue.append($box.children(".heading"));

    $box.find(`[itemprop="aggregateRating"]`).unpack();

    const $ratingItem = $box.children(
      ".albumCriticScore, .albumUserScore, .artistUserScore, .artistCriticScore"
    );

    $ratingItem
      .addClass("ratingItem")
      .removeAttr("style")
      .removeClass("albumCriticScore albumUserScore artistUserScore artistCriticScore");

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

    $box.find("meta, #moreStatsLink").remove();
    $ratingItem.children("a[href='#users'], a[href='#critics']").remove();

    $ratingItem
      .contents()
      .filter((_, node) => node.nodeType === Node.TEXT_NODE)
      .remove();

    const $score = $("<div>", { id: "score", text: score });
    const $bar = $box.children(".ratingBar");

    $ratingItem.prepend($score);
    $ratingItem.append($bar);

    $ratingValue.append($ratingItem);

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
    .addClass("aotified-releases")
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

/**
 * check for empty sections
 */
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

/**
 * albumTitle split
 */
$(".albumTitle > a").each(function () {
  const $a = $(this);

  const text = $a.text().replace(/\s+/g, " ").trim();
  if (!text) return;

  const match = text.match(/^(.+?)\s+[–—-]\s+(.+)$/);

  if (!match) return;

  const artist = match[1].trim();
  const title = match[2].trim();

  if (!artist || !title) return;

  $a.empty().append(
    $("<span>", { class: "aotified-label artist", text: artist }),
    $("<span>", { class: "aotified-label title", text: title })
  );
});

/**
 * user review navigation
 */
$(".rightBox").has(".nextAlbumReview, .prevAlbumReview").each(function () {
  const $nav = $("<nav class='aotified-review nav'>");
  $(this).children("a").wrapAll($nav)

  const $prev = $(".prevAlbumReview")
  $prev.replaceClass("*", "aotified-review nav item prev")
  const $next = $(".nextAlbumReview")
  $next.replaceClass("*", "aotified-review nav item next")
});

/***
 * HOOKS
 ***/

/**
 * corrections hook
 */
Hook("/album/corrections.php", function () {
  $("#correctionPage").unpack();
  $("#centerContent").addClass("correction")
  $(".section .section:not(#credits)").replaceClass("*", "aotified-panel")

  const $hero = $(".Hero")
  const $sectionInfo = $(".section:first")
  const $infoBox = $sectionInfo.children(".grayBox").replaceClass("*", "albumTopBox info slim").removeAttr("style")

  $infoBox.appendTo($hero.find(".Hero__boxes"))
  $sectionInfo.remove();
});

/**
 * notifications hook
 */
Hook("/notifications/", function () {
  $(".headline").filter(function () {
    return $(this).text().trim() === "Recent Notifications";
  }).text("Inbox");
})

/**
 * add-cover hook
 */
Hook("/album/add-cover.php", function () {
  const $root = $("#centerContent");
  const $fullWidth = $root.children(".fullWidth")

  const $hero = $root.find("#album.Hero");
  const $title = $root.find("h1.headline");
  const $note = $title.next("div");
  const $searchBlock = $root.find(".searchForm");
  const $results = $root.find("#albumResults");
  const $uploadBox = $root.find(".addCoverBox");

  const $header = $('<div class="aotified-cover-header"></div>')
    .append($hero);

  const $body = $('<div class="aotified-cover-body"></div>');

  const $heading = $('<div class="aotified-heading"></div>')
    .append($title)
    .append($note);

  const $grid = $('<div class="aotified-panels"></div>');

  const $searchPanel = $('<div class="aotified-panel aotified-search-panel"></div>')
    .append($searchBlock)
    .append($results);

  const $uploadPanel = $('<div class="aotified-panel aotified-upload-panel"></div>')
    .append($uploadBox);

  $grid
    .append($searchPanel)
    .append($uploadPanel);

  $body
    .append($heading)
    .append($grid);

  $fullWidth
    .append($body)
    .addClass("aotified-cover-card");

  $root.prepend($header)
})

/**
 * user review hook
 */
Hook("/user/*/album/*/", function () {
  const $wideLeft = $(".wideLeft")

  const $dotDropMenuContainer = $wideLeft.children(".dotDropMenuContainer");
  const $albumHeadline = $wideLeft.children(".albumHeadline");
  $albumHeadline.replaceClass("*", "aotified-review title")

  const $albumTitleA = $albumHeadline.find(".albumTitle a");
  const albumLink = $albumTitleA.attr("href")
  $albumTitleA.unpack()

  $albumHeadline.on("click", function () {
    window.location.href = albumLink ?? "";
  })
  $albumHeadline.children(".albumTitle").unpack()

  const $listenOn = $wideLeft.children(".listenOn")
  $listenOn.hide();

  const $reviewProfile = $wideLeft
    .children(".userReviewHeader")
    .replaceClass("*", "aotified-review header user")

  $reviewProfile
    .children(".content")
    .unpack()

  const $userReviewByline = $reviewProfile.children(".userReviewByline")
  $userReviewByline.unpack();

  const $profilePic = $reviewProfile.find(".image")
  const $profilePicA = $profilePic.children("a")

  const profileURL = $profilePicA.attr("href") ?? ""
  $profilePicA.unpack();

  $profilePic
    .replaceClass("*", "aotified-image pfp medium")
    .prependTo($reviewProfile)
    .on("click", function () {
      window.location.href = profileURL
      return;
    })

  const $userName = $reviewProfile.children(".userName")
  $userName.replaceClass("*", "aotified-label username")

  const $reviewDate = $reviewProfile.children(".reviewDate")
  $reviewDate.replaceClass("*", "aotified-label date")

  const $userReviewScoreBox = $reviewProfile.children(".userReviewScoreBox")
  $userReviewScoreBox
    .replaceClass("*", "aotified-rating box large")
    .children(".albumCriticScore").unpack();

  const $cover = $reviewProfile.children(".cover")

  const $reviewDetails = $("<div class='aotified-review details'></div>")

  $userName
    .add($reviewDate)
    .wrapAll($reviewDetails)

  $reviewDetails.append($cover)

  const $reviewBody = $reviewProfile.next("div")
  $reviewBody
    .removeAttr("style")
    .addClass("aotified-review body")

  const $reviewText = $reviewBody.children(".userReviewText")
  $reviewText
    .replaceClass("*", "aotified-review text")
    .removeAttr('itemprop')

  const $reviewActions = $reviewBody.children(".albumReviewLinks")
  $reviewActions.replaceClass('*', "aotified-review actions box")

  $reviewActions.children(".review_like, .review_likes_container").wrapAll("<div class='aotified-review actions item'></div>")
  $reviewActions.children(".flag").replaceClass("*", "aotified-review actions item")

  const $sectionRelated = $(".section:has(.relatedRow)")
  $sectionRelated.remove()

  const $sectionComments = $(".section").has(".commentRow")
  $sectionComments.replaceClass("*", "aotified-section")
  $sectionComments.attr("id", "comments")

  const $sectionTracklist = $(".section").has(".trackListTable")
  $sectionTracklist.replaceClass("*", "aotified-section sub")

  const $sectionAlbums = $("<div class='aotified-section sub'></div>");
  $wideLeft
    .children(".albumBlock")
    .wrapAll("<div class='aotified-releases small'></div>");

  const $releases = $wideLeft.children(".aotified-releases");
  const $sectionHeadingAlbums = $releases.prev(".sectionHeading");

  $sectionAlbums.append($sectionHeadingAlbums, $releases);
  $wideLeft.append($sectionAlbums);

  // review creation
  const $container = $("<div class='aotified-review container'></div>")
  const $reviewHeader = $("<div class='aotified-review header'></div>")

  $reviewHeader.append($cover, $albumHeadline, $dotDropMenuContainer)
  $container.append($wideLeft.contents())

  const $review = $("<div class='aotified-review large'></div>")
  $review.append($reviewHeader, $container)

  $wideLeft
    .append($sectionComments)
    .prepend($review)
})

log.debug("initialized");