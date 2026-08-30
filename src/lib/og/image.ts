import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Satori(next/og)는 브라우저 밖에서 렌더링되므로 "/foo.png" 같은 상대 경로를
 * 못 읽는다 — public/ 밑 PNG 를 data URI 로 바꿔 넘겨야 한다. webp/avif 는
 * 무음(silent) 실패하므로 반드시 PNG 를 받는다는 전제다.
 *
 * 서버 전용 모듈 — "use client" 컴포넌트에서 import 하지 않는다.
 */

const pngDataUriCache = new Map<string, string | null>();

export async function loadOgPng(relativePathUnderPublic: string): Promise<string | null> {
  if (pngDataUriCache.has(relativePathUnderPublic)) {
    return pngDataUriCache.get(relativePathUnderPublic) ?? null;
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), "public", relativePathUnderPublic));
    const dataUri = `data:image/png;base64,${bytes.toString("base64")}`;
    pngDataUriCache.set(relativePathUnderPublic, dataUri);
    return dataUri;
  } catch {
    // 없는 파일이면 빈 카드 대신 호출자가 대체 UI를 그릴 수 있게 null 을 준다.
    pngDataUriCache.set(relativePathUnderPublic, null);
    return null;
  }
}
