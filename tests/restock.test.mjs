import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { cycleOf, tierFor, summarize } from '../shared/restock.js'

test('cycle closes the next Thursday 18:00 SAST and rolls over after the cutoff', () => {
  const wed = Date.UTC(2026, 9, 14, 10) // Wed 14 Oct 2026
  assert.equal(cycleOf(wed).key, '2026-10-15')
  assert.equal(new Date(cycleOf(wed).cutoff).toISOString(), '2026-10-15T16:00:00.000Z')
  assert.equal(cycleOf(Date.UTC(2026, 9, 15, 15, 59)).key, '2026-10-15')
  assert.equal(cycleOf(Date.UTC(2026, 9, 15, 16, 0)).key, '2026-10-22', 'at the cutoff the next cycle starts')
  assert.equal(cycleOf(Date.UTC(2026, 9, 17)).key, '2026-10-22')
})

test('tiers: discount rises with pool size and reports packs to the next tier', () => {
  assert.deepEqual(tierFor(0), { off: 0, next: { off: 0.05, more: 20 } })
  assert.equal(tierFor(19).next.more, 1)
  assert.equal(tierFor(20).off, 0.05)
  assert.equal(tierFor(99).off, 0.09)
  assert.deepEqual(tierFor(100), { off: 0.12, next: null })
})

test('summarize: my price follows the pool, and my saving is against ordering alone', () => {
  const alone = summarize({ maize: 2 }, { maize: 2 })
  assert.equal(alone.saving, 0)
  const pooled = summarize({ maize: 50 }, { maize: 2 })
  assert.equal(pooled.alone, 130.18)
  assert.equal(pooled.pay, 118.46) // 65.09 * 0.91 = 59.23 each
  assert.equal(pooled.saving, 11.72)
  assert.equal(pooled.rows[0].next.more, 50)
  assert.deepEqual(summarize({}, {}).rows, [])
})

const PORT = 3950 + Math.floor(Math.random() * 40)
const BASE = `http://localhost:${PORT}/api`
const A = 'aaaaaaaa-1111-2222-3333-666666666666'
const B = 'bbbbbbbb-1111-2222-3333-666666666666'
let child, dir
const call = (p, { device = A, method = 'GET', body } = {}) =>
  fetch(BASE + p, { method, headers: { ...(device ? { 'x-device-id': device } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'kasi-restock-'))
  child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, NAMC_AUTO: 'off', ESP_TOKEN: '', WRITE_LIMIT: '1000', PORT: String(PORT), DATABASE_URL: 'file:' + path.join(dir, 't.db').replace(/\\/g, '/') }, stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + '/health')).ok) return } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('server did not start')
})
after(() => {
  child?.kill()
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows may hold the file briefly */ }
})

test('restock API: shops pool packs, each device has one basket that saving replaces', async () => {
  assert.equal((await call('/restock?suburb=alex')).body.shops, 0)
  assert.equal((await call('/restock', { method: 'POST', body: { suburb: 'alex', shop: 'Mama Lindi', items: { maize: 12, bread: 5 } } })).status, 200)
  assert.equal((await call('/restock', { device: B, method: 'POST', body: { suburb: 'alex', shop: 'Bra Sipho', items: { maize: 10 } } })).status, 200)
  const a = (await call('/restock?suburb=alex')).body
  assert.equal(a.shops, 2)
  assert.equal(a.totals.maize, 22)
  assert.deepEqual(a.mine, { maize: 12, bread: 5 })
  assert.equal(a.shop, 'Mama Lindi')
  await call('/restock', { method: 'POST', body: { suburb: 'alex', shop: 'Mama Lindi', items: { maize: 3 } } })
  const b = (await call('/restock?suburb=alex', { device: B })).body
  assert.equal(b.totals.maize, 13)
  assert.equal(b.totals.bread, undefined, 'replaced basket drops old lines')
  assert.deepEqual(b.mine, { maize: 10 })
  assert.equal((await call('/restock?suburb=soweto')).body.shops, 0, 'pools are per suburb')
})

test('restock API: validation', async () => {
  const post = (body, opt) => call('/restock', { method: 'POST', body: { suburb: 'alex', shop: 'Shop', items: { rice: 1 }, ...body }, ...opt })
  assert.equal((await post({ suburb: 'mars' })).status, 400)
  assert.equal((await post({ shop: '' })).status, 400)
  assert.equal((await post({ shop: 'see https://x.example' })).status, 400)
  assert.equal((await post({ items: { jetpack: 1 } })).status, 400)
  assert.equal((await post({ items: { rice: 1.5 } })).status, 400)
  assert.equal((await post({ items: { rice: 51 } })).status, 400)
  assert.equal((await post({ items: { rice: -1 } })).status, 400)
  assert.equal((await post({}, { device: null })).status, 400, 'device id required')
})
