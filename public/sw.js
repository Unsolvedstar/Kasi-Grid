// Kasi Grid service worker: keeps the app usable without signal.
// - Pages: network first, fall back to the cached app shell.
// - Built assets (hashed filenames): cache first.
// - API reads: network first, fall back to the last response, so reports and the board still show offline.
// - Anything that is not a GET (posting reports etc.) is never cached.
const VERSION = 'v2'
const SHELL = 'kg-shell-' + VERSION
const ASSETS = 'kg-assets-' + VERSION
const API = 'kg-api-' + VERSION

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  const keep = [SHELL, ASSETS, API]
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(fallbackUrl || req, res.clone())
    return res
  } catch {
    const hit = await cache.match(fallbackUrl || req)
    if (hit) return hit
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // map tiles etc. go straight to the network

  if (url.pathname.startsWith('/api/admin')) return // moderation data is never cached
  if (url.pathname.startsWith('/api/')) {
    // The device id header is per-user, but responses only differ in "mine" flags, so key on the URL.
    e.respondWith(networkFirst(new Request(url.href), API).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    return
  }
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, '/'))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
  }
})
