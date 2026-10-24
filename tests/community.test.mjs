import test from 'node:test'
import assert from 'node:assert/strict'
import { SUBURBS, around, communityId, distKm, findSuburb, inSouthAfrica, isSuburbId } from '../shared/suburbs.js'

test('any spot in South Africa maps to a community of about 2 km', () => {
  const id = communityId(-33.9249, 18.4241) // Cape Town
  const s = findSuburb(id)
  assert.ok(s.custom && isSuburbId(id))
  assert.ok(distKm(s, { lat: -33.9249, lng: 18.4241 }) < 2, 'cell centre is near the spot')
  assert.equal(communityId(s.lat, s.lng), id, 'round trip is stable')
  // two homes a few hundred metres apart share a community
  assert.equal(communityId(-26.2041, 28.0473), communityId(-26.2062, 28.0481))
})

test('curated suburbs still resolve, and nonsense or foreign ids do not', () => {
  assert.equal(findSuburb('alex'), SUBURBS.find((s) => s.id === 'alex'))
  for (const bad of ['nowhere', 'g0_0', 'g9999_9999', 'g-1_1', '', undefined, null, 5]) assert.equal(isSuburbId(bad), false, String(bad))
  assert.ok(!inSouthAfrica(51.5, -0.12) && inSouthAfrica(-25.7, 28.2))
})

test('a custom community is drawn around itself plus nearby places with activity', () => {
  const a = findSuburb(communityId(-29.85, 31.02))
  const near = communityId(-29.87, 31.04)
  const far = communityId(-33.9, 18.4)
  const ids = around(a, [near, far, a.id]).map((s) => s.id)
  assert.deepEqual(ids, [a.id, near])
  assert.ok(around(SUBURBS[0], []).every((s) => s.city === SUBURBS[0].city))
})
