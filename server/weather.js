import { db } from './db.js'
import { SUBURBS, findSuburb } from '../shared/suburbs.js'

const HOUR = 3600 * 1000
const UA = 'KasiGrid/0.2 (community resilience app)'

// Simple thresholds chosen for Gauteng households. These are NOT official SAWS warnings.
// Each rule has a "watch" level and a stronger "warning" level.
export const RULES = [
  { type: 'rain', field: 'rain', watch: 15, warning: 30, above: true, unit: 'mm', label: 'Heavy rain' },
  { type: 'heat', field: 'max', watch: 34, warning: 38, above: true, unit: '°C', label: 'Extreme heat' },
  { type: 'cold', field: 'min', watch: 3, warning: 0, above: false, unit: '°C', label: 'Frost or very cold' },
  { type: 'wind', field: 'gust', watch: 50, warning: 70, above: true, unit: 'km/h', label: 'Strong wind' },
]

export function deriveAlerts(days) {
  const out = []
  for (const d of days) {
    for (const r of RULES) {
      const v = d[r.field]
      if (v == null) continue
      const hit = (t) => (r.above ? v >= t : v <= t)
      const level = hit(r.warning) ? 'warning' : hit(r.watch) ? 'watch' : null
      if (level) out.push({ type: r.type, level, date: d.date, value: v, unit: r.unit, label: r.label })
    }
  }
  // Worst first, then soonest.
  return out.sort((a, b) => (a.level === b.level ? a.date.localeCompare(b.date) : a.level === 'warning' ? -1 : 1))
}

async function fetchForecast(lat, lng) {
  const url =
    'https://api.open-meteo.com/v1/forecast?' +
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: 'temperature_2m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max',
      timezone: 'Africa/Johannesburg',
      forecast_days: '5',
    })
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error('Weather service unavailable (' + r.status + ')')
  const j = await r.json()
  const d = j.daily
  const days = d.time.map((date, i) => ({
    date,
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i],
    rainProb: d.precipitation_probability_max[i],
    gust: d.wind_gusts_10m_max[i],
  }))
  return { current: { temp: j.current?.temperature_2m ?? null }, days, alerts: deriveAlerts(days), fetchedAt: Date.now() }
}

// Cached for an hour per suburb. Serves stale data if the provider is down.
export async function weatherFor(suburbId) {
  const s = findSuburb(suburbId)
  if (!s) return null
  const key = 'wx:' + s.id
  const hit = await db.execute({ sql: 'SELECT value, ts FROM cache WHERE key = ?', args: [key] })
  const row = hit.rows[0]
  if (row && Date.now() - Number(row.ts) < HOUR) return JSON.parse(row.value)
  try {
    const w = await fetchForecast(s.lat, s.lng)
    await db.execute({ sql: 'INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?,?,?)', args: [key, JSON.stringify(w), Date.now()] })
    return w
  } catch (e) {
    if (row) return JSON.parse(row.value)
    throw e
  }
}
