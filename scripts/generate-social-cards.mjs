import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * 12띠×2027 SNS 카드를 배포된(또는 로컬) OG 이미지 라우트에서 그대로 받아
 * 로컬 PNG로 저장한다 — 렌더링 로직(buildSajuGuideOgCard/renderOgFrame)을
 * 다시 구현하지 않는다. 이 저장소에는 Next 빌드·Vitest 바깥에서 JSX(.tsx)를
 * 실행할 수단이 없어서(확인 완료), 이미 완성돼 배포된 이미지를 그 URL에서
 * 그대로 fetch하는 쪽이 새 devDependency 없이 정확히 같은 결과를 준다.
 *
 * 인스타·스레드·카카오 채널에 수동으로 올릴 파일을 만드는 도구일 뿐이라
 * `social-cards-output/`은 커밋하지 않는다(.gitignore).
 */

const CHINESE_SIGN_KEYS = Object.freeze([
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
]);

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_ORIGIN = "https://lumina.jack.ai.kr";
const DEFAULT_OUT_DIR = "./social-cards-output";

export function resolveOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error("Origin must be a valid HTTP(S) origin.");
  }

  const isLocalHttp = origin.protocol === "http:"
    && (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");

  if (
    (origin.protocol !== "https:" && !isLocalHttp)
    || origin.username !== ""
    || origin.password !== ""
    || origin.pathname !== "/"
    || origin.search !== ""
    || origin.hash !== ""
  ) {
    throw new Error(
      "Origin must be an HTTPS origin (or http://localhost for local testing) and cannot include credentials, a path, a query, or a fragment.",
    );
  }

  return origin.origin;
}

async function fetchCard(origin, key, fetchImpl) {
  try {
    const response = await fetchImpl(new URL(`/saju/2027/${key}/opengraph-image`, origin), {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!response.ok || contentType !== "image/png") {
      return { key, passed: false, status: response.status, contentType: contentType || "missing content-type", buffer: null };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { key, passed: true, status: response.status, contentType, buffer };
  } catch {
    return { key, passed: false, status: null, contentType: "unavailable", buffer: null };
  }
}

export async function generateSocialCards(originValue, outDir, fetchImpl = fetch) {
  const origin = resolveOrigin(originValue);
  await mkdir(outDir, { recursive: true });

  const results = [];
  for (const key of CHINESE_SIGN_KEYS) {
    const result = await fetchCard(origin, key, fetchImpl);
    if (result.passed && result.buffer) {
      await writeFile(path.join(outDir, `2027-${key}.png`), result.buffer);
    }
    results.push({ key: result.key, passed: result.passed, status: result.status, contentType: result.contentType });
  }
  return results;
}

function parseArguments(args, environment) {
  let origin = environment.SOCIAL_CARDS_ORIGIN ?? environment.NEXT_PUBLIC_SITE_URL ?? DEFAULT_ORIGIN;
  let outDir = environment.SOCIAL_CARDS_OUT_DIR ?? DEFAULT_OUT_DIR;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--origin" && value !== undefined) {
      origin = value;
    } else if (flag === "--out-dir" && value !== undefined) {
      outDir = value;
    } else {
      throw new Error("Usage: node scripts/generate-social-cards.mjs [--origin https://example.com] [--out-dir ./path]");
    }
    index += 1;
  }

  return { origin: resolveOrigin(origin), outDir };
}

export async function main(args = process.argv.slice(2), environment = process.env, log = console, fetchImpl = fetch) {
  let origin;
  let outDir;
  try {
    ({ origin, outDir } = parseArguments(args, environment));
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Invalid arguments.");
    return 2;
  }

  const results = await generateSocialCards(origin, outDir, fetchImpl);
  for (const result of results) {
    const label = result.passed ? "PASS" : "FAIL";
    const status = result.status === null ? "request failed" : `HTTP ${result.status}`;
    log[result.passed ? "log" : "error"](`${label} ${result.key} — ${status}; ${result.contentType}`);
  }

  const passed = results.filter((result) => result.passed).length;
  log.log(`Social card export: ${passed}/${results.length} saved to ${outDir}`);
  return passed === results.length ? 0 : 1;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await main();
}
