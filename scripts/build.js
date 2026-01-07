import esbuild from "esbuild";
import { createHash } from "crypto";

const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/bundle.js",
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: false,
  minify: false,

  external: ["jquery"],
  define: {
    "window.$": "window.$",
    "window.jQuery": "window.jQuery",
  },
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("watching...");
} else {
  await esbuild.build(buildOptions);
  console.log("build ok");
}
