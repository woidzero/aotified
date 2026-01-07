import "./dom/plugins";

import { Composer } from "./core/composer";

import { Global } from "./modules/global";
import { Album } from "./modules/album";
import { Artist } from "./modules/artist";
import { User } from "./modules/user";

// import { Images } from "./modules/images";

const composer = new Composer([Global(), Album(), Artist(), User()]);

composer.start();
