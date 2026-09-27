import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { setLocaleCookie } from './helpers';

async function waitForActiveServiceWorker(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(async () => (
      await navigator.serviceWorker.getRegistrations()
    ).some((registration) => registration.active?.state === 'activated')),
    { timeout: 15_000 },
  ).toBe(true);

  await page.reload();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 15_000 },
  ).toBe(true);
}

test.describe('PWA lifecycle', () => {
  test('serves the standalone install manifest and its local icons', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    if (!manifestHref) throw new Error('The page does not link to an install manifest.');
    expect(new URL(manifestHref, page.url()).pathname).toBe('/manifest.webmanifest');

    const manifestResponse = await page.request.get(manifestHref);
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
    const manifest: unknown = await manifestResponse.json();
    expect(manifest).toMatchObject({
      name: 'LUMINA',
      short_name: 'LUMINA',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      icons: [
        { src: '/icon.png', type: 'image/png' },
        { src: '/apple-icon.png', type: 'image/png' },
      ],
    });

    for (const iconPath of ['/icon.png', '/apple-icon.png']) {
      const iconResponse = await page.request.get(iconPath);
      expect(iconResponse.status()).toBe(200);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
    }
  });

  test('registers at root and clears stale app caches on activation', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.addInitScript(async () => {
      if (sessionStorage.getItem('lumina-pwa-test-cache-seeded') === 'true') return;
      sessionStorage.setItem('lumina-pwa-test-cache-seeded', 'true');
      const staleCache = await caches.open('lumina-shell-e2e-stale');
      await staleCache.put(
        new Request(new URL('/stale-entry', location.origin)),
        new Response('stale'),
      );
      await caches.open('unrelated-cache');
    });

    await page.goto('/');
    await waitForActiveServiceWorker(page);

    const registration = await page.evaluate(async () => {
      const currentRegistration = await navigator.serviceWorker.ready;
      const active = currentRegistration.active;
      return {
        scope: currentRegistration.scope,
        scriptURL: active?.scriptURL ?? null,
        state: active?.state ?? null,
      };
    });
    expect(registration.scope).toBe(new URL('/', page.url()).href);
    expect(registration.scriptURL).toBe(new URL('/sw.js', page.url()).href);
    expect(registration.state).toBe('activated');

    await expect.poll(() => page.evaluate(async () => (
      await caches.keys()
    ).includes('lumina-shell-v1'))).toBe(true);
    const cacheState = await page.evaluate(async () => {
      const names = await caches.keys();
      const current = await caches.open('lumina-shell-v1');
      const offlinePage = new URL('/offline.html', location.origin).href;
      return {
        names,
        offlineShellCached: Boolean(await current.match(offlinePage)),
      };
    });
    expect(cacheState.names).not.toContain('lumina-shell-e2e-stale');
    expect(cacheState.names).toContain('unrelated-cache');
    expect(cacheState.offlineShellCached).toBe(true);
  });

  test('fetches and activates a changed service worker script in Chromium', async ({ context }) => {
    const workerV1 = await readFile(resolve(process.cwd(), 'public/sw.js'), 'utf8');
    const workerV2 = workerV1.replace(
      'const SHELL_CACHE = "lumina-shell-v1";',
      'const SHELL_CACHE = "lumina-shell-v2";',
    );
    expect(workerV2).not.toBe(workerV1);

    const offlinePage = await readFile(resolve(process.cwd(), 'public/offline.html'));
    let serveWorkerV2 = false;
    let servedWorkerV2 = false;
    const server = createServer((request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      response.setHeader('Cache-Control', 'no-store');

      if (pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<!doctype html><html><body><h1>Service worker fixture</h1></body></html>');
        return;
      }

      if (pathname === '/sw.js') {
        const worker = serveWorkerV2 ? workerV2 : workerV1;
        servedWorkerV2 ||= serveWorkerV2;
        response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        response.end(worker);
        return;
      }

      if (pathname === '/offline.html') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(offlinePage);
        return;
      }

      response.writeHead(404);
      response.end();
    });

    await new Promise<void>((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(0, '127.0.0.1', resolveListen);
    });

    let fixturePage: Page | undefined;
    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Service worker fixture server did not bind a TCP port.');
      }

      const page = await context.newPage();
      fixturePage = page;
      await page.goto(`http://127.0.0.1:${address.port}/`);
      await page.evaluate(async () => {
        const staleCache = await caches.open('lumina-shell-e2e-previous');
        await staleCache.put(
          new Request(new URL('/old-entry', location.origin)),
          new Response('stale'),
        );
        await caches.open('unrelated-cache');
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      });

      await expect.poll(() => page.evaluate(async () => (
        await caches.keys()
      ).includes('lumina-shell-v1'))).toBe(true);
      await expect.poll(() => page.evaluate(async () => (
        await navigator.serviceWorker.getRegistration('/')
      )?.active?.state === 'activated' && Boolean(navigator.serviceWorker.controller))).toBe(true);

      const firstActivationCaches = await page.evaluate(() => caches.keys());
      expect(firstActivationCaches).not.toContain('lumina-shell-e2e-previous');
      expect(firstActivationCaches).toContain('unrelated-cache');

      serveWorkerV2 = true;
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) throw new Error('Service worker registration is missing.');
        await registration.update();
      });

      await expect.poll(() => page.evaluate(async () => {
        const cachesAfterUpdate = await caches.keys();
        return cachesAfterUpdate.includes('lumina-shell-v2')
          && !cachesAfterUpdate.includes('lumina-shell-v1')
          && !cachesAfterUpdate.includes('lumina-shell-e2e-previous')
          && cachesAfterUpdate.includes('unrelated-cache');
      })).toBe(true);
      expect(servedWorkerV2).toBe(true);
    } finally {
      try {
        await fixturePage?.close();
      } finally {
        if (server.listening) {
          await new Promise<void>((resolveClose, rejectClose) => {
            server.close((error) => error ? rejectClose(error) : resolveClose());
          });
        }
      }
    }
  });

  test('serves the offline shell when the network fails and recovers online', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await waitForActiveServiceWorker(page);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();

    await context.setOffline(false);
    await page.reload();
    await expect(page).toHaveTitle(/LUMINA/);
  });

  test('does not store private report navigations online or in offline fallback', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await waitForActiveServiceWorker(page);

    const privatePaths = ['/p/x', '/r/not-a-real-share'];
    for (const path of privatePaths) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const cachedUrls = await page.evaluate(async () => {
        const urls: string[] = [];
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) urls.push(request.url);
        }
        return urls;
      });
      expect(cachedUrls).not.toContain(new URL(path, page.url()).href);
    }

    await context.setOffline(true);
    for (const path of privatePaths) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();
      const cachedUrls = await page.evaluate(async () => {
        const urls: string[] = [];
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) urls.push(request.url);
        }
        return urls;
      });
      expect(cachedUrls).not.toContain(new URL(path, page.url()).href);
    }
  });
});
