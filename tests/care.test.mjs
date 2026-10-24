import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { quote, nearestCarers, runtimeHours, batteryRuntime, remainingHours, batteryStage, ambulanceDue, pickupsFor, RUNNERS, OFFER_COUNT, OFFER_RADIUS_KM } from '../shared/care.js'

test('quote: carer hours plus equipment, with supplier-quoted items listed separately', () => {
  const q = quote({ service: 'companion', hours: 4, equipment: ['o2', 'bat', 'o2'] })
  assert.equal(q.carer, 360)
  assert.equal(q.equipmentTotal, 1920, 'duplicates ignored, quoted items not priced')
  assert.equal(q.total, 2280)
  assert.deepEqual(q.quotedItems, ['bat'])
  assert.equal(q.needsPrescription, true)
  assert.equal(quote({ service: 'equipment', equipment: ['bat'] }).needsPrescription, false)
})

test('quote: rejects bad hours, unknown items and empty equipment orders', () => {
  assert.throws(() => quote({ service: 'postop', hours: 1 }))
  assert.throws(() => quote({ service: 'postop', hours: 13 }))
  assert.throws(() => quote({ service: 'postop', hours: 2.5 }))
  assert.throws(() => quote({ service: 'companion', hours: 3, equipment: ['jetpack'] }))
  assert.throws(() => quote({ service: 'equipment', equipment: [] }))
  assert.throws(() => quote({ service: 'nope', hours: 3 }))
})

test('matching: nearest carers first, inside the radius, skipping those who declined', () => {
  const list = nearestCarers('alex')
  assert.ok(list.length > 0 && list.length <= OFFER_COUNT)
  assert.ok(list.every((c) => c.km <= OFFER_RADIUS_KM))
  assert.deepEqual(list.map((c) => c.km), [...list.map((c) => c.km)].sort((a, b) => a - b))
  assert.ok(['c2', 'c3'].includes(list[0].id), 'a carer in Alexandra is nearest to Alexandra')
  assert.ok(!nearestCarers('alex', [list[0].id]).some((c) => c.id === list[0].id))
  assert.deepEqual(nearestCarers('nowhere'), [])
})

test('battery runtime: watt-hours after inverter loss divided by device watts', () => {
  assert.ok(Math.abs(runtimeHours(1000, 100) - 8.5) < 1e-9)
  assert.equal(runtimeHours(0, 100), 0)
  assert.equal(runtimeHours(500, 0), 0)
})

test('delivery quote: fee grows with distance, urgent adds a surcharge, oxygen needs a cylinder', () => {
  const near = quote({ service: 'meds', suburb: 'alex', pickup: 'rx-alex' })
  assert.equal(near.fee, 45)
  assert.equal(near.total, 45, 'the medicine itself is paid to the pharmacy, not through the app')
  assert.equal(near.needsPrescription, true)
  const far = quote({ service: 'meds', suburb: 'alex', pickup: 'rx-tembisa' })
  assert.ok(far.fee > near.fee && far.km > 10)
  assert.equal(quote({ service: 'meds', suburb: 'alex', pickup: 'rx-alex', urgent: true }).fee, 75)
  const o2 = quote({ service: 'oxygen', equipment: ['swap'], suburb: 'soweto', pickup: 'o2-soweto' })
  assert.equal(o2.total, 45 + 420)
  assert.throws(() => quote({ service: 'oxygen', equipment: [], suburb: 'soweto', pickup: 'o2-soweto' }), /cylinder/)
  assert.throws(() => quote({ service: 'oxygen', equipment: ['swap'], suburb: 'soweto', pickup: 'rx-soweto' }), /collected/, 'a clinic is not an oxygen depot')
  assert.throws(() => quote({ service: 'meds', suburb: 'alex', pickup: 'rx-khayelitsha' }), /away/, 'too far')
})

test('pickups: nearest first, and runners are matched for deliveries', () => {
  const list = pickupsFor('oxygen', 'soweto')
  assert.equal(list[0].id, 'o2-soweto')
  assert.ok(pickupsFor('meds', 'alex').every((p) => p.kind === 'meds'))
  assert.ok(nearestCarers('alex', [], 3, RUNNERS).every((r) => r.id.startsWith('r')))
})

