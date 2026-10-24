import { db } from './db.js'
import { SUBURBS, findSuburb } from '../shared/suburbs.js'

// EskomSePush Business API 3.1: real loadshedding time slots per area.
//
// Needs ESP_TOKEN. Without it the app keeps using the simulated planning schedule. The flow is:
//   GET /areas_search?text=...        -> { areas: [{ id, name, municipality, province }] }
//   GET /areas_nearby?lat=&lon=&radius= -> same shape, nearest first
//   GET /area?id=<area id>            -> { name, municipality, province, schedules: [{ id: 'eskde-14', type, auto_enabled }] }
//   GET /schedule?id=<schedule id>    -> { name, schedule: { days: [{ date, schedule: [{ name: 'Stage 2', slots: [{ start, end }] }] }] } }
// The header is `token`. Every metered call costs 1 credit (Personal plan: 50 a day, reset 00:00 UTC).
//
// Credits are spent carefully: an area's schedule id is cached for a week, and schedules are cached per schedule id
// (many suburbs share one Eskom block) for 12 hours.

const HOUR = 3600 * 1000
const AREA_CACHE_HOURS = 24 * 7
const SCHEDULE_CACHE_HOURS = 12
const HHMM = /T(\d{2}:\d{2})/
const WEEK_HOURS = 24 * 7
const PUBLIC_SEARCH_PER_DAY = 8 // credits people can spend on searching, so schedules always have room
const STATUS_CACHE_MINUTES = 60
const STATUS_RESERVE = 8 // the city stage is skipped when fewer credits than this remain

export const espEnabled = () => !!process.env.ESP_TOKEN
const base = () => (process.env.ESP_BASE_URL || 'https://developer.sepush.co.za/business/3.1').replace(/\/$/, '')
const dailyLimit = () => Number(process.env.ESP_DAILY_LIMIT) || 45 // stay under the Personal plan's 50

const today = () => new Date().toISOString().slice(0, 10)

async function cacheGet(key) {
  const r = await db.execute({ sql: 'SELECT value, ts FROM cache WHERE key = ?', args: [key] })
  return r.rows.length ? { value: r.rows[0].value, ts: Number(r.rows[0].ts) } : null
}
const cacheSet = (key, value) => db.execute({ sql: 'INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?,?,?)', args: [key, typeof value === 'string' ? value : JSON.stringify(value), Date.now()] })

export async function callsToday() {
  const r = await cacheGet('esp:calls:' + today())
  return r ? Number(r.value) : 0
}

// The API's own count of remaining credits, from the last response headers.
export async function quota() {
  const r = await cacheGet('esp:quota')
  return r ? { ...JSON.parse(r.value), at: r.ts } : null
}

async function espGet(path) {
  const used = await callsToday()
  if (used >= dailyLimit()) throw new Error('Daily EskomSePush quota used up')
  await cacheSet('esp:calls:' + today(), String(used + 1))
  const r = await fetch(base() + path, { headers: { token: process.env.ESP_TOKEN, 'User-Agent': 'KasiGrid/0.3' }, signal: AbortSignal.timeout(15000) })
  const remaining = r.headers.get('x-ratelimit-remaining')
  if (remaining !== null) await cacheSet('esp:quota', { limit: Number(r.headers.get('x-ratelimit-limit')), remaining: Number(remaining), reset: r.headers.get('x-ratelimit-reset') })
  if (r.status === 401 || r.status === 403) throw new Error('EskomSePush rejected the token')
  if (r.status === 410) throw new Error('This EskomSePush API version has been retired. Set ESP_BASE_URL to the current one.')
  if (r.status === 429) throw new Error('EskomSePush quota reached')
  if (!r.ok) throw new Error(`EskomSePush returned ${r.status}`)
  return r.json()
}

const cleanArea = (a) => ({
  id: String(a.id),
  name: String(a.name || ''),
  region: [a.municipality, a.province].filter(Boolean).map(String).join(', '),
})

// Every area the API has returned to us. Only these may be chosen by visitors, so nobody can spend credits on made-up ids.
async function remember(areas) {
  for (const a of areas) await cacheSet('esp:known:' + a.id, { name: a.name, region: a.region })
  return areas
}
export async function knownArea(id) {
  if (!/^[\w.-]{3,80}$/.test(String(id))) return null
  const r = await cacheGet('esp:known:' + id)
  return r ? JSON.parse(r.value) : null
}

export async function searchAreas(text, lat, lng) {
  const q = String(text || '').trim()
  if (q.length < 2 || q.length > 60) throw new Error('Search text must be 2 to 60 characters')
  const bias = lat !== undefined && lng !== undefined ? `&lat=${Number(lat)}&lon=${Number(lng)}` : ''
  const j = await espGet('/areas_search?text=' + encodeURIComponent(q) + bias)
  return remember((j.areas || []).slice(0, 20).map(cleanArea))
}

export async function areasNearby(lat, lng, radiusKm = 3, limit = 12) {
  const j = await espGet(`/areas_nearby?lat=${Number(lat)}&lon=${Number(lng)}&radius=${Number(radiusKm)}`)
  return remember((j.areas || []).slice(0, limit).map(cleanArea))
}

