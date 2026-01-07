/**
 * modules.image
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../dom/observer";

export const Images = (): Module => {
  const module = new Module({
    name: "Images",
    description: "Images related settings.",
  });

  module.loadFeatures([
    new Feature({
      name: "Upgrade Images",
      description: ".",
      default: true,
      hidden: true,
      run: (ctx: FeatureContext) => {
        ctx.logger.log(`enabled`);

        return Observer<JQuery<HTMLImageElement>>("img", function () {
          const $img = $(this);

          if ($img.data("upgraded")) return;
          $img.data("upgraded", true);

          const SIZE = "500";
          const src = $img.attr("src");
          if (!src) return;

          // already upgraded or not matching pattern
          if (!/\/\d+x0\//.test(src) || src.includes(`${SIZE}x0`)) return;

          const upgraded = src.replace(/\/\d+x0\//, `/${SIZE}x0/`);

          const preloader = new Image();
          preloader.src = upgraded;

          preloader.onload = () => {
            $img.attr("src", upgraded);
            ctx.logger.debug("upgraded image:", upgraded);
          };

          preloader.onerror = (e) => {
            ctx.logger.warn("image upgrade failed:", upgraded, e);
          };
        });
      },
    }),
  ]);
  return module;
};
