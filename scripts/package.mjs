import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { zipSync } from "fflate";

const sourceDirectory = "dist";
const releaseDirectory = "release";
const outputPath = join(releaseDirectory, "garmin-dive-padi-sync-v0.5.7.zip");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = {};

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(path));
    } else {
      files[relative(sourceDirectory, path)] = new Uint8Array(await readFile(path));
    }
  }

  return files;
}

await mkdir(releaseDirectory, { recursive: true });
await writeFile(outputPath, zipSync(await collectFiles(sourceDirectory), { level: 9 }));
console.log(`Created ${outputPath}`);
