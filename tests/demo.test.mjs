import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PORT = 4000 + Math.floor(Math.random() * 300)
const BASE = `http://localhost:${PORT}/api`
let child
let dir
const get = (p) => fetch(BASE + p, { headers: { 'x-device-id': 'demo-test-device-0001' } }).then((r) => r.json())
const start = async (env) => {
  child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, NAMC_AUTO: 'off', ESP_TOKEN: '', ADMIN_TOKEN: 'x', PORT: String(PORT), DATABASE_URL: 'file:' + path.join(dir, 'd.db').replace(/\\/g, '/'), ...env }, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/health')).ok) return } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('server did not start')
}
before(() => { dir = mkdtempSync(path.join(tmpdir(), 'kasi-demo-')) })
after(() => { child?.kill(); try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows may hold the file */ } })

test('without DEMO_MODE there is no verified outage and no forecast data', async () => {
  await start({})
  assert.equal((await get('/pulse')).incidents.length, 0)
  child.kill()
  await new Promise((r) => setTimeout(r, 500))
})

test('DEMO_MODE gives verified outages, a forecast and a typical duration, and restarting does not duplicate history', async () => {
  await start({ DEMO_MODE: 'true' })
  const pulse = await get('/pulse')
  assert.ok(pulse.incidents.length >= 2 && pulse.incidents.every((i) => !i.resolved))
  const f = await get('/forecast?suburb=alex')
  assert.equal(f.water.pattern, true)
  assert.ok(f.duration.water && f.duration.water.n >= 3)
  child.kill()
  await new Promise((r) => setTimeout(r, 500))
  await start({ DEMO_MODE: 'true' })
  const again = await get('/forecast?suburb=alex')
  assert.equal(again.duration.water.n, f.duration.water.n, 'history is written once')
  assert.equal((await get('/pulse')).incidents.length, pulse.incidents.length, 'live outages are replaced, not stacked')
})
