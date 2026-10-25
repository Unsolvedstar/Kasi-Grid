import './env.js'
import path from 'node:path'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { db, migrate } from './db.js'
import { eskomStage, outletsFor } from './live.js'
import { CITIES, SUBURBS, distKm, findSuburb, inSouthAfrica, isSuburbId } from '../shared/suburbs.js'
import { STAPLES as STAPLE_LIST } from '../shared/namc.js'
import { weatherFor } from './weather.js'
import { autoLink, callsToday, cityStage, espEnabled, listMappings, nearbyForSuburb, quota, removeMapping, scheduleFor, searchAreas, searchNearSuburb, setMapping, startEspLinking, testConnection } from './esp.js'
import { durationStats, forecast } from '../shared/forecast.js'
import { startDemo } from './demo.js'
import { buildingsFor } from './buildings.js'
import { EQUIPMENT, MAX_HOURS, MIN_HOURS, PICKUPS, SERVICES, isDelivery, nearestCarers, personName, poolFor, quote } from '../shared/care.js'
import { CATALOGUE, ITEM_IDS, MAX_QTY, TIERS, cycleOf } from '../shared/restock.js'
import { foodReference, namcStatus, refreshNamc, startNamcSchedule } from './namc.js'

const app = express()
app.set('trust proxy', 1) // correct client IPs for rate limiting behind a host's proxy
app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' })
  next()
})

const REPORT_TYPES = ['power', 'water', 'road', 'other']
const SHARE_CATEGORIES = ['power', 'water', 'food', 'transport', 'other']
const PLACE_TYPES = ['spaza', 'supermarket', 'foodbank', 'garden', 'market', 'clinic', 'hospital', 'water', 'transport']
const STAPLES = STAPLE_LIST.map((x) => x.id)
// Curated suburbs, or any ~2 km grid community in South Africa (see shared/suburbs.js).
const SUBURB_IDS = { includes: isSuburbId }
const FLAG_HIDE_AT = 3
const WEEK = 7 * 24 * 3600 * 1000

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const bad = (msg) => new HttpError(400, msg)

// Anonymous per-device identity: enough to allow one confirmation per device and to let authors close their own posts.
const deviceOf = (req) => {
  const id = req.get('x-device-id') || ''
  return /^[a-zA-Z0-9-]{16,64}$/.test(id) ? id : null
}
const needDevice = (req) => {
  const d = deviceOf(req)
  if (!d) throw bad('Missing device id')
  return d
}

function text(v, field, max, { required = true } = {}) {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''
  if (!s) {
    if (required) throw bad(`${field} is required`)
    return ''
  }
  if (s.length > max) throw bad(`${field} must be at most ${max} characters`)
  if (/https?:\/\/|www\./i.test(s)) throw bad('Links are not allowed')
  if (/\d[\d\s-]{7,}\d/.test(s)) throw bad('Please do not post phone numbers or ID numbers')
  return s
}
const oneOf = (v, list, field) => {
  if (!list.includes(v)) throw bad(`Invalid ${field}`)
  return v
}

const api = express.Router()
api.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }))
const writeLimit = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.WRITE_LIMIT) || 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, slow down' } })
api.use((req, res, next) => (req.method === 'GET' ? next() : writeLimit(req, res, next)))
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

api.get('/health', wrap(async (req, res) => {
  await db.execute('SELECT 1')
  res.json({ ok: true })
}))

// ---- live sources
api.get('/eskom-status', wrap(async (req, res) => {
  try {
    res.json({ stage: await eskomStage() })
  } catch {
    res.status(502).json({ error: 'Eskom status unavailable' })
  }
}))

