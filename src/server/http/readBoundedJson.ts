import "server-only";

export type BoundedJsonResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; status: 400 | 413 }>;

export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJsonResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413 };
  }

  if (!request.body) return { ok: false, status: 400 };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }

    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }
}
