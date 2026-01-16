/**
 * modules.user
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../core/observer";

export const User = (): Module => {
  const module = new Module({
    name: "Users",
    description: "Users related settings.",
  });

  const USERNAME = location.pathname.match(/^\/user\/([^/]+)\/?$/)?.[1];
  if (!USERNAME) {
    return module;
  }

  $("#centerContent").addClass("user");

  module.loadFeatures([
    new Feature({
      name: "Wrap Profile",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(".profileContent", function () {
          const $root = $(this);
          if ($root.data("releaseWrapped")) return;
          $root.data("releaseWrapped", true);

          const $headings = $root
            .children(".sectionHeading")
            .not("#favSection .sectionHeading");

          $headings.each(function () {
            const $heading = $(this);
            const $releaseContainer = $("<div class='releaseContainer'>");
            const $releaseBlock = $("<div class='releaseBlock'>");

            $heading
              .nextUntil(".sectionHeading", ".albumBlock")
              .addClass("user")
              .appendTo($releaseBlock);

            if (!$releaseBlock.children().length) return;

            $heading.wrap($releaseContainer);
            $releaseBlock.insertAfter($heading);
          });
        });

        Observer("#centerContent.user", function () {
          const $root = $(this);

          const pfp = $(".profileImage img").attr("src");
          ctx.logger.debug(pfp);

          const $profileLayout = $root.children(".flexContainer");
          $profileLayout.removeClass("flexContainer");
          $profileLayout.addClass("profileLayout");

          const $profileSidebar = $profileLayout.children(".rightContent");
          $profileSidebar.removeClass("rightContent");
          $profileSidebar.addClass("profileSidebar");
          $profileSidebar
            .find(".rightBox:has(.tag)")
            .wrapChildren(".tag", "<div class='tagBlock'>");
          $profileSidebar
            .find(`.rightBox:has(a[href^="/user/"])`)
            .wrapChildren(`a`, "<div class='usersBlock'>");

          const $profileContent = $profileLayout.children(".wideLeft");
          $profileContent.removeClass("wideLeft alignTop");
          $profileContent.addClass("profileContent");

          const $fullWidth = $root.children(".fullWidth:has(> #profileHead)");
          const $profileHead = $fullWidth.children("#profileHead");

          const $profileInfo = $profileHead
            .children(".profileHeadLeft")
            .replaceClass("*", "rightBox profileInfo");

          const $profileStats = $profileHead
            .children(".profileHeadRight")
            .replaceClass("*", "rightBox profileStats");
          $profileStats.children(".profileStatContainer").replaceClass("*", "statsBlock").wrapAll("<div class='statsContainer'></div>")
          $profileStats.prepend(`<h2 class="sectionHeading">Stats</h2>`);

          const $profileNav = $fullWidth.children(".profileNav");
          $profileContent.prepend($profileNav);

          const $profileText = $fullWidth.find(".headline.profile");
          $profileText.each(function () {
            const $span = $(this)
              .children("span")
              .addClass("profileName")
              .removeAttr("style");

            const $donor = $(this).children(".donor");

            if ($span.length && $donor.length) {
              $span.append($donor);
            }
          });

          $profileText.find(".profileName").each(function () {
            const node = this.childNodes[0];
            if (node && node.nodeType === 3) {
              const span = document.createElement("span");
              span.className = "nickname";
              span.textContent = node.textContent;
              this.replaceChild(span, node);
            }
          });

          $profileHead.unpack();
          $fullWidth.unpack();

          $profileSidebar.insertBefore($profileContent);
          $profileSidebar.prepend($profileStats);
          $profileSidebar.prepend($profileInfo);
        });

        Observer("#favBlock", function () {
          $(this).addClass("releaseBlock");
        });

        Observer(".profileContent", function () {
          const $root = $(this);

          const $headings = $root.children(".sectionHeading");

          $headings.each(function (_) {
            const $heading = $(this);

            const $releaseBlock = $("<div class='releaseBlock'>");
            const $releaseContainer = $("<div class='releaseContainer'>");

            $heading
              .nextUntil(".sectionHeading", ".albumBlock")
              .addClass("user")
              .appendTo($releaseBlock);

            $heading.wrapSmart($releaseContainer);
            $releaseBlock.insertAfter($heading);
          });
        });
      },
    }),

    new Feature({
      name: "Badges",
      description: "Show custom badges under user names",
      default: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        Observer(".profileSidebar", function () {
          const $root = $(this);
          const $profileDetails = $root.find(".profileHeadText").replaceClass("*", "profileDetails");
          const $profileBadges = $("<div class='profileBadges'>");
          const now = new Date();

          const memberSinceText = $root
            .find("div:contains('Member since')")
            .first()
            .text()
            .trim()
            .replace("StatsContributions", "")
            .replace("Member since ", "");

          const memberDate = new Date(memberSinceText);
          let years = now.getFullYear() - memberDate.getFullYear();

          const hasHadAnniversary =
            now.getMonth() > memberDate.getMonth() ||
            (now.getMonth() === memberDate.getMonth() &&
              now.getDate() >= memberDate.getDate());

          if (!hasHadAnniversary) {
            years--;
          }

          console.log(years);

          const $yearBadge = $(
            `<div class='badge year'><span id="year">${years}</span><span>year</span></div>`
          );
          let $devBadge = $(`<div class='badge dev'><span>DEV</span></div>`);

          if (USERNAME === "woidzero") {
            $profileBadges.append($devBadge);
          } else if (USERNAME === "rob") {
            $devBadge = $(`<div class='badge dev'><span>AOTY</span></div>`);
            $profileBadges.append($devBadge);
          }

          if (years > 0) {
            $profileBadges.append($yearBadge);
          }

          $profileDetails.append($profileBadges);
        });
      },
    }),
  ]);

  return module;
};
