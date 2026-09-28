import test from 'node:test'
import assert from 'node:assert/strict'
import { zu, st, af, LOCALES } from '../src/locales.js'

const langs = { zu, st, af }
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

test('every language translates the same set of strings', () => {
  const base = Object.keys(zu).sort()
  for (const [name, dict] of Object.entries(langs)) {
    assert.deepEqual(Object.keys(dict).sort(), base, `${name} keys differ from isiZulu`)
  }
})

test('placeholders are preserved in every translation', () => {
  for (const [name, dict] of Object.entries(langs)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(holes(value), holes(key), `${name}: placeholders differ for "${key}"`)
    }
  }
})

test('no translation is empty or left identical by accident', () => {
  const allowed = new Set(['My area', 'Supermarket', 'Water', 'Water in {name}']) // genuinely the same word in some languages
  for (const [name, dict] of Object.entries(langs)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value.trim().length > 0, `${name}: empty translation for "${key}"`)
      if (value === key && !allowed.has(key) && !/^\{/.test(key)) assert.notEqual(value, key, `${name}: "${key}" was not translated`)
    }
  }
})

test('checklist and label sources are all covered', async () => {
  const { CHECKLIST, CHECKLIST_GROUPS, REPORT_TYPES, SHARE_CATEGORIES, OUTLET_TYPES, OUTLET_GROUPS } = await import('../src/data.js')
  const { RULES } = await import('../server/weather.js')
  const { ADVICE_STRINGS } = await import('../src/advice.js')
  const { WATER } = await import('../src/lib.js')
  const need = [
    ...CHECKLIST.map((c) => c.text),
    ...CHECKLIST_GROUPS.map((g) => g.label),
    ...Object.values(REPORT_TYPES).map((x) => x.label),
    ...Object.values(SHARE_CATEGORIES).map((x) => x.label),
    ...Object.values(OUTLET_TYPES).map((x) => x.label),
    ...OUTLET_GROUPS.map((g) => g.label),
    ...RULES.map((r) => r.label),
    ...ADVICE_STRINGS,
    ...Object.values(WATER).map((x) => x.label),
  ]
  for (const [name, dict] of Object.entries(LOCALES)) {
    for (const k of need) assert.ok(k in dict, `${name} is missing "${k}"`)
  }
})
