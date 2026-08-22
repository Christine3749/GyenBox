import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pngToIco from "png-to-ico";
import sharp from "sharp";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..", "..");
const brandRoot = join(appRoot, "brand");
const rasterRoot = join(brandRoot, "raster");
const webRoot = join(repoRoot, "apps", "web", "public", "iwriter", "brand");
const iconSvg = join(brandRoot, "svg", "iwriter-icon.svg");
const logoLightSvg = join(brandRoot, "svg", "iwriter-logo-light.svg");
const logoDarkSvg = join(brandRoot, "svg", "iwriter-logo-dark.svg");
const sizes = [16, 20, 24, 32, 48, 64, 128, 256, 512, 1024];

await mkdir(rasterRoot, { recursive: true });
await mkdir(webRoot, { recursive: true });

const svg = await readFile(iconSvg);
for (const size of sizes) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(rasterRoot, `iwriter-icon-${size}.png`));
}

for (const [variant, source] of [["light", logoLightSvg], ["dark", logoDarkSvg]]) {
  const logoSvg = await readFile(source);
  for (const width of [320, 640, 1400]) {
    await sharp(logoSvg, { density: 288 })
      .resize({ width })
      .png({ compressionLevel: 9 })
      .toFile(join(rasterRoot, `iwriter-logo-${variant}-${width}.png`));
  }
}

await copyFile(join(rasterRoot, "iwriter-icon-1024.png"), join(appRoot, "build", "icon.png"));

const icoInputs = [16, 24, 32, 48, 64, 128, 256]
  .map((size) => join(rasterRoot, `iwriter-icon-${size}.png`));
await writeFile(join(rasterRoot, "iwriter.ico"), await pngToIco(icoInputs));
await copyFile(join(rasterRoot, "iwriter.ico"), join(appRoot, "build", "icon.ico"));

if (process.platform === "darwin") {
  const iconset = join(rasterRoot, "iWriter.iconset");
  await rm(iconset, { recursive: true, force: true });
  await mkdir(iconset, { recursive: true });
  const iconsetFiles = [
    [16, "icon_16x16.png"], [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"], [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"], [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"], [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"], [1024, "icon_512x512@2x.png"],
  ];
  for (const [size, filename] of iconsetFiles) {
    await copyFile(join(rasterRoot, `iwriter-icon-${size}.png`), join(iconset, filename));
  }
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", join(rasterRoot, "iwriter.icns")]);
  await copyFile(join(rasterRoot, "iwriter.icns"), join(appRoot, "build", "icon.icns"));
  await rm(iconset, { recursive: true, force: true });
}

await copyFile(join(brandRoot, "svg", "iwriter-mark.svg"), join(webRoot, "mark.svg"));
await copyFile(join(brandRoot, "svg", "iwriter-logo-light.svg"), join(webRoot, "logo-light.svg"));
await copyFile(join(brandRoot, "svg", "iwriter-logo-dark.svg"), join(webRoot, "logo-dark.svg"));
await copyFile(join(rasterRoot, "iwriter-icon-192.png"), join(webRoot, "icon-192.png"))
  .catch(async () => {
    await sharp(svg, { density: 384 }).resize(192, 192).png().toFile(join(webRoot, "icon-192.png"));
  });
await copyFile(join(rasterRoot, "iwriter-icon-512.png"), join(webRoot, "icon-512.png"));
await sharp(svg, { density: 384 }).resize(180, 180).png().toFile(join(webRoot, "apple-touch-icon.png"));
await copyFile(join(rasterRoot, "iwriter.ico"), join(webRoot, "favicon.ico"));

console.log(`Exported iWriter brand assets to ${rasterRoot}`);