const suburbById = (id) => findSuburb(id)

// The areas around a suburb, for the "choose your area" list. One credit per suburb a week.
export async function nearbyForSuburb(suburbId) {
  const sub = suburbById(suburbId)
  if (!sub) throw new Error('Unknown suburb')
  const key = 'esp:near:' + suburbId
  const hit = await cacheGet(key)
  if (hit && Date.now() - hit.ts < WEEK_HOURS * HOUR) return JSON.parse(hit.value)
  try {
    const areas = await areasNearby(sub.lat, sub.lng, 2.5, 12)
    await cacheSet(key, areas)
    return areas
  } catch (e) {
    if (hit) return JSON.parse(hit.value)
    throw e
  }
}

// A visitor's name search, biased to their suburb. Cached, and limited to a few credits a day for everyone.
export async function searchNearSuburb(suburbId, text) {
  const sub = suburbById(suburbId)
  if (!sub) throw new Error('Unknown suburb')
  const q = String(text || '').trim()
  if (!/^[\p{L}0-9 '().-]{2,40}$/u.test(q)) throw new Error('Type 2 to 40 letters or numbers')
  const key = `esp:search:${suburbId}:${q.toLowerCase()}`
  const hit = await cacheGet(key)
  if (hit && Date.now() - hit.ts < WEEK_HOURS * HOUR) return JSON.parse(hit.value)
  const pubKey = 'esp:pub:' + today()
  const used = Number((await cacheGet(pubKey))?.value || 0)
  if (used >= PUBLIC_SEARCH_PER_DAY) throw new Error('Search is busy today. Please pick from the list instead.')
  await cacheSet(pubKey, String(used + 1))
  const areas = (await searchAreas(q, sub.lat, sub.lng)).slice(0, 10)
  await cacheSet(key, areas)
  return areas
}

// Turns a 3.1 schedule response into days[].stages[stage - 1] = ["20:00-22:30", ...], keeping only well-formed data
// so nothing odd from the API reaches the browser. Times are read as written (South African time, +02:00).
export function normaliseSchedule(j) {
  const days = []
  for (const d of j?.schedule?.days || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) continue
    const stages = Array.from({ length: 8 }, () => [])
    for (const entry of d.schedule || []) {
      const m = /^Stage (\d)$/i.exec(String(entry.name || '').trim())
      if (!m || Number(m[1]) < 1 || Number(m[1]) > 8) continue
      for (const slot of entry.slots || []) {
        const a = HHMM.exec(String(slot.start || ''))
        const b = HHMM.exec(String(slot.end || ''))
        if (a && b) stages[Number(m[1]) - 1].push(`${a[1]}-${b[1]}`)
      }
    }
    days.push({ date: String(d.date), stages })
  }
  return { name: String(j?.name || ''), days }
}

// Picks the schedule to follow: the auto-enabled loadshedding one, else the first loadshedding one.
export function pickSchedule(schedules) {
  const list = (Array.isArray(schedules) ? schedules : []).filter((s) => s?.type === 'loadshedding' && /^[\w-]{2,40}$/.test(String(s.id)))
  return (list.find((s) => s.auto_enabled) || list[0])?.id || null
}

export async function getMapping(suburb) {
  const r = await db.execute({ sql: 'SELECT area_id, area_name FROM suburb_areas WHERE suburb = ?', args: [suburb] })
  return r.rows.length ? { areaId: String(r.rows[0].area_id), areaName: String(r.rows[0].area_name || '') } : null
}

export async function listMappings() {
  const r = await db.execute('SELECT suburb, area_id, area_name FROM suburb_areas ORDER BY suburb')
  return r.rows.map((x) => ({ suburb: String(x.suburb), areaId: String(x.area_id), areaName: String(x.area_name || '') }))
}

export async function setMapping(suburb, areaId, areaName) {
  if (!/^[\w.-]{3,80}$/.test(areaId)) throw new Error('Invalid area id')
  await db.execute({ sql: 'INSERT OR REPLACE INTO suburb_areas (suburb, area_id, area_name, updated) VALUES (?,?,?,?)', args: [suburb, areaId, String(areaName || '').slice(0, 80), Date.now()] })
}

export const removeMapping = (suburb) => db.execute({ sql: 'DELETE FROM suburb_areas WHERE suburb = ?', args: [suburb] })

// Links every suburb that has no area yet to the nearest ESP area, stopping before the quota runs out.
export async function autoLink(reserve = 12) {
  const done = []
  const have = new Set((await listMappings()).map((m) => m.suburb))
  for (const s of SUBURBS) {
    if (have.has(s.id)) continue
    if ((await callsToday()) >= dailyLimit() - reserve) {
      done.push({ suburb: s.id, status: 'skipped', message: 'Kept credits in reserve; run again tomorrow' })
      continue
    }
    try {
      const [best] = await areasNearby(s.lat, s.lng, 3)
      if (!best) done.push({ suburb: s.id, status: 'none', message: 'No area within 3 km' })
      else {
        await setMapping(s.id, best.id, best.name)
        done.push({ suburb: s.id, status: 'linked', areaName: best.name, region: best.region })
      }
    } catch (e) {
      done.push({ suburb: s.id, status: 'error', message: e.message })
      if (/quota|retired|rejected/.test(e.message)) break
    }
  }
  return done
}

async function areaInfo(areaId) {
  const key = 'esp:areainfo:' + areaId
  const hit = await cacheGet(key)
  if (hit && Date.now() - hit.ts < AREA_CACHE_HOURS * HOUR) return JSON.parse(hit.value)
  const j = await espGet('/area?id=' + encodeURIComponent(areaId))
  const info = { name: String(j.name || ''), region: [j.municipality, j.province].filter(Boolean).map(String).join(', '), scheduleId: pickSchedule(j.schedules) }
  await cacheSet(key, info)
  return info
}

// The schedule for a suburb's linked area. Stale data is served when the API is unreachable or out of credits.
export async function scheduleFor(suburb, areaOverride) {
  if (!espEnabled()) return { available: false, reason: 'disabled' }
  const map = await getMapping(suburb)
  let target = map
  if (areaOverride && areaOverride !== map?.areaId) {
    const k = await knownArea(areaOverride)
    if (k) target = { areaId: areaOverride, areaName: k.name }
  }
  if (!target) return { available: false, reason: 'unmapped' }
  const r = await scheduleForArea(target)
  // If the chosen area cannot be loaded (for example the day's credits are gone), fall back to the suburb's own area.
  if (!r.available && map && target !== map) return scheduleForArea(map)
  return r
}

async function scheduleForArea(map) {
  let info = null
  let stale = null
  try {
    info = await areaInfo(map.areaId)
  } catch (e) {
    const old = await cacheGet('esp:areainfo:' + map.areaId)
    if (!old) return { available: false, reason: 'error', message: e.message }
    info = JSON.parse(old.value)
  }
  if (!info.scheduleId) return { available: false, reason: 'error', message: 'This area has no loadshedding schedule' }
  const key = 'esp:sched:' + info.scheduleId
  const hit = await cacheGet(key)
  const shape = (v, ts, isStale) => ({ available: true, area: { id: map.areaId, name: info.name || map.areaName, region: info.region }, days: v.days, fetchedAt: ts, source: 'EskomSePush', ...(isStale ? { stale: true } : {}) })
  if (hit && Date.now() - hit.ts < SCHEDULE_CACHE_HOURS * HOUR) return shape(JSON.parse(hit.value), hit.ts)
  try {
    const sched = normaliseSchedule(await espGet('/schedule?id=' + encodeURIComponent(info.scheduleId)))
    await cacheSet(key, sched)
    return shape(sched, Date.now())
  } catch (e) {
    stale = hit
    if (stale) return shape(JSON.parse(stale.value), stale.ts, true)
    return { available: false, reason: 'error', message: e.message }
  }
}

// Cape Town sets its own stage. Read it from the API status, cached for an hour, and skipped when credits run low.
export async function cityStage(city) {
  if (!espEnabled()) return { available: false, reason: 'disabled' }
  const key = 'esp:status'
  const hit = await cacheGet(key)
  const read = (row) => {
    const e = JSON.parse(row.value)?.[city]
    const stage = Number(e?.stage)
    if (!e || !Number.isInteger(stage) || stage < 0 || stage > 8) return { available: false, reason: 'error' }
    return { available: true, stage, updated: String(e.stage_updated || ''), fetchedAt: row.ts, source: 'EskomSePush' }
  }
  if (hit && Date.now() - hit.ts < STATUS_CACHE_MINUTES * 60 * 1000) return read(hit)
  if ((await callsToday()) >= dailyLimit() - STATUS_RESERVE) return hit ? { ...read(hit), stale: true } : { available: false, reason: 'quota' }
  try {
    const j = await espGet('/status')
    const row = { value: JSON.stringify(j.status || {}), ts: Date.now() }
    await cacheSet(key, row.value)
    return read(row)
  } catch (e) {
    return hit ? { ...read(hit), stale: true } : { available: false, reason: 'error', message: e.message }
  }
}

// For the admin page: report exactly what the API answers, without changing any data.
export async function testConnection() {
  if (!espEnabled()) return { ok: false, message: 'ESP_TOKEN is not set' }
  try {
    const areas = await searchAreas('soweto')
    const q = await quota()
    return { ok: true, message: `Token accepted. Search returned ${areas.length} areas.${q ? ` ${q.remaining} of ${q.limit} credits left today.` : ''}`, sample: areas[0] || null, base: base() }
  } catch (e) {
    return { ok: false, message: e.message, base: base() }
  }
}

// Links any unlinked suburb to its nearest area in the background, a few at a time, keeping credits in reserve for
// schedules. Runs shortly after start and then every six hours; ESP_AUTOLINK=off disables it.
export function startEspLinking() {
  if (process.env.ESP_AUTOLINK === 'off') return
  const run = async () => {
    if (!espEnabled()) return
    try {
      await autoLink(20)
    } catch {
      /* try again next time */
    }
  }
  setTimeout(run, 20 * 1000).unref()
  setInterval(run, 6 * HOUR).unref()
}
