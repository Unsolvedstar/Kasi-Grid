import { db } from './db.js'
import { SUBURBS, findSuburb } from '../shared/suburbs.js'

// Public Overpass servers are often busy, so try each mirror in turn.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const UA = 'KasiGrid/0.2 (community resilience app)'
const DAY = 24 * 3600 * 1000

let stageCache = { at: 0, value: null }

// Eskom's status endpoint returns a bare number: 1 = no loadshedding, n = stage n-1.
export async function eskomStage() {
  if (stageCache.value !== null && Date.now() - stageCache.at < 5 * 60 * 1000) return stageCache.value
  const r = await fetch('https://loadshedding.eskom.co.za/LoadShedding/GetStatus', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
  const n = parseInt((await r.text()).trim(), 10)
  if (!r.ok || Number.isNaN(n) || n < 1) throw new Error('Unexpected response from Eskom')
  stageCache = { at: Date.now(), value: n - 1 }
  return n - 1
}

const classify = (t) => {
  if (t.amenity === 'food_bank' || t.social_facility === 'food_bank' || t.social_facility === 'soup_kitchen') return 'foodbank'
  if (t.amenity === 'marketplace' || t.shop === 'greengrocer') return 'market'
  if (t.shop === 'supermarket') return 'supermarket'
  if (t.shop) return 'spaza'
  if (t.amenity === 'hospital') return 'hospital'
  if (t.amenity === 'clinic') return 'clinic'
  if (t.amenity === 'drinking_water' || t.man_made === 'water_tap' || t.man_made === 'water_well') return 'water'
  return 'transport' // taxi ranks, bus and train stations
}

const NAMES = { spaza: 'shop', supermarket: 'supermarket', market: 'market', foodbank: 'food service', hospital: 'hospital', clinic: 'clinic', water: 'water point', transport: 'transport stop' }

// Two smaller queries are far more reliable on the public Overpass servers than one big one.
const QUERIES = {
  food: (a) =>
    `nwr["shop"~"^(convenience|supermarket|greengrocer|general)$"]${a};` +
    `nwr["amenity"~"^(marketplace|food_bank)$"]${a};` +
    `nwr["social_facility"~"^(food_bank|soup_kitchen)$"]${a};`,
  services: (a) =>
    `nwr["amenity"~"^(clinic|hospital|drinking_water|taxi|bus_station)$"]${a};` +
    `nwr["man_made"~"^(water_tap|water_well)$"]${a};` +
    `nwr["public_transport"="station"]${a};`,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Try each public server, and go round twice with a pause: they often answer 429/504 when busy.
async function overpass(q) {
  let lastStatus = 0
  for (let round = 0; round < 2; round++) {
    if (round) await sleep(2500)
    for (const url of OVERPASS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(q),
          signal: AbortSignal.timeout(40000),
        })
        if (r.ok) return (await r.json()).elements
        lastStatus = r.status
      } catch {
        lastStatus = 0
      }
    }
  }
  throw new Error('OpenStreetMap is busy, try again shortly' + (lastStatus ? ` (${lastStatus})` : ''))
}

async function queryOverpass(lat, lng, radius) {
  const around = `(around:${radius},${lat},${lng})`
  const run = (name) => overpass(`[out:json][timeout:30];(${QUERIES[name](around)});out center tags 200;`)
  // Food is the essential part. If only the services query fails we still return the food places.
  // Sequential on purpose: two simultaneous requests are more likely to be rate limited.
  const food = await run('food')
  const services = await run('services').catch(() => [])
  const elements = [...food, ...services]
  const seen = new Set()
  return elements
    .map((e) => {
      const t = e.tags || {}
      const type = classify(t)
      return {
        id: `osm-${e.type}-${e.id}`,
        name: t.name || t.brand || t.operator || 'Unnamed ' + NAMES[type],
        type,
        lat: e.lat ?? e.center?.lat,
        lng: e.lon ?? e.center?.lon,
        hours: t.opening_hours || '',
        source: 'osm',
      }
    })
    .filter((o) => o.lat != null && o.lng != null && !seen.has(o.id) && seen.add(o.id))
}

// Only known suburbs are queried, so the endpoint cannot be used as an open Overpass relay.
export async function outletsFor(suburbId) {
  const s = findSuburb(suburbId)
  if (!s) return null
  const key = 'osm2:' + s.id
  const hit = await db.execute({ sql: 'SELECT value, ts FROM cache WHERE key = ?', args: [key] })
  const row = hit.rows[0]
  if (row && Date.now() - Number(row.ts) < DAY) return JSON.parse(row.value)
  try {
    const outlets = await queryOverpass(s.lat, s.lng, 6000)
    await db.execute({ sql: 'INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?,?,?)', args: [key, JSON.stringify(outlets), Date.now()] })
    return outlets
  } catch (e) {
    if (row) return JSON.parse(row.value) // serve stale data rather than nothing
    throw e
  }
}
