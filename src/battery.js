import { useCallback, useEffect, useState } from 'react'
import { BATTERY_STAGES, ambulanceDue, batteryRuntime, batteryStage, remainingHours } from '../shared/care.js'

// The household's medical battery plan and the live "on battery" tracker. Both stay on the phone. Several parts of the app
// read them (the plan card, the alert banner on every screen), so changes announce themselves with an event.
const PLAN = 'kg2.medplan'
const TRACK = 'kg2.battery'
const ALERTED = 'kg2.battery.alerted'
export const DEFAULT_PLAN = { watts: '', wh: '', charge: 100, health: 100, chemistry: 'liion', inverter: true, lifeSupport: false }

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
const write = (key, value) => {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('kg-battery'))
}
const num = (v, d) => (v === '' || v == null || Number.isNaN(Number(v)) ? d : Number(v))

export const loadPlan = () => ({ ...DEFAULT_PLAN, ...(read(PLAN) || {}) })
export const loadTrack = () => read(TRACK)

export function useBattery() {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = () => bump((n) => n + 1)
    const id = setInterval(on, 15000)
    window.addEventListener('kg-battery', on)
    window.addEventListener('storage', on)
    document.addEventListener('visibilitychange', on)
    return () => { clearInterval(id); window.removeEventListener('kg-battery', on); window.removeEventListener('storage', on); document.removeEventListener('visibilitychange', on) }
  }, [])

  const plan = loadPlan()
  const track = loadTrack()
  const model = { wh: num(plan.wh, 0), watts: num(plan.watts, 0), health: num(plan.health, 100), chemistry: plan.chemistry, inverter: plan.inverter !== false }
  const full = batteryRuntime({ ...model, charge: 100 })
  const runtime = batteryRuntime({ ...model, charge: num(plan.charge, 100) })
  const status = track ? remainingHours({ full, start: track.start, startPct: track.startPct, readings: track.readings || [] }) : null
  const stage = status ? batteryStage(status.left) : 'ok'

  const setPlan = useCallback((patch) => write(PLAN, { ...loadPlan(), ...patch }), [])
  const start = useCallback((at = Date.now()) => write(TRACK, { start: at, startPct: num(loadPlan().charge, 100), readings: [] }), [])
  const addReading = useCallback((pct) => {
    const tr = loadTrack()
    if (!tr) return
    write(TRACK, { ...tr, readings: [...(tr.readings || []), { t: Date.now(), pct: Math.min(100, Math.max(0, Number(pct))) }].slice(-20) })
  }, [])
  const stop = useCallback(() => { write(TRACK, null); write(ALERTED, null) }, [])

  return { plan, track, full, runtime, status, stage, due: status ? ambulanceDue(stage, !!plan.lifeSupport) : false, setPlan, start, addReading, stop }
}

// ---- alerts: a noise, a buzz and a notification each time the battery moves to a worse stage -----------------------------
export const stageRank = (s) => BATTERY_STAGES.indexOf(s)
export const lastAlerted = () => read(ALERTED)
export const markAlerted = (start, stage) => write(ALERTED, { start, stage })

export { beep } from './a11y.js'

export async function notify(title, body) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const opts = { body, icon: '/icon-192.png', tag: 'kg-battery', renotify: true, requireInteraction: true, vibrate: [300, 150, 300, 150, 600] }
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) reg.showNotification(title, opts)
    else new Notification(title, opts)
  } catch { /* notifications are a bonus */ }
}

// A calendar file with an alarm at each stage, so a phone's own calendar can warn even when this page is closed.
export function batteryIcs(endMs, name = 'Medical battery') {
  const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const marks = [[120, '2 hours of battery left'], [60, '1 hour of battery left. Call 10177 if this device keeps someone alive'], [30, '30 minutes of battery left. Call 10177 now if you cannot stop using it'], [10, '10 minutes left']]
  const events = marks.filter(([m]) => endMs - m * 60000 > Date.now()).map(([m, text], i) => [
    'BEGIN:VEVENT', `UID:kg-battery-${endMs}-${i}@kasigrid`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(endMs - m * 60000)}`, `DTEND:${stamp(endMs - m * 60000 + 5 * 60000)}`,
    `SUMMARY:${name}: ${text}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${name}: ${text}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT',
  ].join('\r\n'))
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kasi Grid//Battery//EN', ...events, 'END:VCALENDAR'].join('\r\n')
}
