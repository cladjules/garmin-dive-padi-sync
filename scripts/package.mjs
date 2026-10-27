import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { zipSync } from "fflate";

const releaseDirectory = "release";
const extensionDirectory = "dist";
const extensionOutputPath = join(releaseDirectory, "garmin-dive-padi-sync-v0.5.7.zip");
const publicSiteDirectory = "store/site";
const publicSiteOutputPath = join(releaseDirectory, "divebridge-public-site-v0.5.7.zip");

async function collectFiles(directory, rootDirectory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = {};

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(path, rootDirectory));
    } else {
      files[relative(rootDirectory, path)] = new Uint8Array(await readFile(path));
    }
  }

  return files;
}

await mkdir(releaseDirectory, { recursive: true });
await Promise.all([
  writeFile(
    extensionOutputPath,
    zipSync(await collectFiles(extensionDirectory, extensionDirectory), { level: 9 }),
  ),
  writeFile(
    publicSiteOutputPath,
    zipSync(await collectFiles(publicSiteDirectory, publicSiteDirectory), { level: 9 }),
  ),
]);
console.log(`Created ${extensionOutputPath}`);
console.log(`Created ${publicSiteOutputPath}`);
