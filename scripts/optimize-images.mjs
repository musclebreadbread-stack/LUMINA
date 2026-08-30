import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const GROUPS = [
  { directory: "public/tarot/cards", maxWidth: 640, maxHeight: 960 },
  { directory: "public/horoscope/zodiac", maxWidth: 480, maxHeight: 720 },
  { directory: "public/saju/zodiac", maxWidth: 480, maxHeight: 720 },
  { directory: "public/astro", maxWidth: 640, maxHeight: 480 },
  { directory: "public/horoscope", maxWidth: 640, maxHeight: 480 },
  { directory: "public/saju", maxWidth: 640, maxHeight: 480 },
  { directory: "public/compatibility", maxWidth: 640, maxHeight: 427 },
  { directory: "public/numerology/numbers", maxWidth: 480, maxHeight: 720 },
  { directory: "public/psychometrics/factors", maxWidth: 640, maxHeight: 427 },
  { directory: "public/psychometrics/darktriad", maxWidth: 640, maxHeight: 427 },
  { directory: "public/psychometrics/attachment", maxWidth: 640, maxHeight: 427 },
  { directory: "public/psychometrics/eq", maxWidth: 640, maxHeight: 427 },
  { directory: "public/psychometrics/cognitive", maxWidth: 640, maxHeight: 427 },
  { directory: "public/psychometrics/types/axes", maxWidth: 1536, maxHeight: 1024 },
];

const MANDALA_TEXTURES = [
  { source: "public/saju/zodiac/dragon.png", name: "saju" },
  { source: "public/tarot/cards/00.png", name: "tarot" },
  { source: "public/numerology/numbers/11.png", name: "numerology" },
  { source: "public/psychometrics/factors/intellect.png", name: "psychometrics" },
  { source: "public/horoscope/zodiac/leo.png", name: "horoscope" },
];

async function optimizeFile(directory, filename, maxWidth, maxHeight) {
  const source = path.join(ROOT, directory, filename);
  const stem = path.basename(filename, path.extname(filename));
  const outputBase = path.join(ROOT, directory, stem);
  const input = sharp(source).resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  });

  await Promise.all([
    input.clone().avif({ quality: 55, effort: 5 }).toFile(`${outputBase}.avif`),
    input.clone().webp({ quality: 78, effort: 5 }).toFile(`${outputBase}.webp`),
  ]);
}

async function optimizeMandalaTexture({ source: relativeSource, name }) {
  const source = path.join(ROOT, relativeSource);
  const directory = path.join(ROOT, "public/mandala/textures");
  await sharp(source)
    .resize({ width: 512, height: 512, fit: "cover", position: "attention" })
    .webp({ quality: 72, effort: 5 })
    .toFile(path.join(directory, `${name}.webp`));
}

async function main() {
  let sourceCount = 0;

  for (const group of GROUPS) {
    const filenames = (await readdir(path.join(ROOT, group.directory)))
      .filter((filename) => filename.toLowerCase().endsWith(".png"))
      .sort();

    await Promise.all(
      filenames.map((filename) =>
        optimizeFile(group.directory, filename, group.maxWidth, group.maxHeight),
      ),
    );
    sourceCount += filenames.length;
    console.log(`${group.directory}: ${filenames.length} source images optimized`);
  }

  await import("node:fs/promises").then(({ mkdir }) => mkdir(path.join(ROOT, "public/mandala/textures"), { recursive: true }));
  await Promise.all(MANDALA_TEXTURES.map(optimizeMandalaTexture));
  console.log(`Mandala textures: ${MANDALA_TEXTURES.length} 512px square WebP files generated`);

  console.log(`Optimized ${sourceCount} PNG source images into AVIF and WebP variants.`);
}

await main();
