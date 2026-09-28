import test from 'node:test'
import assert from 'node:assert/strict'
import { waterCost, slotsFor, businessAnalysis, savingsTips, waterStatus, outageHoursPerMonth, distanceKm } from '../src/lib.js'
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
