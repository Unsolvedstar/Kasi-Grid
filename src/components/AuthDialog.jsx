import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { announce } from '../a11y.js'
import { openAuth } from '../auth.js'

// Sign in or create an account. Always optional: the dialog says so, and closes on Escape or the Close button.
export default function AuthDialog({ auth }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef(null)

  useEffect(() => {
    const on = (e) => { setMode(e.detail?.mode || 'login'); setErr(''); setOpen(true) }
    window.addEventListener('kg-auth', on)
    return () => window.removeEventListener('kg-auth', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    first.current?.focus()
    return () => window.removeEventListener('keydown', esc)
  }, [open, mode])
  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      if (mode === 'login') await auth.login(id, pw)
      else await auth.register(name, id, pw)
      announce(t('Signed in. Next time the app opens you will be signed in automatically.'))
      setOpen(false)
      setPw('')
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }
  const register = mode === 'register'

  return (
    <div className="auth-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <form className="auth" role="dialog" aria-modal="true" aria-labelledby="auth-h" onSubmit={submit}>
        <button type="button" className="auth-x" onClick={() => setOpen(false)} aria-label={t('Close')}><Icon name="close" /></button>
        <h2 id="auth-h">{register ? t('Create your free account') : t('Welcome back')}</h2>
        <p className="muted small">{t('Optional. Kasi Grid works without an account. An account keeps your area, language and accessibility settings, and your bookings, on any phone, and you stay signed in.')}</p>
        <div className="chips" role="tablist">
          <button type="button" role="tab" aria-selected={!register} className={!register ? 'chip on' : 'chip'} onClick={() => { setMode('login'); setErr('') }}>{t('Sign in')}</button>
          <button type="button" role="tab" aria-selected={register} className={register ? 'chip on' : 'chip'} onClick={() => { setMode('register'); setErr('') }}>{t('Create account')}</button>
        </div>
        {register && <label>{t('Your first name (optional)')}<input ref={first} value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} /></label>}
        <label>{t('Cell number or email')}<input ref={register ? undefined : first} value={id} inputMode="email" autoComplete="username" required onChange={(e) => setId(e.target.value)} placeholder="082 123 4567" /></label>
        <div className="field">
          <label htmlFor="auth-pw">{t('Password')}</label>
          <span className="pw">
            <input id="auth-pw" type={show ? 'text' : 'password'} value={pw} required minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="ghost" aria-pressed={show} aria-label={show ? t('Hide password') : t('Show password')} onClick={() => setShow(!show)}>{show ? t('Hide') : t('Show')}</button>
          </span>
        </div>
        {register && <p className="muted small">{t('At least 8 characters. We keep only a scrambled copy of it, your number or email, and the settings above. Your medical plan stays on your phone.')}</p>}
        {err && <p className="notice" role="alert">{err}</p>}
        <button className="primary" disabled={busy || !id.trim() || !pw}>{busy ? '…' : register ? t('Create account') : t('Sign in')}</button>
        <button type="button" className="link" onClick={() => setOpen(false)}>{t('Not now, continue without an account')}</button>
      </form>
    </div>
  )
}

// The account line inside Settings.
export function AccountPanel({ auth }) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  if (!auth.signedIn) {
    return (
      <div className="account">
        <p className="muted small">{t('Optional: an account keeps your settings and bookings on any phone, and signs you in automatically.')}</p>
        <div className="chips">
          <button type="button" className="primary" onClick={() => openAuth('login')}>{t('Sign in')}</button>
          <button type="button" className="ghost" onClick={() => openAuth('register')}>{t('Create account')}</button>
        </div>
      </div>
    )
  }
  const del = async (e) => {
    e.preventDefault()
    try { await auth.remove(pw); setAsking(false); setPw(''); setErr('') } catch (x) { setErr(x.message) }
  }
  return (
    <div className="account">
      <p><strong>{auth.user.name || t('Signed in')}</strong> <span className="muted small">{auth.user.handle}{auth.status === 'offline' ? ` · ${t('offline')}` : ''}</span></p>
      <p className="muted small">{t('You are signed in on this phone and will be every time the app opens.')}</p>
      <div className="chips">
        <button type="button" className="ghost" onClick={auth.logout}>{t('Sign out')}</button>
        <button type="button" className="link" onClick={() => setAsking(!asking)}>{t('Delete my account')}</button>
      </div>
      {asking && (
        <form className="form inline" onSubmit={del}>
          <input type="password" value={pw} autoComplete="current-password" onChange={(e) => setPw(e.target.value)} placeholder={t('Your password')} aria-label={t('Your password')} required />
          <button className="primary" disabled={!pw}>{t('Delete for good')}</button>
          {err && <p className="notice" role="alert">{err}</p>}
        </form>
      )}
    </div>
  )
}
