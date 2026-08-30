import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();

/**
 * Satori(next/og)는 WebP·AVIF 디코드를 지원하지 않아 두 형식을 그대로 쓰면
 * OG 카드가 오류 없이 빈 이미지로만 나온다. 소스는 WebP뿐이므로 OG 카드용
 * PNG 파생본을 별도 경로(public/og/)에 미리 만들어 둔다.
 */
const GROUPS = [
  { directory: "public/psychometrics/types", outputDirectory: "public/og/types", longEdge: 620 },
  {
    directory: "public/psychometrics/types/axes",
    outputDirectory: "public/og/types/axes",
    longEdge: 300,
  },
  { directory: "public/psychometrics/eq", outputDirectory: "public/og/eq", longEdge: 620 },
  {
    directory: "public/psychometrics/cognitive",
    outputDirectory: "public/og/cognitive",
    longEdge: 620,
  },
  {
    directory: "public/psychometrics/darktriad",
    outputDirectory: "public/og/darktriad",
    longEdge: 620,
  },
  {
    directory: "public/psychometrics/attachment",
    outputDirectory: "public/og/attachment",
    longEdge: 620,
  },
];

const PNG_OPTIONS = { palette: true, quality: 85, effort: 7 };

async function longEdgeSize(source, longEdge) {
  const metadata = await sharp(source).metadata();
  const width = metadata.width ?? longEdge;
  const height = metadata.height ?? longEdge;
  const scale = longEdge / Math.max(width, height);

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function convertFile(directory, outputDirectory, filename, longEdge) {
  const source = path.join(ROOT, directory, filename);
  const stem = path.basename(filename, path.extname(filename));
  const destination = path.join(ROOT, outputDirectory, `${stem}.png`);
  // 원본 비율을 유지해 실루엣이 잘리지 않도록 fit:inside로 맞춘다.
  const { width, height } = await longEdgeSize(source, longEdge);

  await sharp(source)
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .png(PNG_OPTIONS)
    .toFile(destination);
}

async function convertGroup({ directory, outputDirectory, longEdge }) {
  const filenames = (await readdir(path.join(ROOT, directory)))
    .filter((filename) => filename.toLowerCase().endsWith(".webp"))
    .sort();

  await mkdir(path.join(ROOT, outputDirectory), { recursive: true });
  await Promise.all(
    filenames.map((filename) => convertFile(directory, outputDirectory, filename, longEdge)),
  );

  console.log(`${outputDirectory}: ${filenames.length} PNG derivatives generated`);
  return filenames.length;
}

async function main() {
  let total = 0;
  for (const group of GROUPS) {
    total += await convertGroup(group);
  }

  console.log(`Prepared ${total} OG PNG derivatives from WebP-only sources.`);
}

await main();
