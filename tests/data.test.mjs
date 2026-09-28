import test from 'node:test'
import assert from 'node:assert/strict'
import { NAMC, STAPLES } from '../shared/namc.js'
import { deriveAlerts, RULES } from '../server/weather.js'
import { OUTLET_TYPES, OUTLET_GROUPS } from '../src/data.js'

test('NAMC basket: the 28 items add up to the published total', () => {
  assert.equal(NAMC.items.length, 28)
  const sum = NAMC.items.reduce((a, i) => a + i.price, 0)
  // The report prints R1 353.75; allow a few cents for the source's own rounding.
  assert.ok(Math.abs(sum - NAMC.basketTotal) < 0.1, `items sum to ${sum.toFixed(2)}, report says ${NAMC.basketTotal}`)
  assert.equal(new Set(NAMC.items.map((i) => i.id)).size, 28, 'item ids are unique')
})

test('NAMC prices are plausible', () => {
  for (const i of NAMC.items) {
    assert.ok(i.price > 5 && i.price < 250, `${i.label} price ${i.price}`)
    assert.ok(Math.abs(i.yoy) < 30 && Math.abs(i.mom) < 30, `${i.label} change`)
  }
})

test('every staple has a national reference price, eggs converted to a dozen', () => {
  for (const s of STAPLES) assert.ok(s.ref > 0, `${s.id} has a reference price`)
  const eggs = STAPLES.find((s) => s.id === 'eggs')
  assert.ok(Math.abs(eggs.ref - 61.15 / 1.5) < 0.01)
  assert.equal(STAPLES.find((s) => s.id === 'maize').ref, 65.09)
})

test('every place type belongs to a known group', () => {
  const groups = new Set(OUTLET_GROUPS.map((g) => g.id))
  for (const [k, v] of Object.entries(OUTLET_TYPES)) assert.ok(groups.has(v.group), `${k} -> ${v.group}`)
})

const day = (over) => ({ date: '2026-09-22', max: 22, min: 10, rain: 0, gust: 20, ...over })

test('weather alerts: calm weather raises nothing', () => {
  assert.deepEqual(deriveAlerts([day()]), [])
})

test('weather alerts: thresholds, levels and direction', () => {
  const at = (over) => deriveAlerts([day(over)])
  assert.equal(at({ rain: 16 })[0].level, 'watch')
  assert.equal(at({ rain: 31 })[0].level, 'warning')
  assert.equal(at({ max: 35 })[0].type, 'heat')
  assert.equal(at({ max: 39 })[0].level, 'warning')
  assert.equal(at({ min: 2 })[0].type, 'cold', 'cold alerts fire when it is BELOW the threshold')
  assert.equal(at({ min: -1 })[0].level, 'warning')
  assert.equal(at({ gust: 55 })[0].type, 'wind')
  assert.equal(at({ min: 8 }).length, 0)
})

test('weather alerts: worst first, then soonest; missing values are ignored', () => {
  const alerts = deriveAlerts([day({ date: '2026-09-22', max: 35 }), day({ date: '2026-09-23', rain: 40 }), day({ date: '2026-09-24', gust: null })])
  assert.equal(alerts[0].level, 'warning')
  assert.equal(alerts[0].type, 'rain')
  assert.equal(alerts[1].level, 'watch')
  assert.equal(alerts.length, 2)
  assert.ok(RULES.every((r) => r.label))
})

import { adviceFor } from '../src/advice.js'

test('advice: one card per alert type, most severe first, actions only where useful', () => {
  const cards = adviceFor([
    { type: 'heat', level: 'watch', date: '2026-09-22' },
    { type: 'rain', level: 'warning', date: '2026-09-23' },
    { type: 'rain', level: 'watch', date: '2026-09-24' },
  ])
  assert.deepEqual(cards.map((c) => c.type), ['rain', 'heat'])
  assert.equal(cards[0].level, 'warning', 'the worse rain alert wins')
  assert.equal(cards[0].action.reportType, 'road')
  assert.equal(cards[1].action, undefined)
  assert.deepEqual(adviceFor([]), [])
})
