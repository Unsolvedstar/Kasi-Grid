import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { normaliseSchedule, pickSchedule } from '../server/esp.js'
import { SUBURBS } from '../shared/suburbs.js'

// A fake EskomSePush 3.1 that follows the documented response shapes and checks the `token` header.
const TOKEN = 'tok-123'
let mode = 'ok' // 'ok' | 'reject'
const seen = []
const mock = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  seen.push(url.pathname + url.search)
  const json = (code, body) => {
    res.writeHead(code, { 'content-type': 'application/json', 'x-ratelimit-limit': '50', 'x-ratelimit-remaining': '41' })
    res.end(JSON.stringify(body))
  }
  if (mode === 'reject' || req.headers.token !== TOKEN) return json(401, { error: 'bad token' })
  const area = { id: 'za_gt_jhb_alexandra_x1', name: 'Alexandra', municipality: 'City of Johannesburg', province: 'Gauteng' }
  if (url.pathname === '/areas_search') return json(200, { areas: [area] })
  if (url.pathname === '/areas_nearby') {
    const lat = url.searchParams.get('lat')
    return json(200, { areas: [{ ...area, id: 'za_gt_jhb_near_' + lat.replace(/\W/g, ''), name: 'Near ' + lat }, { ...area, id: 'za_gt_jhb_second_' + lat.replace(/\W/g, ''), name: 'Second block ' + lat }] })
  }
  if (url.pathname === '/status') return json(200, { status: { eskom: { name: 'Eskom', stage: '0', next_stages: [] }, capetown: { name: 'Cape Town', stage: '3', stage_updated: '2026-09-22T10:00:00+02:00', next_stages: [] } } })
  if (url.pathname === '/area') {
    const id = url.searchParams.get('id')
    return json(200, {
      ...area,
      id,
      name: id === area.id ? area.name : 'Area ' + id,
      schedules: [{ id: 'eskomgautenglr-f', type: 'load_reduction', auto_enabled: true }, { id: 'eskde-7', type: 'loadshedding', auto_enabled: true }],
    })
  }
  if (url.pathname === '/schedule') {
    return json(200, {
      name: 'Eskom Direct Block 7',
      events: [],
      schedule: {
        days: [
          {
            date: '2026-09-22',
            name: 'Tuesday',
            schedule: [
              { name: 'Stage 2', slots: [{ start: '2026-09-22T22:00:00+02:00', end: '2026-09-23T00:30:00+02:00' }] },
              { name: 'Stage 3', slots: [{ start: '2026-09-22T02:00:00+02:00', end: '2026-09-22T04:30:00+02:00' }, { start: '2026-09-22T22:00:00+02:00', end: '2026-09-23T00:30:00+02:00' }, { start: 'garbage', end: 'x' }] },
              { name: 'Load Reduction', slots: [{ start: '2026-09-22T10:00:00+02:00', end: '2026-09-22T12:00:00+02:00' }] },
              { name: 'Stage 99', slots: [{ start: '2026-09-22T10:00:00+02:00', end: '2026-09-22T12:00:00+02:00' }] },
            ],
          },
          { date: 'not-a-date', name: 'Bad', schedule: [] },
        ],
      },
    })
  }
  json(404, {})
})

const ADMIN = 'admin-esp-test'
const A = 'aaaaaaaa-1111-2222-3333-444444444444'
let mockPort
let port
let child
let dir

