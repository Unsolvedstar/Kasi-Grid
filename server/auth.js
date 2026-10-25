import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import rateLimit from 'express-rate-limit'
import { isSuburbId } from '../shared/suburbs.js'

// Optional accounts. Residents never need one: reporting, alerts and the medical plan work anonymously. An account adds two
// things: your area, places, language and accessibility settings follow you to any phone, and care bookings follow you too.
// Passwords are stored only as salted scrypt hashes. A session is a random token kept in an HttpOnly cookie for 90 days, so
// once someone has signed in the app opens already signed in. Only a hash of the token is stored on the server.
const scryptAsync = promisify(scrypt)
const COOKIE = 'kg_session'
const DAYS = 90
const MAX_SESSIONS = 10
const sha = (t) => createHash('sha256').update(t).digest('hex')

// A South African cell number (082 123 4567, +27821234567) or an email address. Returns the stored form, or null.
export function normaliseHandle(v) {
  const s = String(v ?? '').trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 120) return { kind: 'email', handle: s.toLowerCase() }
  const d = s.replace(/[\s()-]/g, '').replace(/^\+/, '')
  if (/^0\d{9}$/.test(d)) return { kind: 'phone', handle: '27' + d.slice(1) }
  if (/^27\d{9}$/.test(d)) return { kind: 'phone', handle: d }
  return null
}
export const maskHandle = (h) => (h.includes('@') ? h.replace(/^(.).*(@.*)$/, '$1***$2') : `+${h.slice(0, 2)} ${h.slice(2, 4)} *** ${h.slice(-4)}`)

async function hashPassword(pw) {
  const salt = randomBytes(16)
  const key = await scryptAsync(pw, salt, 32)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}
async function checkPassword(pw, stored) {
  const [salt, key] = String(stored || '').split(':')
  if (!salt || !key) return false
  const given = await scryptAsync(pw, Buffer.from(salt, 'hex'), 32)
  const want = Buffer.from(key, 'hex')
  return given.length === want.length && timingSafeEqual(given, want)
}
const DUMMY = await hashPassword('not a real password') // so an unknown account takes as long to refuse as a wrong password

const cookies = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]))

export async function userOf(db, req) {
  if (req._user !== undefined) return req._user
  const token = cookies(req)[COOKIE]
  let user = null
  if (token && /^[\w-]{40,60}$/.test(token)) {
    const r = await db.execute({ sql: 'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user WHERE s.id = ? AND s.expires > ?', args: [sha(token), Date.now()] })
    user = r.rows[0] || null
  }
  req._user = user
  return user
}

// Only settings that make sense on another phone. The medical plan and emergency contact never leave the device.
function cleanPrefs(p) {
  const out = {}
  if (!p || typeof p !== 'object') return out
  if (typeof p.suburb === 'string' && isSuburbId(p.suburb)) out.suburb = p.suburb
  if (typeof p.lang === 'string' && /^[a-z]{2,3}$/.test(p.lang)) out.lang = p.lang
  if (p.places && typeof p.places === 'object') {
    out.places = Object.fromEntries(Object.entries(p.places).filter(([id, n]) => isSuburbId(id) && typeof n === 'string').slice(0, 20).map(([id, n]) => [id, n.slice(0, 40)]))
  }
  if (p.a11y && typeof p.a11y === 'object') {
    const a = p.a11y
    out.a11y = {
      bright: a.bright !== false, contrast: !!a.contrast, calm: !!a.calm, sound: a.sound !== false, vibrate: a.vibrate !== false, flash: !!a.flash, speak: !!a.speak,
      scale: [1, 1.25, 1.5, 2].includes(a.scale) ? a.scale : 1, profile: ['deaf', 'blind'].includes(a.profile) ? a.profile : null,
    }
  }
  return out
}