api.get('/outlets', wrap(async (req, res) => {
  let outlets
  try {
    outlets = await outletsFor(String(req.query.suburb || ''))
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
  if (!outlets) throw bad('Unknown suburb')
  res.json({ outlets })
}))

// Real building positions around a suburb centre, for the satellite Street view.
api.get('/buildings', wrap(async (req, res) => {
  let pts
  try {
    pts = await buildingsFor(String(req.query.suburb || ''))
  } catch (e) {
    return res.status(502).json({ error: 'Building data is busy, try again later' })
  }
  if (!pts) throw bad('Unknown suburb')
  res.set('Cache-Control', 'public, max-age=86400').json({ pts })
}))

// National food price reference: the newest NAMC report we could import, or the bundled one.
api.get('/food-reference', wrap(async (req, res) => {
  res.json(await foodReference())
}))

// Real loadshedding slots for a suburb via EskomSePush, when a token and an area mapping exist.
api.get('/schedule', wrap(async (req, res) => {
  const suburb = String(req.query.suburb || '')
  if (!SUBURB_IDS.includes(suburb)) throw bad('Unknown suburb')
  res.json(await scheduleFor(suburb, req.query.area ? String(req.query.area) : undefined))
}))

// The "choose your area" list for a suburb, and a name search (both cached, and the search is capped).
api.get('/areas', wrap(async (req, res) => {
  const suburb = String(req.query.suburb || '')
  if (!SUBURB_IDS.includes(suburb)) throw bad('Unknown suburb')
  if (!espEnabled()) return res.json({ available: false })
  try {
    let areas = await nearbyForSuburb(suburb)
    const def = (await listMappings()).find((m) => m.suburb === suburb)
    if (def && !areas.some((a) => a.id === def.areaId)) areas = [{ id: def.areaId, name: def.areaName, region: '' }, ...areas]
    res.json({ available: true, areas, default: def?.areaId || null })
  } catch {
    res.json({ available: false })
  }
}))
api.get('/areas/search', writeLimit, wrap(async (req, res) => {
  const suburb = String(req.query.suburb || '')
  if (!SUBURB_IDS.includes(suburb)) throw bad('Unknown suburb')
  if (!espEnabled()) throw bad('Official schedules are not switched on')
  try {
    res.json({ areas: await searchNearSuburb(suburb, req.query.text) })
  } catch (e) {
    res.status(/Type 2/.test(e.message) ? 400 : 502).json({ error: e.message })
  }
}))

// Stage for cities that set their own (Cape Town), so their residents are not shown Eskom's stage.
api.get('/city-stage', wrap(async (req, res) => {
  const city = String(req.query.city || '')
  if (!CITIES[city]?.ownLoadshedding) throw bad('This city follows the Eskom stage')
  res.json(await cityStage(city))
}))

api.get('/weather', wrap(async (req, res) => {
  let w
  try {
    w = await weatherFor(String(req.query.suburb || ''))
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
  if (!w) throw bad('Unknown suburb')
  res.json(w)
}))

// An optional exact pin: must be inside South Africa and near the community it is posted to.
const pinOf = (b, suburb) => {
  if (b.lat == null && b.lng == null) return { lat: null, lng: null, acc: null }
  const lat = Number(b.lat)
  const lng = Number(b.lng)
  if (!inSouthAfrica(lat, lng)) throw bad('That location is outside South Africa')
  const home = findSuburb(suburb)
  if (distKm(home, { lat, lng }) > (home.custom ? 5 : 40)) throw bad('Your pin is too far from your community')
  const acc = Number.isFinite(Number(b.acc)) ? Math.min(5000, Math.max(0, Math.round(Number(b.acc)))) : null
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, acc }
}

// ---- reports
const mapReport = (r) => ({
  id: Number(r.id), suburb: r.suburb, type: r.type, text: r.text, ts: Number(r.ts), confirms: Number(r.confirms),
  sample: !!r.sample, mine: !!r.mine, confirmedByMe: !!r.cby, lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng),
})

api.get('/reports', wrap(async (req, res) => {
  const d = deviceOf(req) || ''
  const rs = await db.execute({
    sql: `SELECT r.*, (r.owner = ?1) AS mine,
            EXISTS(SELECT 1 FROM report_confirms c WHERE c.report_id = r.id AND c.device = ?1) AS cby
          FROM reports r WHERE r.hidden = 0 AND (r.sample = 1 OR r.ts > ?2) ORDER BY r.ts DESC LIMIT 300`,
    args: [d, Date.now() - WEEK],
  })
  res.json({ reports: rs.rows.map(mapReport) })
}))

api.post('/reports', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const suburb = oneOf(b.suburb, SUBURB_IDS, 'suburb')
  const type = oneOf(b.type, REPORT_TYPES, 'type')
  const body = text(b.text, 'Description', 280)
  const pin = pinOf(b, suburb)
  const ins = await db.execute({ sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,owner,lat,lng,acc) VALUES (?,?,?,?,1,?,?,?,?)', args: [suburb, type, body, Date.now(), d, pin.lat, pin.lng, pin.acc] })
  await db.execute({ sql: 'INSERT OR IGNORE INTO report_confirms (report_id, device) VALUES (?,?)', args: [Number(ins.lastInsertRowid), d] })
  res.status(201).json({ id: Number(ins.lastInsertRowid) })
}))

api.post('/reports/:id/confirm', wrap(async (req, res) => {
  const d = needDevice(req)
  const id = Number(req.params.id)
  const ex = await db.execute({ sql: 'SELECT 1 FROM reports WHERE id = ? AND hidden = 0', args: [id] })
  if (!ex.rows.length) throw new HttpError(404, 'Report not found')
  const ins = await db.execute({ sql: 'INSERT OR IGNORE INTO report_confirms (report_id, device) VALUES (?,?)', args: [id, d] })
  if (ins.rowsAffected) await db.execute({ sql: 'UPDATE reports SET confirms = confirms + 1 WHERE id = ?', args: [id] })
  res.json({ ok: true })
}))

