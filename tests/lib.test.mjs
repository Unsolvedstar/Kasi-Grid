import test from 'node:test'
import assert from 'node:assert/strict'
import { waterCost, slotsFor, businessAnalysis, savingsTips, waterStatus, outageHoursPerMonth, distanceKm, slotsToIcs } from '../src/lib.js'
import { BUSINESS_TYPES, SUBURBS } from '../src/data.js'

test('water tariff: first 6 kL are free, bands and VAT apply', () => {
  assert.equal(waterCost(0), 0)
  assert.equal(waterCost(6), 0)
  // 4 kL at R28.91 plus 4 kL at R29.84, times 1.15 VAT
  assert.ok(Math.abs(waterCost(14) - (4 * 28.91 + 4 * 29.84) * 1.15) < 0.01)
  assert.ok(waterCost(60) > waterCost(50), 'cost rises with use')
})

test('water saving from cutting use is larger at higher bands', () => {
  const low = waterCost(12) - waterCost(10.8)
  const high = waterCost(45) - waterCost(40.5)
  assert.ok(high > low)
})

test('loadshedding simulation: none at stage 0, more slots at higher stages', () => {
  assert.equal(slotsFor(7, 0).length, 0)
  const from = new Date('2026-03-02T00:00:00')
  const counts = [2, 4, 6, 8].map((s) => slotsFor(7, s, from, 7).length)
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], `stage counts ${counts}`)
  assert.ok(counts[3] > counts[0])
  for (const s of slotsFor(3, 4, from, 2)) assert.equal(s.end - s.start, 2 * 3600 * 1000)
})

test('outage hours scale with stage', () => {
  assert.equal(outageHoursPerMonth(0), 0)
  assert.ok(outageHoursPerMonth(4) > outageHoursPerMonth(2))
})

const shop = { type: 'spaza', dailyRevenue: 1500, backup: 'none', coldStock: 2000, coldBackup: false, waterDays: 2, tank: false }

test('business score is bounded and improves with backup power', () => {
  const t = BUSINESS_TYPES.spaza
  const base = businessAnalysis(shop, 4, t)
  const withSolar = businessAnalysis({ ...shop, backup: 'solar', coldBackup: true, tank: true }, 4, t)
  assert.ok(base.score >= 5 && base.score <= 100)
  assert.ok(withSolar.score > base.score)
  assert.ok(withSolar.loss < base.loss)
})

test('business fixes are ranked by payback and never claim negative savings', () => {
  const a = businessAnalysis(shop, 6, BUSINESS_TYPES.spaza)
  assert.ok(a.fixes.length > 0)
  for (let i = 1; i < a.fixes.length; i++) assert.ok(a.fixes[i].payback >= a.fixes[i - 1].payback)
  assert.ok(a.fixes.every((f) => f.save > 0 && f.cost > 0))
})

test('no loadshedding means no power loss for a shop without cold stock', () => {
  const a = businessAnalysis({ ...shop, coldStock: 0, waterDays: 0 }, 0, BUSINESS_TYPES.spaza)
  assert.equal(a.loss, 0)
  assert.equal(a.score, 100)
})

test('savings tips respond to what the household already has', () => {
  const p = { bill: 1000, geyser: 'electric', timer: false, blanket: false, led: false, oldFridge: false, water: 14 }
  const ids = (x) => savingsTips(x).map((t) => t.id)
  assert.ok(ids(p).includes('timer'))
  assert.ok(!ids({ ...p, timer: true }).includes('timer'))
  assert.ok(!ids({ ...p, geyser: 'other' }).includes('timer'))
  assert.ok(ids({ ...p, oldFridge: true }).includes('fridge'))
  assert.ok(savingsTips(p).every((t) => t.save >= 0 && Number.isInteger(t.save)))
})

test('water status comes from confirmed resident reports in the last 24h', () => {
  const now = Date.now()
  const r = (over) => ({ suburb: 'alex', type: 'water', ts: now - 3600e3, confirms: 1, ...over })
  assert.equal(waterStatus([], 'alex'), 'ok')
  assert.equal(waterStatus([r()], 'alex'), 'low')
  assert.equal(waterStatus([r({ confirms: 3 })], 'alex'), 'out')
  assert.equal(waterStatus([r({ confirms: 5, ts: now - 30 * 3600e3 })], 'alex'), 'ok', 'stale reports expire')
  assert.equal(waterStatus([r({ confirms: 5, type: 'power' })], 'alex'), 'ok')
  assert.equal(waterStatus([r({ confirms: 5, suburb: 'soweto' })], 'alex'), 'ok')
})

test('distance is sensible', () => {
  const [a, b] = [SUBURBS.find((s) => s.id === 'alex'), SUBURBS.find((s) => s.id === 'soweto')]
  assert.equal(Math.round(distanceKm(a, a)), 0)
  const d = distanceKm(a, b)
  assert.ok(d > 20 && d < 40, `Alexandra to Soweto is ${d} km`)
})

