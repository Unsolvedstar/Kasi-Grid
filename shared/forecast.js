// Pattern forecast from a suburb's own report history. Rule-based and transparent: it finds the weekday and time of day
// when outages cluster, and warns when fresh reports look like the start of one. South African time (UTC+2) throughout.
export const BANDS = [
  { id: 'morning', label: 'morning', from: 5, to: 12 },
  { id: 'afternoon', label: 'afternoon', from: 12, to: 17 },
  { id: 'evening', label: 'evening', from: 17, to: 22 },
  { id: 'night', label: 'night', from: 22, to: 29 }, // 22:00 to 05:00
]
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SAST = 2 * 3600 * 1000
const DAY = 24 * 3600 * 1000
const HISTORY = 90 * DAY
export const MIN_EVENTS = 4
export const MIN_DAYS = 3

const local = (ts) => new Date(ts + SAST) // read with the getUTC* methods
const bandOf = (h) => BANDS.find((b) => (h >= b.from && h < b.to) || (h + 24 >= b.from && h + 24 < b.to))

// events: [{ type, ts, devices }]. Returns { power, water, building } for one suburb.
export function forecast(events, now = Date.now()) {
  const out = { building: [] }
  for (const type of ['power', 'water']) {
    const ev = events.filter((e) => e.type === type && now - e.ts < HISTORY && e.ts <= now)
    const days = new Set(ev.map((e) => Math.floor((e.ts + SAST) / DAY)))
    if (ev.length < MIN_EVENTS || days.size < MIN_DAYS) {
      out[type] = { enough: false, events: ev.length, days: days.size }
    } else {
      const tally = new Map()
      for (const e of ev) {
        const l = local(e.ts)
        const b = bandOf(l.getUTCHours())
        // An event after midnight but before 05:00 belongs to the previous evening's "night" band for the weekday.
        const dow = b.id === 'night' && l.getUTCHours() < 5 ? (l.getUTCDay() + 6) % 7 : l.getUTCDay()
        const k = dow + '|' + b.id
        tally.set(k, (tally.get(k) || 0) + 1)
      }
      const [key, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
      if (count < 2) {
        out[type] = { enough: true, pattern: false, events: ev.length, days: days.size }
      } else {
        const [dow, band] = key.split('|')
        const share = count / ev.length
        out[type] = {
          enough: true, pattern: true, events: ev.length, days: days.size, dow: Number(dow), band, count,
          share: Math.round(share * 100), confidence: share >= 0.5 ? 'high' : share >= 0.3 ? 'medium' : 'low',
          next: nextWindow(Number(dow), band, now),
        }
      }
    }
    // Early warning: two different neighbours in the last 3 hours is one short of a verified outage.
    const recent = events.filter((e) => e.type === type && now - e.ts < 3 * 3600 * 1000 && e.ts <= now)
    const devs = new Set(recent.flatMap((e) => e.devices))
    if (devs.size === 2) out.building.push({ type, devices: 2 })
  }
  return out
}

// Start (epoch ms) of the next time the given weekday and band occur. If we are inside it right now, that is "now".
export function nextWindow(dow, bandId, now) {
  const b = BANDS.find((x) => x.id === bandId)
  const l = local(now)
  const midnight = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) - SAST
  for (let d = 0; d <= 7; d++) {
    const dayStart = midnight + d * DAY
    if (local(dayStart).getUTCDay() !== dow) continue
    const start = dayStart + b.from * 3600 * 1000
    const end = dayStart + b.to * 3600 * 1000
    if (end > now) return { start: Math.max(start, now), end, now: start <= now }
  }
  return null
}
