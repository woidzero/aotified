/**
 * modules.artist
 *
 * added: 1.0.0
 */
import { Module, Feature } from "../core/composer";
import { Observer } from "../core/observer";

export const Artist = (): Module => {
  const mod = new Module({
    name: "Artists",
    description: "Artist page related features.",
  });

  const ARTIST_ID = location.pathname.match(/artist\/(\d+)-/)?.[1];

  if (ARTIST_ID) {
    mod.loadFeatures([
      new Feature({
        name: "More Releases",
        description: ".",
        default: true,
        hidden: true,
        run: (ctx: FeatureContext) => {
          ctx.logger.log(`enabled`);
        }
      })
    ]);
  }

  return mod;
};
