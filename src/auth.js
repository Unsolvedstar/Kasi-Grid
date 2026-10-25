import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

// Optional accounts. The session lives in an HttpOnly cookie the server sets (90 days), so a person who has signed in once is
// signed in again every time the app opens, with nothing to type. This hook asks the server who the cookie belongs to,
// keeps the few settings that follow an account (area, places, language, accessibility) in step with the server, and exposes
// sign in, create account, sign out and delete. The medical plan and the emergency contact never leave the phone.
const LS = { suburb: 'kg2.suburb', places: 'kg2.places', a11y: 'kg2.a11y', lang: 'kg2.lang' }
const SHOWN = 'kg2.user' // name and masked handle for the offline case; display only
const RECONCILED = 'kg-reconciled'

const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
export function readPrefs() {
  const p = {}
  const suburb = readJson(LS.suburb); if (typeof suburb === 'string') p.suburb = suburb
  const places = readJson(LS.places); if (places && typeof places === 'object') p.places = places
  const a11y = readJson(LS.a11y); if (a11y && typeof a11y === 'object') p.a11y = a11y
  try { const lang = localStorage.getItem(LS.lang); if (lang) p.lang = lang } catch { /* storage blocked */ }
  return p
}
const sig = (p) => JSON.stringify([p.suburb, p.lang, p.places, p.a11y])

// Writes the account's settings into this phone. Returns true if anything changed, so the caller can reload once.
function applyPrefs(p) {
  const before = sig(readPrefs())
  try {
    if (p.suburb) localStorage.setItem(LS.suburb, JSON.stringify(p.suburb))
    if (p.places) localStorage.setItem(LS.places, JSON.stringify(p.places))
    if (p.a11y) localStorage.setItem(LS.a11y, JSON.stringify(p.a11y))
    if (p.lang) localStorage.setItem(LS.lang, p.lang)
    localStorage.setItem('kg2.welcomed', 'true') // someone who has an account does not need the first-run tour
  } catch { /* storage blocked */ }
  return sig(readPrefs()) !== before
}
const hasPrefs = (p) => !!(p && (p.suburb || p.lang || p.places || p.a11y))

export function useAuth() {
  const [state, setState] = useState({ status: 'loading', user: null })
  const sent = useRef('')

  const remember = (user) => { try { user ? localStorage.setItem(SHOWN, JSON.stringify({ name: user.name, handle: user.handle })) : localStorage.removeItem(SHOWN) } catch { /* ignore */ } }
  const enter = (user) => { remember(user); setState({ status: 'in', user }) }

  // On every open: who is this cookie? Quietly adopt the account's settings if this phone differs (one reload at most).
  useEffect(() => {
    let live = true
    api('/auth/me').then(({ user }) => {
      if (!live) return
      if (!user) { remember(null); setState({ status: 'out', user: null }); return }
      enter(user)
      if (hasPrefs(user.prefs) && !sessionStorage.getItem(RECONCILED)) {
        sessionStorage.setItem(RECONCILED, '1')
        if (applyPrefs(user.prefs)) location.reload()
      } else sent.current = sig(user.prefs || {})
    }).catch(() => {
      // offline: show the last known account, if any, without claiming the server agrees
      const shown = readJson(SHOWN)
      if (live) setState(shown ? { status: 'offline', user: shown } : { status: 'out', user: null })
    })
    return () => { live = false }
  }, [])

  // While signed in, keep the account's settings current: quietly, only when they change.
  useEffect(() => {
    if (state.status !== 'in') return
    const push = () => {
      const p = readPrefs()
      if (sig(p) === sent.current) return
      sent.current = sig(p)
      api('/auth/prefs', { method: 'PUT', body: { prefs: p } }).catch(() => { sent.current = '' })
    }
    push()
    const id = setInterval(push, 15000)
    window.addEventListener('kg-a11y', push)
    document.addEventListener('visibilitychange', push)
    return () => { clearInterval(id); window.removeEventListener('kg-a11y', push); document.removeEventListener('visibilitychange', push) }
  }, [state.status])

  const finish = (user, adopt) => {
    enter(user)
    sessionStorage.setItem(RECONCILED, '1')
    if (adopt && hasPrefs(user.prefs) && applyPrefs(user.prefs)) location.reload()
  }
  const login = useCallback(async (id, password) => finish((await api('/auth/login', { method: 'POST', body: { id, password } })).user, true), [])
  const register = useCallback(async (name, id, password) => finish((await api('/auth/register', { method: 'POST', body: { name, id, password, prefs: readPrefs() } })).user, false), [])
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    remember(null); sessionStorage.removeItem(RECONCILED); setState({ status: 'out', user: null })
  }, [])
  const remove = useCallback(async (password) => {
    await api('/auth/delete', { method: 'POST', body: { password } })
    remember(null); sessionStorage.removeItem(RECONCILED); setState({ status: 'out', user: null })
  }, [])

  return { ...state, login, register, logout, remove, signedIn: state.status === 'in' || state.status === 'offline' }
}

export const openAuth = (mode = 'login') => window.dispatchEvent(new CustomEvent('kg-auth', { detail: { mode } }))
