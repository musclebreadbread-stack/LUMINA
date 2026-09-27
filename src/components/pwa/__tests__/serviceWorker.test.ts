import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import appManifest from "../../../app/manifest";

const APP_ORIGIN = "https://lumina.example.test";
const SERVICE_WORKER_SOURCE = readFileSync(
  fileURLToPath(new URL("../../../../public/sw.js", import.meta.url)),
  "utf8",
);
const OFFLINE_PAGE = readFileSync(
  fileURLToPath(new URL("../../../../public/offline.html", import.meta.url)),
  "utf8",
);

type CacheInput = string | URL | { url: string };
type FetchInput = CacheInput;
type FetchImplementation = (input: FetchInput) => Promise<Response>;
type WorkerRequest = { url: string; method: string; mode: string };
type WorkerEvent = {
  waitUntil?: (promise: Promise<unknown>) => void;
  request?: WorkerRequest;
  respondWith?: (response: Response | Promise<Response>) => void;
};
type WorkerEventListener = (event: WorkerEvent) => void;

function inputUrl(input: CacheInput): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input, APP_ORIGIN);
  return new URL(input.url, APP_ORIGIN);
}

class MemoryCache {
  private readonly responses = new Map<string, Response>();

  constructor(private readonly fetchImpl: FetchImplementation) {}

  async add(input: CacheInput): Promise<void> {
    const response = await this.fetchImpl(input);
    if (!response.ok) throw new Error("Cache.add requires a successful response");
    await this.put(input, response);
  }

  async match(input: CacheInput): Promise<Response | undefined> {
    return this.responses.get(inputUrl(input).href)?.clone();
  }

  async put(input: CacheInput, response: Response): Promise<void> {
    this.responses.set(inputUrl(input).href, response.clone());
  }

  keys(): string[] {
    return [...this.responses.keys()];
  }
}

class MemoryCacheStorage {
  private readonly caches = new Map<string, MemoryCache>();

  constructor(private readonly fetchImpl: FetchImplementation) {}

  async open(name: string): Promise<MemoryCache> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new MemoryCache(this.fetchImpl);
      this.caches.set(name, cache);
    }
    return cache;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }

  async match(input: CacheInput): Promise<Response | undefined> {
    for (const cache of this.caches.values()) {
      const response = await cache.match(input);
      if (response) return response;
    }
    return undefined;
  }

  get(name: string): MemoryCache | undefined {
    return this.caches.get(name);
  }
}

function createWorkerHarness(
  fetchImpl: FetchImplementation,
  source = SERVICE_WORKER_SOURCE,
  cacheStorage = new MemoryCacheStorage(fetchImpl),
) {
  const listeners = new Map<string, WorkerEventListener>();
  const skipWaiting = vi.fn(async () => undefined);
  const claim = vi.fn(async () => undefined);
  const scope = {
    location: { origin: APP_ORIGIN },
    addEventListener: (name: string, listener: WorkerEventListener) => listeners.set(name, listener),
    skipWaiting,
    clients: { claim },
  };

  runInNewContext(source, {
    self: scope,
    caches: cacheStorage,
    fetch: fetchImpl,
    URL,
    Response,
  });

  return {
    cacheStorage,
    skipWaiting,
    claim,
    async dispatchLifecycle(name: "install" | "activate"): Promise<void> {
      const listener = listeners.get(name);
      if (!listener) throw new Error(`Missing ${name} listener`);
      const pending: Promise<unknown>[] = [];
      listener({ waitUntil: (promise) => pending.push(promise) });
      await Promise.all(pending);
    },
    async dispatchFetch(request: WorkerRequest): Promise<Response | undefined> {
      const listener = listeners.get("fetch");
      if (!listener) throw new Error("Missing fetch listener");
      let responsePromise: Promise<Response> | undefined;
      listener({
        request,
        respondWith: (response) => { responsePromise = Promise.resolve(response); },
      });
      return responsePromise ? responsePromise : undefined;
    },
  };
}

