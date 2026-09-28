import test, { before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NAMC } from '../shared/namc.js'
import { candidateLinks, parseNamcText, pdfText } from '../server/namc.js'

// The real NAMC report for August 2026 (July prices), so this checks the parser against the genuine layout.
let text
before(async () => {
  text = await pdfText(readFileSync(new URL('./fixtures/namc-aug-2026.pdf', import.meta.url)))
})

test('parses the real PDF into exactly the bundled snapshot', () => {
  const snap = parseNamcText(text, NAMC)
  assert.equal(snap.issueNo, 129)
  assert.equal(snap.period, 'July 2026')
  assert.equal(snap.basketTotal, 1353.75)
  assert.equal(snap.items.length, 28)
  for (const it of snap.items) {
    const want = NAMC.items.find((i) => i.id === it.id)
    assert.equal(it.price, want.price, `${it.id} price`)
    assert.equal(it.yoy, want.yoy, `${it.id} yoy`)
    assert.equal(it.mom, want.mom, `${it.id} mom`)
  }
})

test('rejects a report where a row is missing', () => {
  const broken = text.replace(/Polony 1kg[^\n]*\n/, '')
  assert.throws(() => parseNamcText(broken, NAMC), /Missing items: polony/)
})

test('rejects a report whose items no longer add up to the printed total', () => {
  const broken = text.replace('Maize meal 5kg   74.32   67.31   65.09', 'Maize meal 5kg   74.32   67.31   66.09')
  assert.notEqual(broken, text, 'fixture edit applied')
  assert.throws(() => parseNamcText(broken, NAMC), /sum to/)
})

test('rejects a changed pack size instead of mixing units', () => {
  const broken = text.replace('Maize meal 5kg', 'Maize meal 10kg')
  assert.throws(() => parseNamcText(broken, NAMC), /Unrecognised|Missing items: maize/)
})

test('rejects an implausible jump in one price (mis-read column)', () => {
  const prev = { ...NAMC, items: NAMC.items.map((i) => (i.id === 'rice' ? { ...i, price: 20 } : i)) }
  assert.throws(() => parseNamcText(text, prev), /refusing to import/)
})

test('rejects text that is not the report', () => {
  assert.throws(() => parseNamcText('nothing useful here', NAMC), /Table 2 not found/)
})

test('candidate links: newest first, only NAMC upload URLs', () => {
  const html = `
    <a href="https://www.namc.co.za/wp-content/uploads/2026/06/Food-Basket-Price-Monthly-Report-May-2026.pdf">May</a>
    <a href="https://www.namc.co.za/wp-content/uploads/2026/08/Food-Basket-Price-Monthly-Report-August-2026-BZ.pdf">Aug</a>
    <a href="https://www.namc.co.za/wp-content/uploads/2026/08/Food-Basket-Price-Monthly-Report-July-2026-FINAL.pdf">Jul</a>
    <a href="https://evil.example/uploads/2027/01/Food-Basket-Price-Monthly-Report-January-2027.pdf">nope</a>
    <a href="http://www.namc.co.za/wp-content/uploads/2026/07/Food-Basket-Price-Monthly-Report-June-2026.pdf">Jun</a>`
  const links = candidateLinks(html).map((u) => u.split('/').pop())
  assert.deepEqual(links, [
    'Food-Basket-Price-Monthly-Report-August-2026-BZ.pdf',
    'Food-Basket-Price-Monthly-Report-July-2026-FINAL.pdf',
    'Food-Basket-Price-Monthly-Report-June-2026.pdf',
    'Food-Basket-Price-Monthly-Report-May-2026.pdf',
  ])
})