// ---- Outage Pulse: reports from enough different devices about the same problem in one suburb become a verified incident.
const PULSE_WINDOW = 6 * 3600 * 1000
const PULSE_MIN_DEVICES = 3

api.get('/pulse', wrap(async (req, res) => {
  const suburb = req.query.suburb ? oneOf(String(req.query.suburb), SUBURB_IDS, 'suburb') : null
  const since = Date.now() - PULSE_WINDOW
  const rows = await db.execute({
    sql: `SELECT r.id, r.suburb, r.type, r.ts, c.device AS dev, (SELECT COUNT(*) FROM report_restored x WHERE x.report_id = r.id) AS back
          FROM reports r JOIN report_confirms c ON c.report_id = r.id
          WHERE r.hidden = 0 AND r.sample = 0 AND r.ts > ?1 AND r.type IN ('power','water') AND (?2 IS NULL OR r.suburb = ?2)`,
    args: [since, suburb],
  })
  const groups = new Map()
  for (const r of rows.rows) {
    const g = groups.get(r.suburb + '|' + r.type) || { suburb: r.suburb, type: r.type, devices: new Set(), reports: new Map() }
    g.devices.add(r.dev)
    g.reports.set(Number(r.id), { ts: Number(r.ts), back: Number(r.back) })
    groups.set(r.suburb + '|' + r.type, g)
  }
  const d = deviceOf(req) || ''
  const mine = d ? new Set((await db.execute({ sql: 'SELECT report_id FROM report_restored WHERE device = ?', args: [d] })).rows.map((x) => Number(x.report_id))) : new Set()
  const incidents = []
  for (const g of groups.values()) {
    if (g.devices.size < PULSE_MIN_DEVICES) continue
    const ids = [...g.reports.keys()]
    const back = ids.reduce((n, id) => n + g.reports.get(id).back, 0)
    const lastId = ids.reduce((a, b) => (g.reports.get(a).ts >= g.reports.get(b).ts ? a : b))
    const need = Math.max(2, Math.ceil(g.devices.size / 2))
    incidents.push({
      suburb: g.suburb, type: g.type, devices: g.devices.size, since: Math.min(...ids.map((i) => g.reports.get(i).ts)),
      lastReportId: lastId, restoredVotes: back, restoredNeeded: need, resolved: back >= need, restoredByMe: ids.some((i) => mine.has(i)),
    })
  }
  incidents.sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.devices - a.devices)
  res.json({ incidents })
}))

api.post('/reports/:id/restored', wrap(async (req, res) => {
  const d = needDevice(req)
  const id = Number(req.params.id)
  const ex = await db.execute({ sql: 'SELECT 1 FROM reports WHERE id = ? AND hidden = 0', args: [id] })
  if (!ex.rows.length) throw new HttpError(404, 'Report not found')
  await db.execute({ sql: 'INSERT OR IGNORE INTO report_restored (report_id, device, ts) VALUES (?,?,?)', args: [id, d, Date.now()] })
  res.json({ ok: true })
}))

// Pattern forecast and early warning from the suburb's own history (real reports only).
api.get('/forecast', wrap(async (req, res) => {
  const suburb = oneOf(String(req.query.suburb || ''), SUBURB_IDS, 'suburb')
  const rows = await db.execute({
    sql: `SELECT r.ts, r.type, c.device AS dev FROM reports r JOIN report_confirms c ON c.report_id = r.id
          WHERE r.suburb = ? AND r.sample = 0 AND r.hidden = 0 AND r.ts > ? AND r.type IN ('power','water')`,
    args: [suburb, Date.now() - 90 * 24 * 3600 * 1000],
  })
  const by = new Map()
  for (const r of rows.rows) {
    const k = r.type + '|' + r.ts
    const e = by.get(k) || { type: r.type, ts: Number(r.ts), devices: [] }
    e.devices.push(r.dev)
    by.set(k, e)
  }
  // Past outages that neighbours marked "back on": time from the report to the first "back on" vote.
  const back = await db.execute({
    sql: `SELECT r.type, r.ts, MIN(x.ts) AS back FROM reports r JOIN report_restored x ON x.report_id = r.id
          WHERE r.suburb = ? AND r.sample = 0 AND r.hidden = 0 AND r.ts > ? AND r.type IN ('power','water') GROUP BY r.id`,
    args: [suburb, Date.now() - 90 * 24 * 3600 * 1000],
  })
  const hours = (type) => back.rows.filter((r) => r.type === type).map((r) => (Number(r.back) - Number(r.ts)) / 3600000)
  res.json({ ...forecast([...by.values()]), duration: { power: durationStats(hours('power')), water: durationStats(hours('water')) } })
}))

