import { useEffect, useState } from 'react'

// Accessibility preferences and the ways an alert can reach a person. Nothing important is ever sound-only (deaf and hard of
// hearing), and nothing is picture-only (blind and low vision): every alert can flash, buzz, show as large text, be
// announced to a screen reader and be spoken aloud. Preferences stay on the phone.
const KEY = 'kg2.a11y'
export const DEFAULTS = { bright: true, profile: null, scale: 1, contrast: false, calm: false, sound: true, vibrate: true, flash: false, speak: false }
export const PROFILES = {
  deaf: { flash: true, vibrate: true, sound: false, speak: false },
  // Spoken alerts and a full-height panel for screen-reader users. Text size and contrast stay the person's own choice.
  blind: { speak: true, sound: true, vibrate: true, flash: false },
}

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {} } catch { return {} }
}
export const loadA11y = () => ({ ...DEFAULTS, ...read() })

export function applyA11y(p = loadA11y()) {
  const r = document.documentElement
  r.style.setProperty('--text-scale', String(p.scale))
  r.classList.toggle('hc', !!p.contrast)
  r.classList.toggle('bright', !!p.bright)
  r.classList.toggle('calm', !!p.calm)
}
export function saveA11y(patch) {
  const next = { ...loadA11y(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  applyA11y(next)
  window.dispatchEvent(new Event('kg-a11y'))
}
export const applyProfile = (name) => saveA11y(name ? { ...DEFAULTS, ...PROFILES[name], profile: name } : { ...DEFAULTS })

export function useA11y() {
  const [p, setP] = useState(loadA11y)
  useEffect(() => {
    const on = () => setP(loadA11y())
    window.addEventListener('kg-a11y', on)
    return () => window.removeEventListener('kg-a11y', on)
  }, [])
  return p
}

// ---- channels -------------------------------------------------------------------------------------------------------
export const announce = (msg, assertive = false) => window.dispatchEvent(new CustomEvent('kg-announce', { detail: { msg, assertive } }))
export const caption = (msg) => window.dispatchEvent(new CustomEvent('kg-caption', { detail: { msg } }))
export const flash = () => window.dispatchEvent(new Event('kg-flash'))

const VOICE = { en: 'en-ZA', af: 'af-ZA', zu: 'zu-ZA', st: 'st-ZA' }
export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = VOICE[document.documentElement.lang] || 'en-ZA'
  speechSynthesis.speak(u)
}

export function beep(urgent) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const times = urgent ? [0, 0.35, 0.7, 1.05] : [0, 0.4]
    for (const at of times) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = urgent ? 880 : 660
      o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.25)
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.28)
    }
    setTimeout(() => ctx.close(), 1800)
  } catch { /* no audio until the person has touched the page */ }
}

// One call reaches a person every way they have switched on. The words always appear as large text and are announced to
// screen readers, whatever the settings, because that costs nobody anything.
export function alertUser({ text, urgent = false }) {
  const p = loadA11y()
  caption(text)
  announce(text, urgent)
  if (p.sound) beep(urgent)
  if (p.vibrate) navigator.vibrate?.(urgent ? [400, 150, 400, 150, 800] : [250, 120, 250])
  if (p.flash) flash()
  if (p.speak) speak(text)
}

// True when any preference differs from the defaults, so the accessibility button can show that something is switched on.
export const isCustom = (p) => Object.keys(DEFAULTS).some((k) => k !== 'profile' && p[k] !== DEFAULTS[k]) || !!p.profile
