/**
 * modules.user
 *
 * added: 1.0.0
 */
import { Observer } from "../dom/observer";
import { Module, Feature } from "../core/composer";

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
        Observer("#centerContent.user", function () {
          const $root = $(this);

          const pfp = $(".profileImage img").attr("src");
          console.debug(`[userRework]: ${pfp}`);

          const $profileLayout = $root.children(".flexContainer");
          $profileLayout.removeClass("flexContainer");
          $profileLayout.addClass("profileLayout");

          const $profileSidebar = $profileLayout.children(".rightContent");
          $profileSidebar.removeClass("rightContent");
          $profileSidebar.addClass("profileSidebar");

          const $profileContent = $profileLayout.children(".wideLeft");
          $profileContent.removeClass("wideLeft alignTop");
          $profileContent.addClass("profileContent");

          const $profileDetails = $root.children(
            ".fullWidth:has(#profileHead)"
          );
          $profileDetails.removeClass("fullWidth");
          $profileDetails.addClass("profileDetails");

          const $profileNav = $profileDetails.children(".profileNav");
          $profileContent.prepend($profileNav);

          const $profileText = $profileDetails.find(".headline.profile");
          $profileText.attr("data-username", USERNAME);

          $profileSidebar.insertBefore($profileContent);
          $profileSidebar.prepend($profileDetails);
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
  ]);

  return module;
};