// ---- API
const PORT = 3800 + Math.floor(Math.random() * 150)
const BASE = `http://localhost:${PORT}/api`
const TOKEN = 'test-admin-token-123'
const A = 'aaaaaaaa-1111-2222-3333-555555555555'
const B = 'bbbbbbbb-1111-2222-3333-555555555555'
let child
let dir
const call = (p, { device = A, method = 'GET', body, admin } = {}) =>
  fetch(BASE + p, {
    method,
    headers: { ...(device ? { 'x-device-id': device } : {}), ...(admin ? { authorization: 'Bearer ' + TOKEN } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
const soon = () => Date.now() + 3 * 3600 * 1000
const booking = (extra = {}) => ({ suburb: 'alex', service: 'companion', hours: 3, start: soon(), patient: 'Gogo', needs: 'Needs help with meals', landmark: 'Near the clinic on 3rd Ave', equipment: [], ...extra })

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'kasi-care-'))
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

test('care API: the server sets the price and offers the job to the nearest carers', async () => {
  const c = await call('/care/bookings', { method: 'POST', body: booking({ total: 1 }) })
  assert.equal(c.status, 201)
  assert.equal(c.body.total, 270, 'a client-sent total is ignored')
  assert.equal(c.body.status, 'offered')
  const mine = await call('/care/bookings')
  assert.equal(mine.body.bookings.length, 1)
  assert.ok(mine.body.bookings[0].offeredTo >= 1)
  assert.equal((await call('/care/bookings', { device: B })).body.bookings.length, 0, 'bookings are private to the device')
})

test('care API: validation and privacy rules', async () => {
  for (const bad of [
    booking({ hours: 1 }),
    booking({ start: Date.now() - 1000 }),
    booking({ suburb: 'mars' }),
    booking({ landmark: 'call me on 082 123 4567' }),
    booking({ patient: '' }),
    booking({ needs: 'see https://x.example' }),
    booking({ equipment: ['jetpack'] }),
  ]) assert.equal((await call('/care/bookings', { method: 'POST', body: bad })).status, 400)
  assert.equal((await call('/care/bookings', { device: null, method: 'POST', body: booking() })).status, 400, 'device id required')
})

test('care API: oxygen waits for a prescription, then is offered; first accept wins; done', async () => {
  const c = await call('/care/bookings', { device: B, method: 'POST', body: booking({ equipment: ['o2'] }) })
  assert.equal(c.body.status, 'awaiting_prescription')
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'accept', carer: 'c2' } })).status, 400, 'cannot accept before approval')
  assert.equal((await call(`/admin/care/${c.body.id}`, { device: null, method: 'POST', body: { action: 'approve_rx' } })).status, 401)
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'approve_rx' } })).status, 200)
  const list = (await call('/admin/care', { admin: true })).body.bookings.find((b) => b.id === c.body.id)
  assert.equal(list.status, 'offered')
  const first = list.offered[0].id
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'accept', carer: 'c10' } })).status, 400, 'only offered carers can accept')
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'accept', carer: first } })).status, 200)
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'accept', carer: first } })).status, 400, 'second accept is refused')
  const seen = (await call('/care/bookings', { device: B })).body.bookings[0]
  assert.equal(seen.status, 'accepted')
  assert.ok(seen.carer)
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'complete' } })).status, 200)
})

test('care API: a decline moves the job on, and runs out as unfilled', async () => {
  const c = await call('/care/bookings', { method: 'POST', body: booking({ suburb: 'orange' }) })
  let guard = 0
  for (;;) {
    const b = (await call('/admin/care', { admin: true })).body.bookings.find((x) => x.id === c.body.id)
    if (b.status !== 'offered' || guard++ > 10) {
      assert.equal(b.status, 'unfilled')
      break
    }
    await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'decline', carer: b.offered[0].id } })
  }
})

test('care API: owners can cancel, others cannot; equipment-only needs no carer', async () => {
  const c = await call('/care/bookings', { method: 'POST', body: booking() })
  assert.equal((await call(`/care/bookings/${c.body.id}/cancel`, { device: B, method: 'POST' })).status, 404)
  assert.equal((await call(`/care/bookings/${c.body.id}/cancel`, { method: 'POST' })).status, 200)
  assert.equal((await call(`/care/bookings/${c.body.id}/cancel`, { method: 'POST' })).status, 404, 'already cancelled')
  const e = await call('/care/bookings', { method: 'POST', body: booking({ service: 'equipment', hours: 0, equipment: ['bat'] }) })
  assert.equal(e.status, 201)
  assert.deepEqual(e.body.quotedItems, ['bat'])
})

test('forecast API returns outage-duration stats, null until there is enough history', async () => {
  const f = await call('/forecast?suburb=alex')
  assert.equal(f.status, 200)
  assert.deepEqual(f.body.duration, { power: null, water: null })
  assert.equal((await call('/forecast?suburb=nowhere')).status, 400)
})

