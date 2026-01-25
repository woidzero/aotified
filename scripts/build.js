import esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/bundle.js",
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: watch,
  minify: !watch,
  external: ["jquery"],
  define: {
    "window.$": "window.$",
    "window.jQuery": "window.jQuery",
  },
  plugins: [
    sassPlugin({
      type: "css-file",
      outFile: "dist/style.css",
      sourceMap: watch,
    }),
  ],
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);

  await ctx.watch();
  console.log("👀 Watching JS + SCSS...");
} else {
  await esbuild.build(buildOptions);
  console.log("✅ Build finished");
}
