import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PORT = 3400 + Math.floor(Math.random() * 400)
const BASE = `http://localhost:${PORT}/api`
const TOKEN = 'test-admin-token-123'
const A = 'aaaaaaaa-1111-2222-3333-444444444444'
const B = 'bbbbbbbb-1111-2222-3333-444444444444'
let child
let dir

const call = (p, { device = A, method = 'GET', body } = {}) =>
  fetch(BASE + p, {
    method,
    headers: { ...(device ? { 'x-device-id': device } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'kasi-'))
  child = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, NAMC_AUTO: 'off', ESP_TOKEN: '', ADMIN_TOKEN: TOKEN, WRITE_LIMIT: '1000', PORT: String(PORT), DATABASE_URL: 'file:' + path.join(dir, 't.db').replace(/\\/g, '/') },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE + '/health')).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('server did not start')
})

after(() => {
  child?.kill()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    /* Windows may still hold the file briefly */
  }
})

test('seeds sample data on first start', async () => {
  const r = await call('/reports')
  assert.equal(r.status, 200)
  assert.ok(r.body.reports.length >= 4 && r.body.reports.every((x) => x.sample))
})

test('report lifecycle: create, confirm once per device, own report is flagged mine', async () => {
  const c = await call('/reports', { method: 'POST', body: { suburb: 'alex', type: 'water', text: 'No water on 5th Street' } })
  assert.equal(c.status, 201)
  const id = c.body.id
  await call(`/reports/${id}/confirm`, { device: B, method: 'POST' })
  await call(`/reports/${id}/confirm`, { device: B, method: 'POST' }) // duplicate
  await call(`/reports/${id}/confirm`, { device: A, method: 'POST' }) // author already counted
  const seenByB = (await call('/reports', { device: B })).body.reports.find((r) => r.id === id)
  assert.equal(seenByB.confirms, 2)
  assert.equal(seenByB.confirmedByMe, true)
  assert.equal(seenByB.mine, false)
  const seenByA = (await call('/reports', { device: A })).body.reports.find((r) => r.id === id)
  assert.equal(seenByA.mine, true)
})

test('rejects invalid and unsafe input', async () => {
  const post = (body, device = A) => call('/reports', { method: 'POST', body, device })
  assert.equal((await post({ suburb: 'alex', type: 'water', text: 'call 0821234567' })).status, 400)
  assert.equal((await post({ suburb: 'alex', type: 'water', text: 'see https://x.example' })).status, 400)
  assert.equal((await post({ suburb: 'nowhere', type: 'water', text: 'x' })).status, 400)
  assert.equal((await post({ suburb: 'alex', type: 'bogus', text: 'x' })).status, 400)
  assert.equal((await post({ suburb: 'alex', type: 'water', text: 'x'.repeat(281) })).status, 400)
  assert.equal((await post({ suburb: 'alex', type: 'water', text: 'no device' }, null)).status, 400)
})

test('board: only the author can close a post, interest counts once per device', async () => {
  const c = await call('/shares', { method: 'POST', body: { kind: 'offer', category: 'power', suburb: 'alex', title: 'Charging', detail: 'Solar', name: 'Test' } })
  const id = c.body.id
  assert.equal((await call(`/shares/${id}/done`, { device: B, method: 'POST' })).status, 403)
  await call(`/shares/${id}/interest`, { device: B, method: 'POST' })
  await call(`/shares/${id}/interest`, { device: B, method: 'POST' })
  const post = (await call('/shares', { device: B })).body.shares.find((s) => s.id === id)
  assert.equal(post.interested, 1)
  assert.equal((await call(`/shares/${id}/done`, { method: 'POST' })).status, 200)
  assert.ok(!(await call('/shares')).body.shares.some((s) => s.id === id), 'closed posts disappear')
})

test('places must be in South Africa, prices must be sensible', async () => {
  const place = (lat, lng) => call('/places', { method: 'POST', body: { name: 'Test Spaza', type: 'spaza', lat, lng } })
  assert.equal((await place(51.5, -0.1)).status, 400)
  const ok = await place(-26.1, 28.1)
  assert.equal(ok.status, 201)
  const price = (body) => call('/prices', { method: 'POST', body })
  assert.equal((await price({ placeId: ok.body.id, item: 'bread', price: 19.5 })).status, 201)
  assert.equal((await price({ placeId: ok.body.id, item: 'bread', price: 0 })).status, 400)
  assert.equal((await price({ placeId: ok.body.id, item: 'bread', price: 5000 })).status, 400)
  assert.equal((await price({ placeId: 'drop table', item: 'bread', price: 10 })).status, 400)
  assert.equal((await price({ placeId: ok.body.id, item: 'gold', price: 10 })).status, 400)
  const list = (await call('/prices')).body.prices
  assert.ok(list.some((p) => p.placeId === ok.body.id && p.item === 'bread' && p.price === 19.5))
})