test('delivery API: medicine waits for a prescription, then goes to nearby runners, not carers', async () => {
  const body = { suburb: 'alex', service: 'meds', pickup: 'rx-alex', start: soon(), patient: 'Gogo', needs: '', landmark: 'Near the clinic on 3rd Ave', equipment: [] }
  const c = await call('/care/bookings', { device: B, method: 'POST', body })
  assert.equal(c.status, 201)
  assert.equal(c.body.status, 'awaiting_prescription')
  assert.equal(c.body.total, 45)
  assert.equal((await call(`/admin/care/${c.body.id}`, { admin: true, method: 'POST', body: { action: 'approve_rx' } })).status, 200)
  const row = (await call('/admin/care', { admin: true })).body.bookings.find((x) => x.id === c.body.id)
  assert.equal(row.status, 'offered')
  assert.ok(row.offered.length >= 1 && row.offered.every((o) => o.name.includes('runner')))
  const mine = (await call('/care/bookings', { device: B })).body.bookings.find((x) => x.id === c.body.id)
  assert.equal(mine.pickup, 'Alexandra clinic pharmacy')
  assert.equal(mine.urgent, false)
})

test('delivery API: urgent jobs start now, and bad pickups are refused', async () => {
  const base = { suburb: 'soweto', service: 'oxygen', pickup: 'o2-soweto', equipment: ['swap'], patient: 'Gogo', landmark: 'Section 5', urgent: true }
  const u = await call('/care/bookings', { method: 'POST', body: base })
  assert.equal(u.status, 201, 'no start time needed when urgent')
  assert.equal(u.body.total, 45 + 30 + 420)
  const mine = (await call('/care/bookings')).body.bookings.find((x) => x.id === u.body.id)
  assert.equal(mine.urgent, true)
  assert.ok(Math.abs(mine.start - Date.now()) < 60000)
  for (const bad of [{ pickup: 'rx-soweto' }, { pickup: 'nowhere' }, { equipment: [] }, { urgent: false }]) {
    assert.equal((await call('/care/bookings', { method: 'POST', body: { ...base, ...bad } })).status, 400, JSON.stringify(bad))
  }
})

test('battery runtime: charge, age, chemistry and inverter all shorten the honest estimate', () => {
  const full = batteryRuntime({ wh: 1000, watts: 100 })
  assert.ok(Math.abs(full - 7.225) < 1e-9, 'lithium-ion, 85% usable, 85% inverter')
  assert.ok(Math.abs(batteryRuntime({ wh: 1000, watts: 100, charge: 50 }) - full / 2) < 1e-9)
  assert.ok(Math.abs(batteryRuntime({ wh: 1000, watts: 100, health: 80 }) - full * 0.8) < 1e-9)
  assert.ok(batteryRuntime({ wh: 1000, watts: 100, chemistry: 'lead' }) < full)
  assert.ok(batteryRuntime({ wh: 1000, watts: 100, inverter: false }) > full)
  assert.equal(batteryRuntime({ wh: 0, watts: 100 }), 0)
  assert.equal(batteryRuntime({ wh: 1000, watts: -5 }), 0)
})

test('time left counts down from the model, a reading, or the measured drain, whichever is safest', () => {
  const H = 3600000
  const start = 1_000_000_000_000
  const m = remainingHours({ full: 8, start, now: start + 2 * H })
  assert.deepEqual([m.source, m.left], ['model', 6])
  // the battery's own display says 50% after 2 hours: restart the clock from the real level
  const r = remainingHours({ full: 8, start, now: start + 2 * H, readings: [{ t: start + 2 * H, pct: 50 }] })
  assert.deepEqual([r.source, r.left], ['reading', 4])
  // drained faster than the model: 100% to 40% in 2 hours is 30%/hour, so 40% lasts about 1h20 more
  const d = remainingHours({ full: 8, start, now: start + 2 * H, readings: [{ t: start, pct: 100 }, { t: start + 2 * H, pct: 40 }] })
  assert.equal(d.source, 'measured')
  assert.ok(Math.abs(d.left - 40 / 30) < 1e-9)
  // never negative, and nothing without a start
  assert.equal(remainingHours({ full: 1, start, now: start + 5 * H }).left, 0)
  assert.equal(remainingHours({ full: 8 }), null)
})

test('alert stages escalate, and a life-support device calls the ambulance a stage earlier', () => {
  assert.deepEqual([3, 1.5, 0.9, 0.4, 0].map((h) => batteryStage(h)), ['ok', 'watch', 'low', 'critical', 'empty'])
  assert.equal(ambulanceDue('low', false), false)
  assert.equal(ambulanceDue('low', true), true)
  assert.equal(ambulanceDue('critical', false), true)
  assert.equal(ambulanceDue('watch', true), false)
})
