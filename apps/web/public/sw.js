/*
 * The service worker: lets the site open without a connection, and keeps it quick on a poor one.
 *
 *   pages      network first (always the latest), the last copy when offline, and the offline
 *              page for anything never opened
 *   /_next/static/...  fingerprinted scripts, styles and fonts: kept once fetched
 *   images     served from the cache and refreshed in the background
 *
 * Everything else (the API, the contact form, Cloudflare's check, any POST) passes straight
 * through. The version comes from the address it was registered with (/sw.js?v=<build>), so
 * every deploy installs afresh and clears the caches of the one before.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE = "/offline";
const LIMITS = { [PAGES]: 40, [ASSETS]: 200, [IMAGES]: 60 };
/** How long a page may take before the copy in the cache is shown instead. */
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // the offline page, and the styles, scripts and fonts it needs to look like the site
      const response = await fetch(OFFLINE, { cache: "reload" });
      if (!response.ok) throw new Error(`The offline page answered ${response.status}`);
      const pages = await caches.open(PAGES);
      await pages.put(OFFLINE, response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"?#]+)"/g)].map(
        (match) => match[1],
      );
      const cache = await caches.open(ASSETS);
      await Promise.all([...new Set(assets)].map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, ASSETS, IMAGES]);
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
      // the page request starts while the worker wakes up, instead of after
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

/** Keeps a cache to its size, dropping the oldest entries first. */
async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - LIMITS[name]))) {
    await cache.delete(request);
  }
}

/** Only complete, same-site answers are worth keeping. */
const keepable = (response) => response.ok && response.type === "basic";

async function page(event) {
  const cache = await caches.open(PAGES);
  const network = (async () => {
    const response = (await event.preloadResponse) || (await fetch(event.request));
    if (keepable(response)) {
      await cache.put(event.request, response.clone());
      void trim(PAGES);
    }
    return response;
  })();
  event.waitUntil(network.catch(() => undefined));

  const cached = await cache.match(event.request, { ignoreSearch: false });
  try {
    if (cached === undefined) return await network;
    // a slow connection should not hold up a page that is already here
    return await Promise.race([
      network,
      new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS)),
    ]);
  } catch {
    return cached ?? (await cache.match(OFFLINE)) ?? Response.error();
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached !== undefined) return cached;
  const response = await fetch(request);
  if (keepable(response)) {
    await cache.put(request, response.clone());
    void trim(ASSETS);
  }
  return response;
}

async function image(event) {
  const cache = await caches.open(IMAGES);
  const cached = await cache.match(event.request);
  const fresh = fetch(event.request).then(async (response) => {
    if (keepable(response)) {
      await cache.put(event.request, response.clone());
      void trim(IMAGES);
    }
    return response;
  });
  event.waitUntil(fresh.catch(() => undefined));
  return cached ?? fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(page(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(asset(request));
  } else if (request.destination === "image") {
    event.respondWith(image(event));
  }
});