// Anonymous community totals for the last 7 days (no samples), shown in the app and on the admin page.
api.get('/stats', wrap(async (req, res) => {
  const since = Date.now() - WEEK
  const one = async (sql, args = [since]) => Number((await db.execute({ sql, args })).rows[0].n)
  const [reports, offers, restored, devices, suburbs] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM reports WHERE sample = 0 AND hidden = 0 AND ts > ?'),
    one('SELECT COUNT(*) AS n FROM shares WHERE sample = 0 AND hidden = 0 AND ts > ?'),
    one('SELECT COUNT(*) AS n FROM report_restored WHERE ts > ?'),
    one(`SELECT COUNT(*) AS n FROM (SELECT owner FROM reports WHERE sample = 0 AND ts > ?1 AND owner IS NOT NULL
         UNION SELECT owner FROM shares WHERE sample = 0 AND ts > ?1 AND owner IS NOT NULL
         UNION SELECT device FROM report_restored WHERE ts > ?1)`),
    one(`SELECT COUNT(*) AS n FROM (SELECT suburb FROM reports WHERE sample = 0 AND ts > ?1 UNION SELECT suburb FROM shares WHERE sample = 0 AND ts > ?1)`),
  ])
  res.json({ reports, offers, restored, devices, suburbs })
}))

// ---- community board
const mapShare = (s) => ({
  id: Number(s.id), kind: s.kind, category: s.category, suburb: s.suburb, title: s.title, detail: s.detail, name: s.name,
  ts: Number(s.ts), interested: Number(s.interested), sample: !!s.sample, mine: !!s.mine, interestedByMe: !!s.iby,
  lat: s.lat == null ? null : Math.round(Number(s.lat) * 1e3) / 1e3, lng: s.lng == null ? null : Math.round(Number(s.lng) * 1e3) / 1e3,
})

api.get('/shares', wrap(async (req, res) => {
  const d = deviceOf(req) || ''
  const rs = await db.execute({
    sql: `SELECT s.*, (s.owner = ?1) AS mine,
            EXISTS(SELECT 1 FROM share_interest i WHERE i.share_id = s.id AND i.device = ?1) AS iby
          FROM shares s WHERE s.hidden = 0 AND s.done = 0 ORDER BY s.ts DESC LIMIT 300`,
    args: [d],
  })
  res.json({ shares: rs.rows.map(mapShare) })
}))

api.post('/shares', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const kind = oneOf(b.kind, ['offer', 'request'], 'kind')
  const category = oneOf(b.category, SHARE_CATEGORIES, 'category')
  const suburb = oneOf(b.suburb, SUBURB_IDS, 'suburb')
  const title = text(b.title, 'Title', 100)
  const detail = text(b.detail, 'Details', 400, { required: false })
  const name = text(b.name, 'Name', 30, { required: false }) || 'A neighbour'
  const pin = pinOf(b, suburb)
  const ins = await db.execute({
    sql: 'INSERT INTO shares (kind,category,suburb,title,detail,name,ts,owner,lat,lng,acc) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    args: [kind, category, suburb, title, detail, name, Date.now(), d, pin.lat, pin.lng, pin.acc],
  })
  res.status(201).json({ id: Number(ins.lastInsertRowid) })
}))

api.post('/shares/:id/interest', wrap(async (req, res) => {
  const d = needDevice(req)
  const id = Number(req.params.id)
  const ex = await db.execute({ sql: 'SELECT 1 FROM shares WHERE id = ? AND hidden = 0 AND done = 0', args: [id] })
  if (!ex.rows.length) throw new HttpError(404, 'Post not found')
  const ins = await db.execute({ sql: 'INSERT OR IGNORE INTO share_interest (share_id, device) VALUES (?,?)', args: [id, d] })
  if (ins.rowsAffected) await db.execute({ sql: 'UPDATE shares SET interested = interested + 1 WHERE id = ?', args: [id] })
  res.json({ ok: true })
}))

api.post('/shares/:id/done', wrap(async (req, res) => {
  const d = needDevice(req)
  const r = await db.execute({ sql: 'UPDATE shares SET done = 1 WHERE id = ? AND owner = ?', args: [Number(req.params.id), d] })
  if (!r.rowsAffected) throw new HttpError(403, 'Only the person who posted this can close it')
  res.json({ ok: true })
}))

// ---- community-added places and reported prices
api.get('/places', wrap(async (req, res) => {
  const rs = await db.execute('SELECT * FROM places WHERE hidden = 0 ORDER BY ts DESC LIMIT 500')
  res.json({
    places: rs.rows.map((p) => ({
      id: 'c' + p.id, name: p.name, type: p.type, hours: p.hours, note: p.note, lat: Number(p.lat), lng: Number(p.lng), source: 'community',
    })),
  })
}))

