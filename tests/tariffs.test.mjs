import test from 'node:test'
import assert from 'node:assert/strict'
import { CITIES, SUBURBS } from '../shared/suburbs.js'
import { STATUS_LABELS, TARIFFS, waterCostFor } from '../shared/tariffs.js'
import { officialSlots } from '../src/lib.js'

test('every suburb belongs to a known city with a tariff entry, and every city has suburbs', () => {
  const ids = new Set()
  for (const s of SUBURBS) {
    assert.ok(CITIES[s.city], `${s.id} city`)
    assert.ok(TARIFFS[s.city], `${s.id} tariff`)
    assert.ok(!ids.has(s.id), `duplicate suburb id ${s.id}`)
    ids.add(s.id)
    // Inside South Africa.
    assert.ok(s.lat < -21.5 && s.lat > -35.5 && s.lng > 16 && s.lng < 33.5, `${s.id} coordinates`)
    assert.ok(Number.isInteger(s.group) && s.group >= 1 && s.group <= 16, `${s.id} group`)
  }
  for (const c of Object.keys(CITIES)) assert.ok(SUBURBS.some((s) => s.city === c), `${c} has suburbs`)
  assert.ok(SUBURBS.length >= 49)
  const provinces = new Set(Object.values(CITIES).map((c) => c.province))
  assert.equal(provinces.size, 9, 'every province is covered')
})

test('tariff entries are honest: status, note and sources are always present', () => {
  for (const [city, t] of Object.entries(TARIFFS)) {
    assert.ok(CITIES[city], `${city} is a known city`)
    for (const svc of ['water', 'electricity']) {
      assert.ok(STATUS_LABELS[t[svc].status], `${city} ${svc} status`)
      assert.ok(t[svc].note, `${city} ${svc} note`)
    }
    assert.ok(t.sources.length > 0 && t.sources.every((s) => /^https?:\/\//.test(s.url)), `${city} sources`)
    if (['secondary', 'proposed', 'estimated'].includes(t.water.status)) continue
    assert.equal(t.water.bands, undefined, `${city}: bands only where verified`)
  }
})

test('water bands are well formed and priced sensibly', () => {
  for (const [city, t] of Object.entries(TARIFFS)) {
    const bands = t.water.bands
    if (!bands) continue
    let prev = 0
    for (const [i, [to, rate]] of bands.entries()) {
      assert.ok(rate >= 0, `${city} rate`)
      if (i === bands.length - 1) assert.equal(to, null, `${city}: last band is open-ended`)
      else {
        assert.ok(to > prev, `${city}: bands ascend`)
        prev = to
      }
    }
    const rates = bands.map((b) => b[1])
    assert.deepEqual(rates, [...rates].sort((a, b) => a - b), `${city}: rates never fall as use rises`)
  }
})

test('waterCostFor: bands and VAT, null where there are no bands', () => {
  assert.equal(waterCostFor('joburg', 0), 0)
  assert.equal(waterCostFor('joburg', 6), 0)
  assert.ok(Math.abs(waterCostFor('joburg', 14) - (4 * 28.91 + 4 * 29.84) * 1.15) < 0.01)
  assert.ok(waterCostFor('joburg', 80) > waterCostFor('joburg', 60))
  // Cape Town's rates already include VAT; Ekurhuleni's exclude it.
  assert.ok(Math.abs(waterCostFor('capetown', 10) - (6 * 25.85 + 4 * 36.76)) < 0.01)
  assert.ok(Math.abs(waterCostFor('ekurhuleni', 10) - (6 * 25.21 + 4 * 41.55) * 1.15) < 0.01)
  assert.ok(waterCostFor('nmb', 20) > waterCostFor('nmb', 10))
  assert.equal(waterCostFor('tshwane', 9), 0, 'first 9 kL are free')
  assert.ok(Math.abs(waterCostFor('tshwane', 12) - 3 * 36.01 * 1.15) < 0.01)
  assert.equal(waterCostFor('ethekwini', 10), null)
})

const days = [{ date: '2026-09-22', stages: [[], ['22:00-00:30'], ['02:00-04:30', '22:00-00:30'], [], [], [], [], []] }]
const early = new Date(2026, 8, 22, 0, 0)

test('officialSlots: picks the stage list, handles slots past midnight, sorts', () => {
  assert.equal(officialSlots(days, 0, early).length, 0)
  assert.equal(officialSlots(days, 1, early).length, 0)
  const s2 = officialSlots(days, 2, early)
  assert.equal(s2.length, 1)
  assert.equal(s2[0].start.getHours(), 22)
  assert.equal(s2[0].end.getDate(), 23, 'ends the next day')
  assert.equal(s2[0].end.getHours(), 0)
  const s3 = officialSlots(days, 3, early)
  assert.deepEqual(s3.map((x) => x.start.getHours()), [2, 22], 'sorted by start time')
  assert.equal(officialSlots(days, 3, new Date(2026, 8, 23, 3, 0)).length, 0, 'past slots are dropped')
  assert.equal(officialSlots(days, 9, early).length, 0, 'stages beyond the data are ignored')
  assert.equal(officialSlots(undefined, 3, early).length, 0)
})