test('three flags from different devices hide an item', async () => {
  const c = await call('/shares', { method: 'POST', body: { kind: 'request', category: 'other', suburb: 'soweto', title: 'Spammy post' } })
  const id = c.body.id
  for (const n of [1, 2, 3]) await call(`/flag/shares/${id}`, { device: `cccccccc-0000-0000-0000-00000000000${n}`, method: 'POST' })
  assert.ok(!(await call('/shares')).body.shares.some((s) => s.id === id))
})

test('unknown suburb and routes are handled', async () => {
  assert.equal((await call('/outlets?suburb=zzz')).status, 400)
  assert.equal((await call('/nope')).status, 404)
})

const admin = (p, { token = TOKEN, method = 'GET', body } = {}) =>
  fetch(BASE + '/admin' + p, {
    method,
    headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

test('admin: rejects missing and wrong tokens, accepts the right one', async () => {
  assert.equal((await admin('/overview', { token: '' })).status, 401)
  assert.equal((await admin('/overview', { token: 'nope' })).status, 401)
  const ok = await admin('/overview')
  assert.equal(ok.status, 200)
  assert.ok(ok.body.stats.total > 0 && Array.isArray(ok.body.items))
})

test('admin: hide, restore and delete a post', async () => {
  const c = await call('/shares', { method: 'POST', body: { kind: 'request', category: 'other', suburb: 'alex', title: 'Moderation target' } })
  const id = c.body.id
  await call(`/shares/${id}/interest`, { device: B, method: 'POST' })
  const inBoard = async () => (await call('/shares')).body.shares.some((s) => s.id === id)
  assert.ok(await inBoard())
  assert.equal((await admin(`/shares/${id}`, { method: 'POST', body: { action: 'hide' } })).status, 200)
  assert.ok(!(await inBoard()), 'hidden posts leave the public board')
  const seen = (await admin('/overview')).body.items.find((i) => i.kind === 'shares' && i.id === id)
  assert.equal(seen.hidden, true, 'admins can still see hidden posts')
  assert.equal((await admin(`/shares/${id}`, { method: 'POST', body: { action: 'unhide' } })).status, 200)
  assert.ok(await inBoard())
  assert.equal((await admin(`/shares/${id}`, { method: 'POST', body: { action: 'delete' } })).status, 200)
  assert.ok(!(await admin('/overview')).body.items.some((i) => i.kind === 'shares' && i.id === id), 'deleted for good')
})

test('admin: flagged items surface, restoring clears flags, bad input rejected', async () => {
  const c = await call('/reports', { method: 'POST', body: { suburb: 'soweto', type: 'other', text: 'Suspicious report' } })
  const id = c.body.id
  await call(`/flag/reports/${id}`, { device: B, method: 'POST' })
  const item = () => admin('/overview').then((r) => r.body.items.find((i) => i.kind === 'reports' && i.id === id))
  assert.equal((await item()).flags, 1)
  for (const n of [1, 2]) await call(`/flag/reports/${id}`, { device: `dddddddd-0000-0000-0000-00000000000${n}`, method: 'POST' })
  assert.equal((await item()).hidden, true, 'three flags auto-hide it')
  await admin(`/reports/${id}`, { method: 'POST', body: { action: 'unhide' } })
  const after = await item()
  assert.equal(after.hidden, false)
  assert.equal(after.flags, 0, 'old flags are cleared so it is not instantly re-hidden')
  assert.equal((await admin(`/reports/${id}`, { method: 'POST', body: { action: 'explode' } })).status, 400)
  assert.equal((await admin('/bogus/1', { method: 'POST', body: { action: 'hide' } })).status, 404)
  assert.equal((await admin(`/reports/${id}`, { token: 'nope', method: 'POST', body: { action: 'delete' } })).status, 401)
})

test('admin: disabled in production when no ADMIN_TOKEN is set', async () => {
  const port = PORT + 500
  const d2 = mkdtempSync(path.join(tmpdir(), 'kasi2-'))
  const env = { ...process.env, PORT: String(port), NODE_ENV: 'production', DATABASE_URL: 'file:' + path.join(d2, 't.db').replaceAll('\\', '/') }
  delete env.ADMIN_TOKEN
  const c2 = spawn(process.execPath, ['server/index.js'], { env, stdio: 'ignore' })
  try {
    let up = false
    for (let i = 0; i < 50 && !up; i++) {
      up = await fetch(`http://localhost:${port}/api/health`).then((r) => r.ok).catch(() => false)
      if (!up) await new Promise((r) => setTimeout(r, 200))
    }
    assert.ok(up)
    const r = await fetch(`http://localhost:${port}/api/admin/overview`, { headers: { authorization: 'Bearer anything' } })
    assert.equal(r.status, 404)
  } finally {
    c2.kill()
  }
})

test('write rate limit returns 429 once exceeded', async () => {
  const port = PORT + 600
  const d3 = mkdtempSync(path.join(tmpdir(), 'kasi3-'))
  const env = { ...process.env, PORT: String(port), WRITE_LIMIT: '3', DATABASE_URL: 'file:' + path.join(d3, 't.db').replaceAll('\\', '/') }
  const c3 = spawn(process.execPath, ['server/index.js'], { env, stdio: 'ignore' })
  try {
    let up = false
    for (let i = 0; i < 50 && !up; i++) {
      up = await fetch(`http://localhost:${port}/api/health`).then((r) => r.ok).catch(() => false)
      if (!up) await new Promise((r) => setTimeout(r, 200))
    }
    assert.ok(up)
    const codes = []
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`http://localhost:${port}/api/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': A },
        body: JSON.stringify({ suburb: 'alex', type: 'other', text: 'rate limit probe' }),
      })
      codes.push(r.status)
    }
    assert.deepEqual(codes, [201, 201, 201, 429, 429])
  } finally {
    c3.kill()
  }
})

test('new place types and staples are accepted, unknown ones rejected', async () => {
  const place = (type) => call('/places', { method: 'POST', body: { name: 'Test point', type, lat: -26.1, lng: 28.1 } })
  for (const type of ['clinic', 'hospital', 'water', 'transport']) assert.equal((await place(type)).status, 201, type)
  assert.equal((await place('casino')).status, 400)
  const p = await place('spaza')
  for (const item of ['rice', 'sugar', 'potatoes', 'whitebread']) {
    assert.equal((await call('/prices', { method: 'POST', body: { placeId: p.body.id, item, price: 20 } })).status, 201, item)
  }
})

test('weather endpoint returns a 5-day forecast (or a clean 502 if the provider is down)', async () => {
  const r = await call('/weather?suburb=alex')
  assert.ok([200, 502].includes(r.status), 'status ' + r.status)
  if (r.status === 200) {
    assert.equal(r.body.days.length, 5)
    assert.ok(r.body.days.every((d) => typeof d.max === 'number' && typeof d.min === 'number' && d.max >= d.min))
    assert.ok(Array.isArray(r.body.alerts))
  } else assert.ok(r.body.error)
  assert.equal((await call('/weather?suburb=zzz')).status, 400)
})

test('schedule is reported as disabled without an EskomSePush token; food reference is served', async () => {
  assert.deepEqual((await call('/schedule?suburb=alex')).body, { available: false, reason: 'disabled' })
  const f = await call('/food-reference')
  assert.equal(f.status, 200)
  assert.equal(f.body.source, 'bundled')
  assert.equal(f.body.staples.length, 12)
  assert.equal(f.body.snapshot.items.length, 28)
})

test('new suburbs work everywhere and admin reports the NAMC status', async () => {
  for (const suburb of ['khayelitsha', 'umlazi', 'motherwell']) {
    assert.equal((await call('/reports', { method: 'POST', body: { suburb, type: 'other', text: 'test report' } })).status, 201, suburb)
  }
  const o = await admin('/overview')
  assert.equal(o.body.namc.current.issueNo, 129)
})

test('outage pulse: three devices make a verified incident, restored votes resolve it', async () => {
  const devs = ['cccccccc-1111-2222-3333-444444444444', 'dddddddd-1111-2222-3333-444444444444', 'eeeeeeee-1111-2222-3333-444444444444']
  const sub = 'mamelodi'
  assert.equal((await call(`/pulse?suburb=${sub}`)).body.incidents.length, 0)
  const c = await call('/reports', { device: devs[0], method: 'POST', body: { suburb: sub, type: 'water', text: 'No water since morning' } })
  await call(`/reports/${c.body.id}/confirm`, { device: devs[1], method: 'POST' })
  assert.equal((await call(`/pulse?suburb=${sub}`)).body.incidents.length, 0) // two devices is not enough
  await call(`/reports/${c.body.id}/confirm`, { device: devs[2], method: 'POST' })
  let inc = (await call(`/pulse?suburb=${sub}`, { device: devs[0] })).body.incidents
  assert.equal(inc.length, 1)
  assert.equal(inc[0].devices, 3)
  assert.equal(inc[0].resolved, false)
  await call(`/reports/${c.body.id}/restored`, { device: devs[0], method: 'POST' })
  await call(`/reports/${c.body.id}/restored`, { device: devs[0], method: 'POST' }) // duplicate vote ignored
  inc = (await call(`/pulse?suburb=${sub}`, { device: devs[0] })).body.incidents
  assert.equal(inc[0].restoredVotes, 1)
  assert.equal(inc[0].restoredByMe, true)
  await call(`/reports/${c.body.id}/restored`, { device: devs[1], method: 'POST' })
  assert.equal((await call(`/pulse?suburb=${sub}`)).body.incidents[0].resolved, true)
  assert.equal((await call('/pulse?suburb=nowhere')).status, 400)
})