api.post('/places', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const lat = Number(b.lat)
  const lng = Number(b.lng)
  // Roughly South Africa.
  if (!(lat > -35.5 && lat < -21.5 && lng > 16 && lng < 33.5)) throw bad('Location must be in South Africa')
  const row = {
    name: text(b.name, 'Name', 60),
    type: oneOf(b.type, PLACE_TYPES, 'type'),
    hours: text(b.hours, 'Hours', 80, { required: false }),
    note: text(b.note, 'Note', 200, { required: false }),
  }
  const ins = await db.execute({
    sql: 'INSERT INTO places (name,type,hours,note,lat,lng,ts,owner) VALUES (?,?,?,?,?,?,?,?)',
    args: [row.name, row.type, row.hours, row.note, lat, lng, Date.now(), d],
  })
  res.status(201).json({ id: 'c' + Number(ins.lastInsertRowid) })
}))

api.get('/prices', wrap(async (req, res) => {
  const rs = await db.execute({ sql: 'SELECT place_id, item, price, ts FROM prices WHERE ts > ?', args: [Date.now() - 30 * 24 * 3600 * 1000] })
  res.json({ prices: rs.rows.map((p) => ({ placeId: p.place_id, item: p.item, price: Number(p.price), ts: Number(p.ts) })) })
}))

api.post('/prices', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const placeId = String(b.placeId || '')
  if (!/^(osm-(node|way|relation)-\d{1,15}|c\d{1,9})$/.test(placeId)) throw bad('Invalid place')
  const item = oneOf(b.item, STAPLES, 'item')
  const price = Number(b.price)
  if (!(price >= 1 && price <= 1000)) throw bad('Price must be between R1 and R1000')
  await db.execute({
    sql: 'INSERT OR REPLACE INTO prices (place_id,item,price,ts,device) VALUES (?,?,?,?,?)',
    args: [placeId, item, Math.round(price * 100) / 100, Date.now(), d],
  })
  res.status(201).json({ ok: true })
}))

// ---- moderation: enough flags from different devices hides an item
api.post('/flag/:kind/:id', wrap(async (req, res) => {
  const d = needDevice(req)
  const table = { reports: 'reports', shares: 'shares', places: 'places' }[req.params.kind]
  if (!table) throw new HttpError(404, 'Unknown item')
  const id = Number(String(req.params.id).replace(/^c/, ''))
  await db.execute({ sql: 'INSERT OR IGNORE INTO flags (kind,target_id,device) VALUES (?,?,?)', args: [table, id, d] })
  const n = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM flags WHERE kind = ? AND target_id = ?', args: [table, id] })
  if (Number(n.rows[0].n) >= FLAG_HIDE_AT) await db.execute({ sql: `UPDATE ${table} SET hidden = 1 WHERE id = ?`, args: [id] })
  res.json({ ok: true })
}))

// ---- admin moderation. Disabled unless ADMIN_TOKEN is set (a random one is generated and printed outside production).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (process.env.NODE_ENV === 'production' ? '' : randomBytes(12).toString('hex'))
const digest = (v) => createHash('sha256').update(String(v)).digest()
const admin = express.Router()
admin.use(rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.ADMIN_LIMIT) || 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, slow down' } }))
admin.use((req, res, next) => {
  if (!ADMIN_TOKEN) return res.status(404).json({ error: 'Not found' })
  const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!timingSafeEqual(digest(given), digest(ADMIN_TOKEN))) return res.status(401).json({ error: 'Wrong admin token' })
  res.set('Cache-Control', 'no-store')
  next()
})

const TABLES = { reports: 'reports', shares: 'shares', places: 'places' }
const short = (d) => (d ? String(d).slice(0, 6) : '')

admin.get('/overview', wrap(async (req, res) => {
  const day = Date.now() - 24 * 3600 * 1000
  const flagCount = (kind) => `(SELECT COUNT(*) FROM flags f WHERE f.kind = '${kind}' AND f.target_id = x.id)`
  const [reports, shares, places] = await Promise.all([
    db.execute(`SELECT x.*, ${flagCount('reports')} AS flags FROM reports x ORDER BY (flags > 0) DESC, x.ts DESC LIMIT 200`),
    db.execute(`SELECT x.*, ${flagCount('shares')} AS flags FROM shares x ORDER BY (flags > 0) DESC, x.ts DESC LIMIT 200`),
    db.execute(`SELECT x.*, ${flagCount('places')} AS flags FROM places x ORDER BY (flags > 0) DESC, x.ts DESC LIMIT 200`),
  ])
  const shape = (kind, rows) => rows.rows.map((r) => ({
    kind, id: Number(r.id), title: r.title || r.name || r.text, detail: kind === 'reports' ? `${r.suburb} · ${r.type}` : kind === 'shares' ? `${r.suburb} · ${r.kind} · ${r.category}${r.detail ? ' · ' + r.detail : ''}` : `${r.type} · ${r.note || ''}`,
    ts: Number(r.ts), flags: Number(r.flags), hidden: !!r.hidden, sample: !!r.sample, done: !!r.done, owner: short(r.owner),
  }))
  const all = [...shape('reports', reports), ...shape('shares', shares), ...shape('places', places)]
  res.json({
    namc: await namcStatus(),
    stats: {
      total: all.length,
      last24h: all.filter((i) => i.ts > day && !i.sample).length,
      flagged: all.filter((i) => i.flags > 0 && !i.hidden).length,
      hidden: all.filter((i) => i.hidden).length,
    },
    items: all,
  })
}))

