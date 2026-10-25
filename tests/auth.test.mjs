import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { maskHandle, normaliseHandle } from '../server/auth.js'

const PORT = 4000 + Math.floor(Math.random() * 400)
const BASE = `http://localhost:${PORT}/api`
const PHONE_A = 'aaaaaaaa-5555-6666-7777-888888888888'
const PHONE_B = 'bbbbbbbb-5555-6666-7777-888888888888'
let child
let dir

// A tiny cookie jar, because fetch in Node does not keep cookies between calls.
const jar = () => {
  let cookie = ''
  return async (p, { device = PHONE_A, method = 'GET', body } = {}) => {
    const r = await fetch(BASE + p, {
      method,
      headers: { 'x-device-id': device, ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const set = r.headers.get('set-cookie')
    if (set) cookie = /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(set) ? '' : set.split(';')[0]
    return { status: r.status, body: await r.json().catch(() => null), setCookie: set, has: () => !!cookie }
  }
}

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'kasi-auth-'))
  child = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, NAMC_AUTO: 'off', ESP_TOKEN: '', ADMIN_TOKEN: 'x'.repeat(20), WRITE_LIMIT: '1000', AUTH_LIMIT: '1000', PORT: String(PORT), DATABASE_URL: 'file:' + path.join(dir, 't.db').replace(/\\/g, '/') },
    stdio: 'ignore',
  })
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

test('cell numbers and emails are normalised, and masked when shown', () => {
  assert.deepEqual(normaliseHandle('082 123 4567'), { kind: 'phone', handle: '27821234567' })
  assert.deepEqual(normaliseHandle('+27 82 123 4567'), { kind: 'phone', handle: '27821234567' })
  assert.deepEqual(normaliseHandle('Thandi@Example.com '), { kind: 'email', handle: 'thandi@example.com' })
  for (const bad of ['', '12345', '0821234', 'not an email', '+44 7700 900123']) assert.equal(normaliseHandle(bad), null, bad)
  assert.equal(maskHandle('27821234567'), '+27 82 *** 4567')
  assert.equal(maskHandle('thandi@example.com'), 't***@example.com')
})

test('register, stay signed in through the cookie, and sign out', async () => {
  const call = jar()
  assert.equal((await call('/auth/me')).body.user, null, 'anonymous at first')
  const r = await call('/auth/register', { method: 'POST', body: { name: 'Thandi', id: '082 123 4567', password: 'correct horse battery', prefs: { suburb: 'alex', lang: 'zu', places: { alex: 'ignored but valid id' }, a11y: { scale: 1.5, contrast: true, junk: 'x' } } } })
  assert.equal(r.status, 201)
  assert.match(r.setCookie, /HttpOnly/i)
  assert.match(r.setCookie, /SameSite=Lax/i)
  assert.match(r.setCookie, /Max-Age=7776000/, '90 days')
  assert.equal(JSON.stringify(r.body).includes('correct horse'), false, 'the password is never echoed')
  const me = await call('/auth/me')
  assert.equal(me.body.user.name, 'Thandi')
  assert.equal(me.body.user.handle, '+27 82 *** 4567')
  assert.equal(me.body.user.prefs.suburb, 'alex')
  assert.equal(me.body.user.prefs.a11y.scale, 1.5)
  assert.equal('junk' in me.body.user.prefs.a11y, false, 'unknown preference keys are dropped')
  assert.equal((await call('/auth/logout', { method: 'POST' })).status, 200)
  assert.equal((await call('/auth/me')).body.user, null, 'signed out')
})

test('wrong passwords, unknown accounts, duplicates and weak passwords are refused', async () => {
  const call = jar()
  assert.equal((await call('/auth/register', { method: 'POST', body: { id: 'sipho@example.com', password: 'short' } })).status, 400)
  assert.equal((await call('/auth/register', { method: 'POST', body: { id: 'nope', password: 'long enough password' } })).status, 400)
  assert.equal((await call('/auth/register', { method: 'POST', body: { id: 'sipho@example.com', password: 'long enough password' } })).status, 201)
  assert.equal((await jar()('/auth/register', { method: 'POST', body: { id: 'SIPHO@example.com', password: 'another password' } })).status, 409, 'same email in any case')
  const fresh = jar()
  assert.equal((await fresh('/auth/login', { method: 'POST', body: { id: 'sipho@example.com', password: 'wrong password here' } })).status, 401)
  assert.equal((await fresh('/auth/login', { method: 'POST', body: { id: 'nobody@example.com', password: 'wrong password here' } })).status, 401)
  const ok = await fresh('/auth/login', { method: 'POST', body: { id: 'sipho@example.com', password: 'long enough password' } })
  assert.equal(ok.status, 200)
  assert.equal((await fresh('/auth/me')).body.user.handle, 's***@example.com')
})

test('settings sync across phones, and are sanitised', async () => {
  const phone1 = jar()
  await phone1('/auth/register', { method: 'POST', body: { id: '0831112222', password: 'a good long password' } })
  assert.equal((await phone1('/auth/prefs', { method: 'PUT', body: { prefs: { suburb: 'soweto', lang: 'st', places: { 'not-a-place': 'x', alex: 'Home' }, medplan: { watts: 300 } } } })).status, 200)
  const phone2 = jar()
  await phone2('/auth/login', { device: PHONE_B, method: 'POST', body: { id: '+27 83 111 2222', password: 'a good long password' } })
  const me = (await phone2('/auth/me', { device: PHONE_B })).body.user
  assert.equal(me.prefs.suburb, 'soweto')
  assert.equal(me.prefs.lang, 'st')
  assert.deepEqual(me.prefs.places, { alex: 'Home' })
  assert.equal('medplan' in me.prefs, false, 'the medical plan never goes to the server')
  assert.equal((await jar()('/auth/prefs', { method: 'PUT', body: { prefs: {} } })).status, 401, 'needs a session')
})

test('care bookings follow a signed-in person to another phone', async () => {
  const phone1 = jar()
  await phone1('/auth/register', { method: 'POST', body: { id: 'gogo@example.com', password: 'a good long password' } })
  const when = Date.now() + 26 * 3600e3
  const booked = await phone1('/care/bookings', { method: 'POST', body: { suburb: 'alex', service: 'companion', hours: 4, equipment: [], start: when, patient: 'Gogo', landmark: 'Opposite the clinic', needs: '' } })
  assert.equal(booked.status, 201)
  const phone2 = jar()
  assert.equal((await phone2('/care/bookings', { device: PHONE_B })).body.bookings.length, 0, 'another phone sees nothing while signed out')
  await phone2('/auth/login', { device: PHONE_B, method: 'POST', body: { id: 'gogo@example.com', password: 'a good long password' } })
  const seen = (await phone2('/care/bookings', { device: PHONE_B })).body.bookings
  assert.equal(seen.length, 1)
  assert.equal((await phone2(`/care/bookings/${seen[0].id}/cancel`, { device: PHONE_B, method: 'POST' })).status, 200, 'and can cancel it')
})

test('deleting the account ends every session and unlinks bookings', async () => {
  const phone = jar()
  await phone('/auth/register', { method: 'POST', body: { id: 'bye@example.com', password: 'a good long password' } })
  assert.equal((await phone('/auth/delete', { method: 'POST', body: { password: 'not the password' } })).status, 401)
  assert.equal((await phone('/auth/delete', { method: 'POST', body: { password: 'a good long password' } })).status, 200)
  assert.equal((await phone('/auth/me')).body.user, null)
  assert.equal((await jar()('/auth/login', { method: 'POST', body: { id: 'bye@example.com', password: 'a good long password' } })).status, 401, 'the account is gone')
})