function request(path: string, options: Partial<Omit<WorkerRequest, "url">> = {}): WorkerRequest {
  return {
    url: new URL(path, APP_ORIGIN).href,
    method: options.method ?? "GET",
    mode: options.mode ?? "cors",
  };
}

function mockUrl(input: FetchInput): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input, APP_ORIGIN);
  return new URL(input.url, APP_ORIGIN);
}

describe("PWA service worker lifecycle and privacy", () => {
  it("provides a standalone install manifest with existing local icons", () => {
    const manifest = appManifest();

    expect(manifest).toMatchObject({ start_url: "/", scope: "/", display: "standalone" });
    expect(manifest.icons?.map((icon) => icon.src)).toEqual(["/icon.png", "/apple-icon.png"]);
    expect(existsSync(fileURLToPath(new URL("../../../../src/app/icon.png", import.meta.url)))).toBe(true);
    expect(existsSync(fileURLToPath(new URL("../../../../src/app/apple-icon.png", import.meta.url)))).toBe(true);
  });

  it("installs an offline shell and waits for its cache operation", async () => {
    const fetchedPaths: string[] = [];
    const fetchImpl = vi.fn(async (input: FetchInput) => {
      fetchedPaths.push(mockUrl(input).pathname);
      return new Response(OFFLINE_PAGE, { status: 200 });
    });
    const worker = createWorkerHarness(fetchImpl);

    await worker.dispatchLifecycle("install");

    expect(fetchedPaths).toEqual(["/offline.html"]);
    expect(worker.cacheStorage.get("lumina-shell-v1")?.keys()).toEqual([
      new URL("/offline.html", APP_ORIGIN).href,
    ]);
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it("activates a new cache version, removes old shell caches, and preserves unrelated caches", async () => {
    const fetchImpl = vi.fn(async () => new Response(OFFLINE_PAGE, { status: 200 }));
    const cacheStorage = new MemoryCacheStorage(fetchImpl);
    const previousWorker = createWorkerHarness(fetchImpl, SERVICE_WORKER_SOURCE, cacheStorage);
    await previousWorker.dispatchLifecycle("install");
    await previousWorker.dispatchLifecycle("activate");
    await cacheStorage.open("unrelated-cache");

    const nextSource = SERVICE_WORKER_SOURCE.replace("lumina-shell-v1", "lumina-shell-v2");
    expect(nextSource).not.toBe(SERVICE_WORKER_SOURCE);
    const nextWorker = createWorkerHarness(fetchImpl, nextSource, cacheStorage);
    await nextWorker.dispatchLifecycle("install");
    await nextWorker.dispatchLifecycle("activate");

    expect(await cacheStorage.keys()).toEqual(["unrelated-cache", "lumina-shell-v2"]);
    expect(cacheStorage.get("lumina-shell-v2")?.keys()).toEqual([
      new URL("/offline.html", APP_ORIGIN).href,
    ]);
    expect(nextWorker.skipWaiting).toHaveBeenCalledOnce();
    expect(nextWorker.claim).toHaveBeenCalledOnce();
  });

  it("serves the offline page when navigation fails, then recovers to network content", async () => {
    let online = false;
    const fetchImpl = vi.fn(async (input: FetchInput) => {
      const url = mockUrl(input);
      if (url.pathname === "/offline.html") return new Response(OFFLINE_PAGE, { status: 200 });
      if (!online) throw new Error("network unavailable");
      return new Response("Recovered online page", { status: 200 });
    });
    const worker = createWorkerHarness(fetchImpl);
    await worker.dispatchLifecycle("install");

    const offlineResponse = await worker.dispatchFetch(request("/", { mode: "navigate" }));
    expect(offlineResponse?.status).toBe(200);
    const offlineBody = await offlineResponse?.text();
    expect(offlineBody).toContain("You are offline");
    expect(offlineBody).toContain("Reports and account responses are not stored");

    online = true;
    const recoveredResponse = await worker.dispatchFetch(request("/", { mode: "navigate" }));
    expect(await recoveredResponse?.text()).toBe("Recovered online page");
    expect(await worker.cacheStorage.keys()).toEqual(["lumina-shell-v1"]);
    expect(worker.cacheStorage.get("lumina-shell-v1")?.keys()).toEqual([
      new URL("/offline.html", APP_ORIGIN).href,
    ]);
  });

  it("does not cache private report navigations on success or offline fallback", async () => {
    let online = true;
    const privatePaths = ["/p/private-share-token", "/r/private-report-token"];
    const fetchImpl = vi.fn(async (input: FetchInput) => {
      const url = mockUrl(input);
      if (url.pathname === "/offline.html") return new Response(OFFLINE_PAGE, { status: 200 });
      if (!online) throw new Error("network unavailable");
      return new Response(`private report for ${url.pathname}`, { status: 200 });
    });
    const worker = createWorkerHarness(fetchImpl);
    await worker.dispatchLifecycle("install");

    for (const path of privatePaths) {
      const onlineResponse = await worker.dispatchFetch(request(path, { mode: "navigate" }));
      expect(await onlineResponse?.text()).toBe(`private report for ${path}`);
      expect(await worker.cacheStorage.match(path)).toBeUndefined();
    }

    online = false;
    for (const path of privatePaths) {
      const offlineResponse = await worker.dispatchFetch(request(path, { mode: "navigate" }));
      expect((await offlineResponse?.text()) ?? "").toContain("You are offline");
      expect(await worker.cacheStorage.match(path)).toBeUndefined();
    }

    expect(worker.cacheStorage.get("lumina-shell-v1")?.keys()).toEqual([
      new URL("/offline.html", APP_ORIGIN).href,
    ]);
  });

  it("caches only successful same-origin public static assets and serves cached copies", async () => {
    let assetFetchCount = 0;
    const fetchImpl = vi.fn(async (input: FetchInput) => {
      assetFetchCount += 1;
      const status = mockUrl(input).pathname === "/fonts/missing.woff2" ? 503 : 200;
      return new Response(`static-asset-${assetFetchCount}`, { status });
    });
    const worker = createWorkerHarness(fetchImpl);
    const assetRequest = request("/_next/static/css/app.css");
    const fontRequest = request("/fonts/app.woff2");

    const firstResponse = await worker.dispatchFetch(assetRequest);
    const secondResponse = await worker.dispatchFetch(assetRequest);
    const fontResponse = await worker.dispatchFetch(fontRequest);
    const missingFontRequest = request("/fonts/missing.woff2");
    const failedFontResponse = await worker.dispatchFetch(missingFontRequest);
    const repeatedFailureResponse = await worker.dispatchFetch(missingFontRequest);

    expect(await firstResponse?.text()).toBe("static-asset-1");
    expect(await secondResponse?.text()).toBe("static-asset-1");
    expect(await fontResponse?.text()).toBe("static-asset-2");
    expect(failedFontResponse?.status).toBe(503);
    expect(repeatedFailureResponse?.status).toBe(503);
    expect(assetFetchCount).toBe(4);
    expect(worker.cacheStorage.get("lumina-shell-v1")?.keys()).toEqual([assetRequest.url, fontRequest.url]);
  });

  it("does not cache private report, account, authentication, payment, or API responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("private response", { status: 200 }));
    const worker = createWorkerHarness(fetchImpl);
    const privatePaths = [
      "/api/account/auth/get-session",
      "/api/account/share/private-id",
      "/api/auth/get-session",
      "/api/billing/orders",
      "/api/internal/analytics-rollup",
      "/api/report/profile-session",
    ];

    for (const path of privatePaths) {
      expect(await worker.dispatchFetch(request(path))).toBeUndefined();
    }
    expect(await worker.dispatchFetch(request("/fonts/private-looking-path.woff2", { method: "POST" })))
      .toBeUndefined();
    expect(await worker.dispatchFetch({
      ...request("/fonts/public.woff2"),
      url: "https://cdn.example.test/fonts/public.woff2",
    })).toBeUndefined();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await worker.cacheStorage.keys()).toEqual([]);
  });
});