// EskomSePush setup: find an area, link it to a suburb, check the connection.
admin.get('/esp', wrap(async (req, res) => {
  res.json({ enabled: espEnabled(), callsToday: await callsToday(), quota: await quota(), mappings: await listMappings() })
}))
admin.get('/esp/search', wrap(async (req, res) => {
  if (!espEnabled()) throw bad('ESP_TOKEN is not set')
  try {
    res.json({ areas: await searchAreas(req.query.text) })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}))
admin.post('/esp/map', wrap(async (req, res) => {
  const b = req.body || {}
  if (!SUBURB_IDS.includes(b.suburb)) throw bad('Unknown suburb')
  try {
    await setMapping(b.suburb, String(b.areaId || ''), b.areaName)
  } catch (e) {
    throw bad(e.message)
  }
  res.json({ ok: true })
}))
admin.post('/esp/unmap', wrap(async (req, res) => {
  const b = req.body || {}
  if (!SUBURB_IDS.includes(b.suburb)) throw bad('Unknown suburb')
  await removeMapping(b.suburb)
  res.json({ ok: true })
}))
admin.post('/esp/autolink', wrap(async (req, res) => {
  if (!espEnabled()) throw bad('ESP_TOKEN is not set')
  res.json({ results: await autoLink() })
}))
admin.post('/esp/test', wrap(async (req, res) => {
  res.json(await testConnection())
}))

admin.post('/refresh-namc', wrap(async (req, res) => {
  res.json(await refreshNamc())
}))

admin.get('/care', wrap(async (req, res) => {
  const rows = await db.execute('SELECT * FROM care_bookings ORDER BY created DESC LIMIT 100')
  res.json({ bookings: rows.rows.map((r) => ({ ...shapeBooking(r), offered: JSON.parse(r.offered).map((id) => ({ id, name: carerName(id) })) })) })
}))

// Stand-in for the carer app: approve a prescription, accept or decline as an offered carer, mark done.
admin.post('/care/:id', wrap(async (req, res) => {
  const id = Number(req.params.id)
  const { action, carer } = req.body || {}
  const row = (await db.execute({ sql: 'SELECT * FROM care_bookings WHERE id = ?', args: [id] })).rows[0]
  if (!row) throw new HttpError(404, 'Booking not found')
  const set = (status, extra = {}) => db.execute({
    sql: 'UPDATE care_bookings SET status = ?, offered = ?, declined = ?, carer = ?, updated = ? WHERE id = ?',
    args: [status, extra.offered ?? row.offered, extra.declined ?? row.declined, extra.carer ?? row.carer, Date.now(), id],
  })
  if (action === 'approve_rx') {
    if (row.status !== 'awaiting_prescription') throw bad('This booking is not waiting for a prescription')
    const offered = row.service === 'equipment' ? [] : nearestCarers(row.suburb, JSON.parse(row.declined), undefined, poolFor(row.service)).map((c) => c.id)
    await set(row.service === 'equipment' ? 'accepted' : offered.length ? 'offered' : 'unfilled', { offered: JSON.stringify(offered) })
  } else if (action === 'accept') {
    if (row.status !== 'offered') throw bad('This booking is not open for offers')
    if (!JSON.parse(row.offered).includes(carer)) throw bad('That carer was not offered this job')
    await set('accepted', { carer })
  } else if (action === 'decline') {
    if (row.status !== 'offered') throw bad('This booking is not open for offers')
    const offeredNow = JSON.parse(row.offered)
    if (!offeredNow.includes(carer)) throw bad('That carer was not offered this job')
    const declined = [...new Set([...JSON.parse(row.declined), carer])]
    const left = offeredNow.filter((c) => c !== carer)
    // Re-offer to the next nearest carer who has not seen it; unfilled when nobody is left.
    const next = nearestCarers(row.suburb, [...declined, ...left], 1, poolFor(row.service)).map((c) => c.id)
    const offered = [...left, ...next]
    await set(offered.length ? 'offered' : 'unfilled', { offered: JSON.stringify(offered), declined: JSON.stringify(declined) })
  } else if (action === 'complete') {
    if (row.status !== 'accepted') throw bad('Only an accepted booking can be completed')
    await set('done')
  } else {
    throw bad('action must be approve_rx, accept, decline or complete')
  }
  res.json({ ok: true })
}))

admin.post('/:kind/:id', wrap(async (req, res) => {
  const table = TABLES[req.params.kind]
  if (!table) throw new HttpError(404, 'Unknown item')
  const id = Number(req.params.id)
  const action = (req.body || {}).action
  if (action === 'hide' || action === 'unhide') {
    if (action === 'unhide') await db.execute({ sql: 'DELETE FROM flags WHERE kind = ? AND target_id = ?', args: [table, id] }) // clear flags so it is not re-hidden by old ones
    const r = await db.execute({ sql: `UPDATE ${table} SET hidden = ? WHERE id = ?`, args: [action === 'hide' ? 1 : 0, id] })
    if (!r.rowsAffected) throw new HttpError(404, 'Item not found')
  } else if (action === 'delete') {
    const children = { reports: ['report_confirms', 'report_id'], shares: ['share_interest', 'share_id'] }[table]
    const stmts = [{ sql: 'DELETE FROM flags WHERE kind = ? AND target_id = ?', args: [table, id] }, { sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] }]
    if (children) stmts.push({ sql: `DELETE FROM ${children[0]} WHERE ${children[1]} = ?`, args: [id] })
    if (table === 'reports') stmts.push({ sql: 'DELETE FROM report_restored WHERE report_id = ?', args: [id] })
    if (table === 'places') stmts.push({ sql: 'DELETE FROM prices WHERE place_id = ?', args: ['c' + id] })
    await db.batch(stmts, 'write')
  } else {
    throw bad('action must be hide, unhide or delete')
  }
  res.json({ ok: true })
}))
app.use('/api/admin', admin)

