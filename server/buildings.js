import { db } from './db.js'
import { SUBURBS, findSuburb } from '../shared/suburbs.js'

// Real building positions near a suburb centre, from OpenStreetMap via Overpass, for the satellite Street view.
// The public Overpass servers are busy and meant for light use, so we try a few mirrors and keep each suburb's
// answer in the cache table for good: a suburb is fetched once, not once per visitor.
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const MAX = 110
// Suburb centres are not always on a built-up street, so widen the search until there are enough homes to draw.
const RADII = [230, 450, 800]
const inflight = new Map()

async function fetchFromOverpass(sub, radius) {
  const q = `[out:json][timeout:15];way["building"](around:${radius},${sub.lat},${sub.lng});out center 500;`
  let last
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: '*/*', 'User-Agent': 'KasiGrid/0.3 (community outage app)' },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(25000),
      })
      if (!r.ok) throw new Error(`Overpass ${r.status}`)
      const j = await r.json()
      // the MAX homes nearest the centre keep the picture tight
      return (j.elements || []).filter((e) => e.center)
        .map((e) => [Math.round(e.center.lat * 1e6) / 1e6, Math.round(e.center.lon * 1e6) / 1e6])
        .sort((a, b) => (a[0] - sub.lat) ** 2 + (a[1] - sub.lng) ** 2 - ((b[0] - sub.lat) ** 2 + (b[1] - sub.lng) ** 2))
        .slice(0, MAX)
    } catch (e) { last = e }
  }
  throw last
}

export async function buildingsFor(id) {
  const sub = findSuburb(id)
  if (!sub) return null
  const key = 'buildings2:' + id
  const hit = await db.execute({ sql: 'SELECT value FROM cache WHERE key = ?', args: [key] })
  if (hit.rows.length) return JSON.parse(hit.rows[0].value)
  if (!inflight.has(id)) {
    inflight.set(id, (async () => { let pts = []; for (const r of RADII) { pts = await fetchFromOverpass(sub, r); if (pts.length >= 40) break } return pts })()
      .then(async (pts) => {
        // an empty answer is only trusted from a successful call, so a failure is never cached
        await db.execute({ sql: 'INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?,?,?)', args: [key, JSON.stringify(pts), Date.now()] })
        return pts
      })
      .finally(() => inflight.delete(id)))
  }
  return inflight.get(id)
}