import { forecast, nextWindow } from '../shared/forecast.js'

// 2026-10-05 is a Monday. Hours below are South African time (UTC+2).
const sast = (d, h) => Date.UTC(2026, 9, d, h - 2)
const ev = (type, ts, dev = 'a') => ({ type, ts, devices: [dev] })

test('forecast: needs enough history before it predicts', () => {
  const f = forecast([ev('water', sast(5, 7)), ev('water', sast(6, 7))], sast(8, 12))
  assert.equal(f.water.enough, false)
  assert.equal(f.power.enough, false)
})

test('forecast: finds the weekday and time of day outages cluster, and the next window', () => {
  const events = [sast(5, 7), sast(12, 8), sast(19, 6), sast(21, 15), sast(14, 20)].map((t) => ev('water', t))
  const f = forecast(events, sast(23, 12)) // Friday 23 Oct
  assert.equal(f.water.pattern, true)
  assert.equal(f.water.dow, 1) // Monday
  assert.equal(f.water.band, 'morning')
  assert.equal(f.water.share, 60)
  assert.equal(f.water.confidence, 'high')
  const next = new Date(f.water.next.start + 2 * 3600 * 1000)
  assert.equal(next.getUTCDay(), 1)
  assert.equal(next.getUTCHours(), 5)
})

test('forecast: early warning when exactly two devices reported in the last 3 hours', () => {
  const now = sast(8, 12)
  const f = forecast([ev('power', now - 3600e3, 'a'), ev('power', now - 1800e3, 'b')], now)
  assert.deepEqual(f.building, [{ type: 'power', devices: 2 }])
})

test('nextWindow: reports "now" when inside the window', () => {
  const w = nextWindow(1, 'morning', sast(5, 9))
  assert.equal(w.now, true)
  assert.equal(w.start, sast(5, 9))
})

test('calendar export: valid iCalendar with one event and reminder per slot', () => {
  const from = new Date('2026-03-02T00:00:00Z')
  const slots = slotsFor(7, 4, from, 2)
  const ics = slotsToIcs(slots, { area: 'Alexandra, Ext 7', official: false, stage: 4, now: from })
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'))
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, slots.length)
  assert.equal(ics.match(/TRIGGER:-PT30M/g).length, slots.length)
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/)
  assert.match(ics, /Alexandra\\, Ext 7/, 'commas are escaped')
  assert.match(ics, /illustrative/i)
  assert.equal(new Set(ics.match(/UID:.*/g)).size, slots.length, 'UIDs are unique')
})

test('loadshedding-free counter matches Eskom (504 days on 2 October 2026)', async () => {
  const { daysWithoutLoadshedding } = await import('../src/lib.js')
  assert.equal(daysWithoutLoadshedding(new Date('2026-10-02T12:00:00+02:00')), 504)
  assert.equal(daysWithoutLoadshedding(new Date('2020-01-01')), 0)
})

test('live outage cost grows with time and respects backup, tank and cold-box', async () => {
  const { liveOutageCost } = await import('../src/lib.js')
  const { BUSINESS_TYPES } = await import('../src/data.js')
  const type = BUSINESS_TYPES.spaza
  const b = { dailyRevenue: 1500, backup: 'none', coldStock: 2000, coldBackup: false, tank: false }
  const now = Date.now()
  const h8 = { type: 'power', since: now - 8 * 3600000 }
  const at = (h) => liveOutageCost(b, type, { type: 'power', since: now - h * 3600000 }, now)
  assert.equal(at(0).loss, 0)
  assert.equal(at(3).stock, 0, 'fridge still cold inside 4 hours')
  assert.ok(at(8).stock > 0 && at(8).loss > at(3).loss)
  assert.ok(at(100).stock <= 1000, 'stock risk caps at half')
  assert.ok(liveOutageCost({ ...b, backup: 'solar' }, type, h8, now).sales < at(8).sales)
  assert.equal(liveOutageCost({ ...b, coldBackup: true }, type, h8, now).stock, 0)
  const w = (tank) => liveOutageCost({ ...b, tank }, BUSINESS_TYPES.carwash, { type: 'water', since: now - 12 * 3600000 }, now).loss
  assert.ok(w(true) < w(false))
})

test('expected restoration time: start plus typical length, overdue once past it', async () => {
  const { expectedBack } = await import('../src/lib.js')
  const since = Date.parse('2026-10-08T10:00:00Z')
  const e = expectedBack(since, 5, since + 3600000)
  assert.equal(e.at, since + 5 * 3600000)
  assert.equal(e.overdue, false)
  assert.equal(expectedBack(since, 5, since + 6 * 3600000).overdue, true)
})