// ---- home care booking (SweepSouth-style): price is set here, the nearest carers get the offer, the first to accept takes it.
// Carers are samples and there is no payment yet. An admin plays the carer app from /admin.
const CARE_MAX_OPEN = 5
const carerName = personName
const shapeBooking = (r) => {
  const offered = JSON.parse(r.offered)
  return {
    id: Number(r.id), suburb: r.suburb, service: r.service, hours: Number(r.hours), start: Number(r.start_ts), patient: r.patient, needs: r.needs, landmark: r.landmark,
    equipment: JSON.parse(r.equipment), total: Number(r.total), fee: Number(r.fee), urgent: !!Number(r.urgent), pickup: PICKUPS.find((p) => p.id === r.pickup)?.label || '', quoted: JSON.parse(r.quoted), status: r.status, carer: r.carer ? carerName(r.carer) : null,
    offeredTo: r.status === 'offered' ? offered.length : 0, created: Number(r.created),
  }
}

api.get('/care/catalogue', wrap(async (req, res) => {
  res.json({ services: SERVICES, equipment: EQUIPMENT, pickups: PICKUPS, minHours: MIN_HOURS, maxHours: MAX_HOURS, sample: true })
}))

api.post('/care/bookings', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const suburb = oneOf(b.suburb, SUBURB_IDS, 'suburb')
  const service = oneOf(b.service, Object.keys(SERVICES), 'service')
  const equipment = Array.isArray(b.equipment) ? b.equipment : []
  let q
  try {
    q = quote({ service, hours: b.hours, equipment, suburb, pickup: b.pickup, urgent: b.urgent === true })
  } catch (e) {
    throw bad(e.message)
  }
  const urgent = isDelivery(service) && b.urgent === true
  const start = urgent ? Date.now() : Number(b.start)
  if (!urgent && (!Number.isFinite(start) || start < Date.now() + 30 * 60 * 1000 || start > Date.now() + 60 * 24 * 3600 * 1000)) throw bad('Pick a start time from 30 minutes to 60 days from now')
  const patient = text(b.patient, 'Patient first name', 40)
  const needs = text(b.needs, 'Care needs', 280, { required: false })
  const landmark = text(b.landmark, 'Street or landmark', 120)
  const open = await db.execute({ sql: `SELECT COUNT(*) AS n FROM care_bookings WHERE device = ? AND status IN ('awaiting_prescription','offered','accepted')`, args: [d] })
  if (Number(open.rows[0].n) >= CARE_MAX_OPEN) throw bad('You have too many open bookings. Cancel one first.')
  const offered = q.needsPrescription || service === 'equipment' ? [] : nearestCarers(suburb, [], undefined, poolFor(service)).map((c) => c.id)
  const status = q.needsPrescription ? 'awaiting_prescription' : service === 'equipment' ? 'accepted' : offered.length ? 'offered' : 'unfilled'
  const now = Date.now()
  const ins = await db.execute({
    sql: `INSERT INTO care_bookings (device, suburb, service, hours, start_ts, patient, needs, landmark, equipment, total, quoted, status, offered, created, updated, pickup, urgent, fee)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14,?15,?16,?17)`,
    args: [d, suburb, service, q.hours, start, patient, needs, landmark, JSON.stringify(q.equipment), q.total, JSON.stringify(q.quotedItems), status, JSON.stringify(offered), now, isDelivery(service) ? String(b.pickup) : '', urgent ? 1 : 0, q.fee],
  })
  res.status(201).json({ id: Number(ins.lastInsertRowid), status, total: q.total, quotedItems: q.quotedItems })
}))

