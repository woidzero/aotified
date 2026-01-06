import "./utils/jquery.dom";

import { Essential } from "./core/essential";
import { Album } from "./core/album";
import { Artist } from "./core/artist";

(async () => {
  (() => {
    const body = document.querySelector(`body`);
    body?.classList.add("aotified");
  })();

  await Artist();
  await Album();
  await Essential();

  console.log("[aotified] initialized");
})();
