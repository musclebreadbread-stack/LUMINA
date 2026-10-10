import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generateSocialCards, main, resolveOrigin } from "./generate-social-cards.mjs";

const ALL_KEYS = [
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
];

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "social-cards-test-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function pngResponse() {
  return new Response(new Uint8Array([1, 2, 3, 4]), {
    status: 200,
    headers: { "content-type": "image/png" },
  });
}

test("accepts a production HTTPS origin and removes a trailing slash", () => {
  assert.equal(resolveOrigin("https://lumina.jack.ai.kr/"), "https://lumina.jack.ai.kr");
});

test("accepts http://localhost for local testing", () => {
  assert.equal(resolveOrigin("http://localhost:3000"), "http://localhost:3000");
});

for (const origin of [
  "http://example.com",
  "https://example.com/path",
  "https://example.com?token=secret",
  "https://user:password@example.com",
]) {
  test(`rejects unsafe origin ${origin}`, () => {
    assert.throws(() => resolveOrigin(origin));
  });
}

test("fetches all 12 zodiac-sign OG image routes and saves each as a PNG", async () => {
  await withTempDir(async (outDir) => {
    const requestedPaths = [];
    const fetchImpl = async (input) => {
      requestedPaths.push(new URL(input).pathname);
      return pngResponse();
    };

    const results = await generateSocialCards("https://lumina.jack.ai.kr", outDir, fetchImpl);

    assert.equal(results.length, 12);
    assert.ok(results.every((result) => result.passed));
    for (const key of ALL_KEYS) {
      assert.ok(requestedPaths.includes(`/saju/2027/${key}/opengraph-image`));
    }

    const written = await readdir(outDir);
    assert.equal(written.length, 12);
    for (const key of ALL_KEYS) {
      const bytes = await readFile(path.join(outDir, `2027-${key}.png`));
      assert.deepEqual([...bytes], [1, 2, 3, 4]);
    }
  });
});

test("does not write a file for a sign whose route fails, and marks it not passed", async () => {
  await withTempDir(async (outDir) => {
    const fetchImpl = async (input) => {
      const pathname = new URL(input).pathname;
      if (pathname.includes("/dragon/")) {
        return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
      }
      return pngResponse();
    };

    const results = await generateSocialCards("https://lumina.jack.ai.kr", outDir, fetchImpl);

    const dragonResult = results.find((result) => result.key === "dragon");
    assert.equal(dragonResult?.passed, false);
    assert.equal(dragonResult?.status, 404);
    assert.equal(results.filter((result) => result.passed).length, 11);

    const written = await readdir(outDir);
    assert.equal(written.length, 11);
    assert.ok(!written.includes("2027-dragon.png"));
  });
});

test("marks a wrong content-type as failed even on a 200 response", async () => {
  await withTempDir(async (outDir) => {
    const fetchImpl = async () =>
      new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });

    const results = await generateSocialCards("https://lumina.jack.ai.kr", outDir, fetchImpl);
    assert.ok(results.every((result) => !result.passed));
    assert.equal((await readdir(outDir)).length, 0);
  });
});

test("a thrown/aborted fetch is recorded as a failure, not an unhandled rejection", async () => {
  await withTempDir(async (outDir) => {
    const fetchImpl = async () => {
      throw new Error("network error");
    };

    const results = await generateSocialCards("https://lumina.jack.ai.kr", outDir, fetchImpl);
    assert.ok(results.every((result) => result.passed === false && result.status === null));
  });
});

test("main() returns 0 when every card is saved and writes into the requested --out-dir", async () => {
  await withTempDir(async (outDir) => {
    const logs = [];
    const log = { log: (message) => logs.push(message), error: (message) => logs.push(message) };
    const fetchImpl = async () => pngResponse();

    const exitCode = await main(["--origin", "https://lumina.jack.ai.kr", "--out-dir", outDir], {}, log, fetchImpl);

    assert.equal(exitCode, 0);
    assert.equal((await readdir(outDir)).length, 12);
    assert.ok(logs.some((line) => line.includes("12/12")));
  });
});

test("main() returns 1 when at least one card fails to save", async () => {
  await withTempDir(async (outDir) => {
    const log = { log: () => {}, error: () => {} };
    const fetchImpl = async (input) =>
      new URL(input).pathname.includes("/pig/")
        ? new Response("gone", { status: 500 })
        : pngResponse();

    const exitCode = await main(["--origin", "https://lumina.jack.ai.kr", "--out-dir", outDir], {}, log, fetchImpl);
    assert.equal(exitCode, 1);
  });
});

test("main() returns 2 on invalid CLI usage and touches no filesystem", () => {
  const log = { log: () => {}, error: () => {} };
  return main(["--bogus", "value"], {}, log, async () => pngResponse()).then((exitCode) => {
    assert.equal(exitCode, 2);
  });
});

test("main() falls back to the default production origin and out-dir when nothing is provided", async () => {
  const requested = [];
  const log = { log: () => {}, error: () => {} };
  const fetchImpl = async (input) => {
    requested.push(new URL(input).origin);
    return pngResponse();
  };

  try {
    await main([], {}, log, fetchImpl);
    assert.ok(requested.every((origin) => origin === "https://lumina.jack.ai.kr"));
  } finally {
    await rm("./social-cards-output", { recursive: true, force: true });
  }
});