export function mountAuth(api, { db, wrap, bad, HttpError }) {
  const limiter = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.AUTH_LIMIT) || 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, wait a minute and try again' } })
  const shape = (u) => ({ name: u.name, handle: maskHandle(u.handle), prefs: JSON.parse(u.prefs || '{}') })

  const open = async (req, res, userId) => {
    const token = randomBytes(32).toString('base64url')
    const now = Date.now()
    await db.execute({ sql: 'INSERT INTO sessions (id, user, created, expires) VALUES (?,?,?,?)', args: [sha(token), userId, now, now + DAYS * 864e5] })
    // keep the newest sessions only
    await db.execute({ sql: 'DELETE FROM sessions WHERE user = ? AND id NOT IN (SELECT id FROM sessions WHERE user = ? ORDER BY created DESC LIMIT ?)', args: [userId, userId, MAX_SESSIONS] })
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure || !!process.env.VERCEL || process.env.NODE_ENV === 'production', maxAge: DAYS * 864e5, path: '/' })
  }

  api.post('/auth/register', limiter, wrap(async (req, res) => {
    const b = req.body || {}
    const id = normaliseHandle(b.id)
    if (!id) throw bad('Enter a South African cell number or an email address')
    const pw = typeof b.password === 'string' ? b.password : ''
    if (pw.length < 8 || pw.length > 100) throw bad('Choose a password of at least 8 characters')
    const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ').slice(0, 40) : ''
    if (/https?:\/\/|www\./i.test(name)) throw bad('Links are not allowed')
    if ((await db.execute({ sql: 'SELECT 1 FROM users WHERE handle = ?', args: [id.handle] })).rows.length) throw new HttpError(409, 'There is already an account with that number or email. Try signing in.')
    const prefs = JSON.stringify(cleanPrefs(b.prefs)) // the settings on this phone become the account's starting point
    const ins = await db.execute({ sql: 'INSERT INTO users (handle, kind, name, pw, prefs, created) VALUES (?,?,?,?,?,?)', args: [id.handle, id.kind, name, await hashPassword(pw), prefs, Date.now()] })
    await open(req, res, Number(ins.lastInsertRowid))
    res.status(201).json({ user: shape({ name, handle: id.handle, prefs }) })
  }))

  api.post('/auth/login', limiter, wrap(async (req, res) => {
    const b = req.body || {}
    const id = normaliseHandle(b.id)
    const pw = typeof b.password === 'string' ? b.password.slice(0, 100) : ''
    const u = id ? (await db.execute({ sql: 'SELECT * FROM users WHERE handle = ?', args: [id.handle] })).rows[0] : null
    const ok = await checkPassword(pw, u ? u.pw : DUMMY)
    if (!u || !ok) throw new HttpError(401, 'That number or email and password do not match')
    await open(req, res, Number(u.id))
    res.json({ user: shape(u) })
  }))

  api.get('/auth/me', wrap(async (req, res) => {
    const u = await userOf(db, req)
    res.set('Cache-Control', 'no-store').json({ user: u ? shape(u) : null })
  }))

  api.put('/auth/prefs', wrap(async (req, res) => {
    const u = await userOf(db, req)
    if (!u) throw new HttpError(401, 'Sign in first')
    const prefs = JSON.stringify(cleanPrefs((req.body || {}).prefs))
    if (prefs.length > 4000) throw bad('Too much data')
    await db.execute({ sql: 'UPDATE users SET prefs = ? WHERE id = ?', args: [prefs, u.id] })
    res.json({ ok: true })
  }))

  api.post('/auth/logout', wrap(async (req, res) => {
    const token = cookies(req)[COOKIE]
    if (token) await db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [sha(token)] })
    res.clearCookie(COOKIE, { path: '/' })
    res.json({ ok: true })
  }))

  // The right to be forgotten: removes the account and every session. Bookings stay (they belong to the carer's records) but
  // are no longer linked to a person.
  api.post('/auth/delete', limiter, wrap(async (req, res) => {
    const u = await userOf(db, req)
    if (!u) throw new HttpError(401, 'Sign in first')
    if (!(await checkPassword(typeof (req.body || {}).password === 'string' ? req.body.password.slice(0, 100) : '', u.pw))) throw new HttpError(401, 'That password is not right')
    await db.batch([
      { sql: 'UPDATE care_bookings SET user = NULL WHERE user = ?', args: [u.id] },
      { sql: 'DELETE FROM sessions WHERE user = ?', args: [u.id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [u.id] },
    ], 'write')
    res.clearCookie(COOKIE, { path: '/' })
    res.json({ ok: true })
  }))
}
