import './env.js'
import path from 'node:path'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { db, migrate } from './db.js'
import { eskomStage, outletsFor } from './live.js'
import { CITIES, SUBURBS } from '../shared/suburbs.js'
import { STAPLES as STAPLE_LIST } from '../shared/namc.js'
import { weatherFor } from './weather.js'
import { autoLink, callsToday, cityStage, espEnabled, listMappings, nearbyForSuburb, quota, removeMapping, scheduleFor, searchAreas, searchNearSuburb, setMapping, startEspLinking, testConnection } from './esp.js'
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
const SUBURB_IDS = SUBURBS.map((s) => s.id)
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

// ---- reports
const mapReport = (r) => ({
  id: Number(r.id), suburb: r.suburb, type: r.type, text: r.text, ts: Number(r.ts), confirms: Number(r.confirms),
  sample: !!r.sample, mine: !!r.mine, confirmedByMe: !!r.cby,
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
  const ins = await db.execute({ sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,owner) VALUES (?,?,?,?,1,?)', args: [suburb, type, body, Date.now(), d] })
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

// ---- community board
const mapShare = (s) => ({
  id: Number(s.id), kind: s.kind, category: s.category, suburb: s.suburb, title: s.title, detail: s.detail, name: s.name,
  ts: Number(s.ts), interested: Number(s.interested), sample: !!s.sample, mine: !!s.mine, interestedByMe: !!s.iby,
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
  const ins = await db.execute({
    sql: 'INSERT INTO shares (kind,category,suburb,title,detail,name,ts,owner) VALUES (?,?,?,?,?,?,?,?)',
    args: [kind, category, suburb, title, detail, name, Date.now(), d],
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
    if (table === 'places') stmts.push({ sql: 'DELETE FROM prices WHERE place_id = ?', args: ['c' + id] })
    await db.batch(stmts, 'write')
  } else {
    throw bad('action must be hide, unhide or delete')
  }
  res.json({ ok: true })
}))
app.use('/api/admin', admin)

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
const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`Kasi Grid API on http://localhost:${port}`)
  startNamcSchedule()
  startEspLinking()
  if (!process.env.ADMIN_TOKEN && ADMIN_TOKEN) console.log(`Admin page: /admin  (dev token: ${ADMIN_TOKEN}, set ADMIN_TOKEN to choose your own)`)
  if (!ADMIN_TOKEN) console.log('Admin page disabled: set ADMIN_TOKEN to enable it')
})