const api = (p, { method = 'GET', body, admin = false } = {}) =>
  fetch(`http://localhost:${port}/api${p}`, {
    method,
    headers: { 'x-device-id': A, ...(admin ? { authorization: 'Bearer ' + ADMIN } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

const count = (prefix) => seen.filter((p) => p.startsWith(prefix)).length

before(async () => {
  await new Promise((r) => mock.listen(0, r))
  mockPort = mock.address().port
  port = 4400 + Math.floor(Math.random() * 400)
  dir = mkdtempSync(path.join(tmpdir(), 'kasi-esp-'))
  child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      NAMC_AUTO: 'off',
      ESP_AUTOLINK: 'off',
      ADMIN_TOKEN: ADMIN,
      ESP_TOKEN: TOKEN,
      ESP_BASE_URL: `http://localhost:${mockPort}`,
      ESP_DAILY_LIMIT: '120',
      ADMIN_LIMIT: '1000',
      DATABASE_URL: 'file:' + path.join(dir, 't.db').replaceAll('\\', '/'),
    },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    if (await fetch(`http://localhost:${port}/api/health`).then((r) => r.ok).catch(() => false)) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('server did not start')
})

after(() => {
  child?.kill()
  mock.close()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    /* Windows may still hold the file briefly */
  }
})

test('normaliseSchedule keeps only well-formed stages, slots and dates', () => {
  const n = normaliseSchedule({
    name: 'X',
    schedule: {
      days: [
        { date: '2026-09-22', schedule: [{ name: 'Stage 1', slots: [{ start: '2026-09-22T02:00:00+02:00', end: '2026-09-22T04:30:00+02:00' }, { start: 'oops', end: '<script>' }] }, { name: 'Load Reduction', slots: [] }, { name: 'Stage 12', slots: [] }] },
        { date: 'bad', schedule: [] },
      ],
    },
  })
  assert.equal(n.days.length, 1)
  assert.equal(n.days[0].stages.length, 8)
  assert.deepEqual(n.days[0].stages[0], ['02:00-04:30'])
  assert.deepEqual(normaliseSchedule({}).days, [])
})

test('pickSchedule prefers the auto-enabled loadshedding schedule and ignores load reduction', () => {
  assert.equal(pickSchedule([{ id: 'eskomgautenglr-f', type: 'load_reduction', auto_enabled: true }, { id: 'eskde-6', type: 'loadshedding' }, { id: 'eskde-14', type: 'loadshedding', auto_enabled: true }]), 'eskde-14')
  assert.equal(pickSchedule([{ id: 'eskde-6', type: 'loadshedding' }]), 'eskde-6')
  assert.equal(pickSchedule([{ id: 'lr', type: 'load_reduction' }]), null)
  assert.equal(pickSchedule(undefined), null)
})

test('no mapping yet: schedule reports unmapped, admin shows ESP enabled', async () => {
  assert.deepEqual((await api('/schedule?suburb=alex')).body, { available: false, reason: 'unmapped' })
  const info = await api('/admin/esp', { admin: true })
  assert.equal(info.body.enabled, true)
  assert.equal(info.body.callsToday, 0)
  assert.equal((await api('/schedule?suburb=zzz')).status, 400)
})

test('admin can search areas and link one to a suburb, with validation', async () => {
  const s = await api('/admin/esp/search?text=alex', { admin: true })
  assert.equal(s.body.areas[0].id, 'za_gt_jhb_alexandra_x1')
  assert.equal(s.body.areas[0].region, 'City of Johannesburg, Gauteng')
  assert.equal((await api('/admin/esp/search?text=a', { admin: true })).status, 502, 'too short a search is refused')
  const map = (b) => api('/admin/esp/map', { method: 'POST', body: b, admin: true })
  assert.equal((await map({ suburb: 'alex', areaId: 'bad id!', areaName: 'x' })).status, 400)
  assert.equal((await map({ suburb: 'nowhere', areaId: 'za_gt_jhb_alexandra_x1' })).status, 400)
  assert.equal((await api('/admin/esp/map', { method: 'POST', body: { suburb: 'alex', areaId: 'za_gt_jhb_alexandra_x1', areaName: 'Alexandra' } })).status, 401, 'needs the admin token')
  assert.equal((await map({ suburb: 'alex', areaId: 'za_gt_jhb_alexandra_x1', areaName: 'Alexandra' })).status, 200)
})

test('mapped suburb returns cleaned official slots; area and schedule are each fetched once and then cached', async () => {
  const r = await api('/schedule?suburb=alex')
  assert.equal(r.body.available, true)
  assert.equal(r.body.source, 'EskomSePush')
  assert.equal(r.body.area.name, 'Alexandra')
  assert.equal(r.body.days.length, 1, 'the malformed day is dropped')
  assert.deepEqual(r.body.days[0].stages[1], ['22:00-00:30'])
  assert.deepEqual(r.body.days[0].stages[2], ['02:00-04:30', '22:00-00:30'], 'garbage slot dropped, load reduction ignored')
  assert.equal(JSON.stringify(r.body).includes('token'), false, 'the token is never sent to the browser')
  assert.ok(seen.includes('/schedule?id=eskde-7'), 'follows the auto-enabled loadshedding schedule id')
  await api('/schedule?suburb=alex')
  assert.equal(count('/area?'), 1)
  assert.equal(count('/schedule?'), 1)
})

test('suburbs that share a schedule id share one cached schedule', async () => {
  assert.equal((await api('/admin/esp/map', { method: 'POST', body: { suburb: 'soweto', areaId: 'za_gt_jhb_alexandra_x1', areaName: 'Alexandra' }, admin: true })).status, 200)
  assert.equal((await api('/schedule?suburb=soweto')).body.available, true)
  assert.equal(count('/schedule?'), 1, 'no second schedule call')
  await api('/admin/esp/unmap', { method: 'POST', body: { suburb: 'soweto' }, admin: true })
})

test('the area list for a suburb includes the default, is cached, and needs no admin token', async () => {
  await api('/admin/esp/map', { method: 'POST', body: { suburb: 'soweto', areaId: 'za_gt_jhb_alexandra_x1', areaName: 'Alexandra' }, admin: true })
  const before = count('/areas_nearby')
  const r = await api('/areas?suburb=soweto')
  assert.equal(r.body.available, true)
  assert.equal(r.body.default, 'za_gt_jhb_alexandra_x1')
  assert.ok(r.body.areas.some((a) => a.id === 'za_gt_jhb_alexandra_x1'), 'the default area is always in the list')
  assert.ok(r.body.areas.length >= 2)
  await api('/areas?suburb=soweto')
  assert.equal(count('/areas_nearby'), before + 1, 'cached for a week')
  assert.equal((await api('/areas?suburb=zzz')).status, 400)
})

test('a chosen area is used only if the API has returned it before; anything else falls back to the default', async () => {
  const list = (await api('/areas?suburb=soweto')).body.areas
  const other = list.find((a) => a.id !== 'za_gt_jhb_alexandra_x1')
  const r = await api('/schedule?suburb=soweto&area=' + other.id)
  assert.equal(r.body.available, true)
  assert.equal(r.body.area.id, other.id)
  assert.equal(r.body.area.name, 'Area ' + other.id)
  const spent = count('/area?')
  const bogus = await api('/schedule?suburb=soweto&area=za_made_up_area_1234')
  assert.equal(bogus.body.area.id, 'za_gt_jhb_alexandra_x1', 'unknown area ids are ignored')
  assert.equal(count('/area?'), spent, 'and cost no credits')
  await api('/admin/esp/unmap', { method: 'POST', body: { suburb: 'soweto' }, admin: true })
})

test('public area search is validated, cached and capped so schedules keep their credits', async () => {
  assert.equal((await api('/areas/search?suburb=alex&text=a')).status, 400)
  assert.equal((await api('/areas/search?suburb=alex&text=' + encodeURIComponent('<script>'))).status, 400)
  assert.equal((await api('/areas/search?suburb=zzz&text=alex')).status, 400)
  const first = await api('/areas/search?suburb=alex&text=ext')
  assert.equal(first.status, 200)
  assert.ok(first.body.areas.length > 0)
  const before = count('/areas_search')
  await api('/areas/search?suburb=alex&text=ext')
  assert.equal(count('/areas_search'), before, 'the repeat is served from cache')
  let last
  for (let i = 0; i < 12; i++) {
    last = await api('/areas/search?suburb=alex&text=' + encodeURIComponent('block ' + i))
    if (last.status !== 200) break
  }
  assert.equal(last.status, 502)
  assert.match(last.body.error, /busy today/)
})

test('Cape Town has its own stage; other cities are refused; the status is cached', async () => {
  const before = count('/status')
  const r = await api('/city-stage?city=capetown')
  assert.equal(r.body.available, true)
  assert.equal(r.body.stage, 3)
  await api('/city-stage?city=capetown')
  assert.equal(count('/status'), before + 1, 'cached for an hour')
  assert.equal((await api('/city-stage?city=joburg')).status, 400)
})

test('auto-link finds the nearest area for every unlinked suburb', async () => {
  const r = await api('/admin/esp/autolink', { method: 'POST', body: {}, admin: true })
  assert.equal(r.status, 200)
  assert.equal(r.body.results.filter((x) => x.status === 'linked').length, SUBURBS.length - 1, 'alex was already linked')
  assert.ok(seen.some((p) => p.startsWith('/areas_nearby?lat=-26.2485&lon=27.854')), 'uses the suburb coordinates')
  const info = await api('/admin/esp', { admin: true })
  assert.equal(info.body.mappings.length, SUBURBS.length)
  assert.equal(info.body.quota.limit, 50, 'the API rate-limit headers are surfaced')
})

test('test-connection, a rejected token and the daily quota are all reported cleanly', async () => {
  assert.equal((await api('/admin/esp/test', { method: 'POST', admin: true })).body.ok, true)
  mode = 'reject'
  const rej = await api('/admin/esp/search?text=alex', { admin: true })
  assert.equal(rej.status, 502)
  assert.match(rej.body.error, /rejected the token/)
  mode = 'ok'
  let last
  for (let i = 0; i < 200; i++) {
    last = await api('/admin/esp/search?text=alex', { admin: true })
    if (last.status !== 200) break
  }
  assert.equal(last.status, 502)
  assert.match(last.body.error, /quota/)
  // cached schedule still works when the quota is gone
  assert.equal((await api('/schedule?suburb=alex')).body.available, true)
})

test('unlinking a suburb returns it to the simulated schedule', async () => {
  assert.equal((await api('/admin/esp/unmap', { method: 'POST', body: { suburb: 'alex' }, admin: true })).status, 200)
  assert.equal((await api('/schedule?suburb=alex')).body.reason, 'unmapped')
})
