import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "public/fonts/og");
const FONT_PACKAGES = [
  { key: "serif", packageName: "noto-serif-kr", weight: 900 },
  { key: "sans", packageName: "ibm-plex-sans-kr", weight: 500 },
];

async function prepareFont({ key, packageName, weight }) {
  const packageRoot = path.join(ROOT, "node_modules/@fontsource", packageName);
  const unicode = JSON.parse(
    await readFile(path.join(packageRoot, "unicode.json"), "utf8"),
  );
  const outputDirectory = path.join(OUTPUT_ROOT, packageName);
  const manifest = {};

  await mkdir(outputDirectory, { recursive: true });

  for (const [subset, range] of Object.entries(unicode)) {
    const subsetName = subset.replace(/[\[\]]/g, "");
    const filename = `${packageName}-${subsetName}-${weight}-normal.woff`;
    await copyFile(
      path.join(packageRoot, "files", filename),
      path.join(outputDirectory, filename),
    );
    manifest[subset] = { file: filename, range };
  }

  return [key, manifest];
}

const entries = await Promise.all(FONT_PACKAGES.map(prepareFont));
await writeFile(
  path.join(OUTPUT_ROOT, "manifest.json"),
  `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
  "utf8",
);

console.log(`Prepared ${entries.length} local OG font families.`);
