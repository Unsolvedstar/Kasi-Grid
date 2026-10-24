import test from 'node:test'
import assert from 'node:assert/strict'
import { riskTimeline, mood, advise, HOURS } from '../shared/sense.js'

const now = Date.UTC(2026, 9, 16, 10, 0)
test('covers 48 hours ahead and is calm with no signals', () => {
  const tl = riskTimeline({ now })
  assert.equal(tl.length, HOURS + 1)
  assert.equal(mood(tl, 0), 0)
  assert.deepEqual(advise(tl, 0), ['calm'])
})
test('a loadshedding slot makes those hours certain and says why', () => {
  const tl = riskTimeline({ now, slots: [{ start: new Date(now + 3 * 3600e3), end: new Date(now + 5 * 3600e3) }] })
  assert.equal(tl[3].power, 1); assert.equal(tl[4].power, 1); assert.equal(tl[5].power, 0)
  assert.ok(tl[3].why.includes('loadshedding'))
  assert.ok(advise(tl, 1).includes('charge'), 'warns before the cut')
  assert.ok(advise(tl, 3).includes('cook-gas'))
})
test('a verified outage is dark until its typical end, then uncertain', () => {
  const inc = [{ type: 'water', since: now - 3600e3, resolved: false }]
  const tl = riskTimeline({ now, incidents: inc, medianHours: { water: 4 } })
  assert.equal(tl[0].water, 1); assert.equal(tl[2].water, 1); assert.equal(tl[3].water, 0, 'median passed and past the next hour')
  assert.ok(advise(tl, 0).includes('use-stored'))
})
test('pattern risk is weighted by confidence and resolved incidents are ignored', () => {
  const fc = { power: { pattern: true, confidence: 'medium', next: { start: now + 2 * 3600e3, end: now + 4 * 3600e3 } }, building: [] }
  const tl = riskTimeline({ now, fc, incidents: [{ type: 'power', since: now, resolved: true }] })
  assert.equal(tl[2].power, 0.4); assert.equal(tl[0].power, 0)
})
