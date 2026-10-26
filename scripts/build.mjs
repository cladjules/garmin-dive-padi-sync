import { cp, mkdir, rm } from "node:fs/promises";
import process from "node:process";

import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");

const sharedBuildOptions = {
  bundle: true,
  format: "iife",
  logLevel: "info",
  minify: !isWatch,
  platform: "browser",
  sourcemap: isWatch,
  target: ["chrome120", "edge120"],
};

const contentBuildOptions = {
  ...sharedBuildOptions,
  entryPoints: ["src/content.tsx"],
  jsx: "automatic",
  outfile: "dist/content.js",
};

const backgroundBuildOptions = {
  ...sharedBuildOptions,
  entryPoints: ["src/background.ts"],
  outfile: "dist/background.js",
};

const settingsBuildOptions = {
  ...sharedBuildOptions,
  entryPoints: ["src/settings.tsx"],
  jsx: "automatic",
  outfile: "dist/settings.js",
};

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/icons", { recursive: true });
await Promise.all([
  cp("extension/manifest.json", "dist/manifest.json"),
  cp("extension/settings.html", "dist/settings.html"),
  ...[16, 32, 48, 128].map((size) =>
    cp(`extension/icons/icon${size}.png`, `dist/icons/icon${size}.png`),
  ),
]);

if (isWatch) {
  const [contentBuildContext, backgroundBuildContext, settingsBuildContext] = await Promise.all([
    context(contentBuildOptions),
    context(backgroundBuildOptions),
    context(settingsBuildOptions),
  ]);
  await Promise.all([
    contentBuildContext.watch(),
    backgroundBuildContext.watch(),
    settingsBuildContext.watch(),
  ]);
  console.log("Watching extension source…");
} else {
  await Promise.all([
    build(contentBuildOptions),
    build(backgroundBuildOptions),
    build(settingsBuildOptions),
  ]);
}