api.get('/care/bookings', wrap(async (req, res) => {
  const d = needDevice(req)
  const rows = await db.execute({ sql: 'SELECT * FROM care_bookings WHERE device = ? ORDER BY created DESC LIMIT 20', args: [d] })
  res.json({ bookings: rows.rows.map(shapeBooking) })
}))

api.post('/care/bookings/:id/cancel', wrap(async (req, res) => {
  const d = needDevice(req)
  const r = await db.execute({ sql: `UPDATE care_bookings SET status = 'cancelled', updated = ? WHERE id = ? AND device = ? AND status IN ('awaiting_prescription','offered','accepted','unfilled')`, args: [Date.now(), Number(req.params.id), d] })
  if (!r.rowsAffected) throw new HttpError(404, 'Booking not found or already finished')
  res.json({ ok: true })
}))

// ---- pooled restocking: spazas in a suburb order together, and the pool size sets the price tier (see shared/restock.js).
// One basket per device per cycle; saving it again replaces it. No payment or wholesaler is connected yet.
api.get('/restock', wrap(async (req, res) => {
  const suburb = oneOf(String(req.query.suburb || ''), SUBURB_IDS, 'suburb')
  const cycle = cycleOf()
  const rows = (await db.execute({ sql: 'SELECT device, shop, item, qty FROM restock_lines WHERE cycle = ? AND suburb = ?', args: [cycle.key, suburb] })).rows
  const totals = {}
  const shops = new Set()
  for (const r of rows) {
    totals[r.item] = (totals[r.item] || 0) + Number(r.qty)
    shops.add(r.device)
  }
  const d = deviceOf(req)
  const mine = {}
  let shop = ''
  for (const r of rows) if (d && r.device === d) { mine[r.item] = Number(r.qty); shop = r.shop }
  res.json({ cycle: cycle.key, cutoff: cycle.cutoff, shops: shops.size, totals, mine, shop, catalogue: CATALOGUE, tiers: TIERS, sample: true })
}))

api.post('/restock', wrap(async (req, res) => {
  const d = needDevice(req)
  const b = req.body || {}
  const suburb = oneOf(b.suburb, SUBURB_IDS, 'suburb')
  const shop = text(b.shop, 'Shop name', 30)
  const items = b.items && typeof b.items === 'object' && !Array.isArray(b.items) ? b.items : {}
  const lines = []
  for (const [id, q] of Object.entries(items)) {
    if (!ITEM_IDS.includes(id)) throw bad('Unknown item')
    if (!Number.isInteger(q) || q < 0 || q > MAX_QTY) throw bad(`Quantity must be a whole number from 0 to ${MAX_QTY}`)
    if (q > 0) lines.push([id, q])
  }
  const cycle = cycleOf()
  const now = Date.now()
  await db.batch([
    { sql: 'DELETE FROM restock_lines WHERE cycle = ? AND suburb = ? AND device = ?', args: [cycle.key, suburb, d] },
    ...lines.map(([id, q]) => ({ sql: 'INSERT INTO restock_lines (cycle, suburb, device, shop, item, qty, ts) VALUES (?,?,?,?,?,?,?)', args: [cycle.key, suburb, d, shop, id, q, now] })),
  ], 'write')
  res.json({ ok: true, items: lines.length })
}))

api.use((req, res) => res.status(404).json({ error: 'Not found' }))
app.use('/api', api)

// ---- serve the built frontend in production
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }))
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()))
}

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Invalid request body' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

await migrate()
if (process.env.DEMO_MODE === 'true') await startDemo(db)
// On Vercel the app is exported as a serverless function (api/index.js) and nothing listens or runs in the background.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000
  app.listen(port, () => {
    console.log(`Kasi Grid API on http://localhost:${port}`)
    startNamcSchedule()
    startEspLinking()
    if (!process.env.ADMIN_TOKEN && ADMIN_TOKEN) console.log(`Admin page: /admin  (dev token: ${ADMIN_TOKEN}, set ADMIN_TOKEN to choose your own)`)
    if (!ADMIN_TOKEN) console.log('Admin page disabled: set ADMIN_TOKEN to enable it')
  })
}

export default app
