import { useEffect, useState } from 'react'
import { waterCostFor } from '../shared/tariffs.js'

export const zar = (n) => (Math.round(n) < 0 ? '-R' : 'R') + Math.abs(Math.round(n)).toLocaleString('en-ZA')

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable, keep in memory */
    }
  }, [key, value])
  return [value, setValue]
}

// `t` is optional so this stays usable outside React (tests).
const say = (t, key, vars) => (t ? t(key, vars) : key.replace(/\{(\w+)\}/g, (_, k) => vars[k]))

export function timeAgo(ts, t) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return say(t, '{n} min ago', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return say(t, '{n} h ago', { n: h })
  return say(t, '{n} d ago', { n: Math.round(h / 24) })
}

export function distanceKm(a, b) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Demo loadshedding schedule. A slot is a 2-hour block; a slot is "off" when a
// group-specific pattern falls below the stage. Roughly stage/32 of all slots
// are cut, so stage 4 is about 90 hours a month. NOT an official schedule.
const pad = (n) => String(n).padStart(2, '0')

export function slotsFor(group, stage, from = new Date(), days = 2) {
  if (stage <= 0) return []
  const out = []
  const base = new Date(from)
  base.setHours(0, 0, 0, 0)
  for (let d = 0; d < days; d++) {
    const dayIdx = Math.floor(base.getTime() / 86400000) + d
    for (let k = 0; k < 12; k++) {
      if ((k * 7 + dayIdx * 5 + group * 3) % 32 < stage) {
        const start = new Date(base)
        start.setDate(start.getDate() + d)
        start.setHours(k * 2, 0, 0, 0)
        const end = new Date(start.getTime() + 2 * 3600 * 1000)
        if (end > from) out.push({ start, end })
      }
    }
  }
  return out
}

// Real slots from EskomSePush data: days[].stages[stage - 1] is a list like "20:00-22:30".
export function officialSlots(days, stage, from = new Date()) {
  if (!days || stage <= 0) return []
  const out = []
  for (const d of days) {
    const list = d.stages?.[stage - 1] || []
    for (const range of list) {
      const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(range)
      if (!m) continue
      const [y, mo, da] = d.date.split('-').map(Number)
      const start = new Date(y, mo - 1, da, Number(m[1]), Number(m[2]))
      let end = new Date(y, mo - 1, da, Number(m[3]), Number(m[4]))
      if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000) // a slot that runs past midnight
      if (end > from) out.push({ start, end })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

export const fmtSlot = (s, t) => {
  const today = new Date().toDateString() === s.start.toDateString()
  const h = `${pad(s.start.getHours())}:00 – ${pad(s.end.getHours() % 24)}:00`
  return say(t, today ? 'Today {h}' : 'Tomorrow {h}', { h })
}

export const outageHoursPerMonth = (stage) => stage * 22.5

// Reports become "confirmed" once enough neighbours back them.
export const CONFIRM_THRESHOLD = 3

export const WATER = {
  ok: { label: 'No water reports', color: '#2f855a' },
  low: { label: 'Reported, unconfirmed', color: '#d69e2e' },
  out: { label: 'Outage confirmed by residents', color: '#c53030' },
}

// There is no official public water-outage feed, so status comes from resident reports in the last 24 h.
export function waterStatus(reports, suburbId) {
  const recent = reports.filter((r) => r.suburb === suburbId && r.type === 'water' && Date.now() - r.ts < 24 * 3600 * 1000)
  if (recent.some((r) => r.confirms >= CONFIRM_THRESHOLD)) return 'out'
  return recent.length ? 'low' : 'ok'
}

export const waLink = (text) => 'https://wa.me/?text=' + encodeURIComponent(text)

// Johannesburg water cost incl. VAT. Other cities: use waterCostFor(cityId, kl) from shared/tariffs.js.
export const waterCost = (kl) => waterCostFor('joburg', kl)

// Household savings calculator. Percentages are typical South African household
// rules of thumb; every figure is an estimate, shown as such in the UI.
// `waterFn(kl)` returns the monthly water cost for kl kilolitres, so each city can use its own tariff.
export function savingsTips(p, waterFn = waterCost) {
  const bill = p.bill
  const tips = []
  if (p.geyser === 'electric') {
    if (!p.timer)
      tips.push({ id: 'timer', kind: 'power', title: 'Fit a geyser timer', how: 'Heat water only 05:00–07:00 and 17:00–19:00. Timers cost about R450 and pay back fast.', save: bill * 0.35 * 0.2, upfront: 450 })
    if (!p.blanket)
      tips.push({ id: 'blanket', kind: 'power', title: 'Wrap the geyser and pipes', how: 'A geyser blanket cuts standing heat loss. About R250 from a hardware store.', save: bill * 0.35 * 0.1, upfront: 250 })
    tips.push({ id: 'thermo', kind: 'power', title: 'Lower geyser thermostat to 55°C', how: 'Free. Most are set higher than needed.', save: bill * 0.35 * 0.1, upfront: 0 })
  }
  if (!p.led)
    tips.push({ id: 'led', kind: 'power', title: 'Switch remaining bulbs to LED', how: 'LEDs use about 80% less power than old bulbs. About R35 per bulb.', save: bill * 0.1 * 0.7, upfront: 35 * 6 })
  tips.push({ id: 'standby', kind: 'power', title: 'Switch off standby devices', how: 'Use a multi-plug switch for TV, decoder and chargers overnight.', save: bill * 0.05, upfront: 0 })
  if (p.oldFridge)
    tips.push({ id: 'fridge', kind: 'power', title: 'Replace a fridge older than 10 years', how: 'Long-term. Newer A+ fridges use around 40% less. Good candidate for stokvel or savings-goal funding.', save: bill * 0.15 * 0.4, upfront: 4500 })
  tips.push({ id: 'cook', kind: 'power', title: 'Cook with lids on and use a pressure cooker', how: 'Cuts stove time by a third for beans, stews and samp.', save: bill * 0.04, upfront: 0 })

  const cutWater = (pct) => waterFn(p.water) - waterFn(p.water * (1 - pct))
  tips.push({ id: 'leaks', kind: 'water', title: 'Check for leaks', how: 'Read the meter before bed and after waking. Any movement means a leak. Toilet cisterns are the usual cause.', save: cutWater(0.1), upfront: 0 })
  tips.push({ id: 'shower', kind: 'water', title: 'Shower 2 minutes shorter or use a bucket', how: 'Catch cold start-up water and use it for cleaning or plants.', save: cutWater(0.1), upfront: 0 })
  tips.push({ id: 'grey', kind: 'water', title: 'Reuse washing water for the garden or toilet flushing', how: 'Also gives you a buffer during water outages.', save: cutWater(0.08), upfront: 0 })
  return tips.map((t) => ({ ...t, save: Math.round(t.save) }))
}

// Small-business resilience. Returns current monthly loss, score and ranked fixes.
export function businessAnalysis(b, stage, type) {
  const outHours = outageHoursPerMonth(stage)
  const hourlyRevenue = b.dailyRevenue / type.hoursOpen
  // Share of outage hours that overlap opening times.
  const overlap = Math.min(1, type.hoursOpen / 24 + 0.2)
  const cover = { none: 0, gas: 0.25, inverter: 0.7, solar: 0.9 }[b.backup]
  const powerLoss = outHours * overlap * hourlyRevenue * type.powerDep * (1 - cover) * 0.6
  const spoilage = type.cold && b.coldStock > 0 && !b.coldBackup ? b.coldStock * 0.08 * Math.min(1, stage / 4) : 0
  const waterDays = b.waterDays
  const waterLoss = waterDays * b.dailyRevenue * type.waterDep * (b.tank ? 0.15 : 1)
  const loss = powerLoss + spoilage + waterLoss
  const monthlyRevenue = b.dailyRevenue * 26
  const lossShare = monthlyRevenue ? loss / monthlyRevenue : 0
  const score = Math.max(5, Math.round(100 - Math.min(1, lossShare / 0.2) * 95))

  const fixes = []
  if (b.backup === 'none' || b.backup === 'gas') {
    const gain = (0.7 - cover) / (1 - cover || 1)
    const save = powerLoss * gain
    fixes.push({ id: 'inv', title: 'Inverter + battery for tools, lights and till', cost: 6500, save })
  }
  if (b.backup !== 'solar') {
    const solarSave = b.backup === 'none' ? powerLoss * 0.9 : b.backup === 'gas' ? powerLoss * 0.87 : powerLoss * 0.67
    fixes.push({ id: 'solar', title: 'Solar kit (panels + battery) to keep running through long outages', cost: 12500, save: solarSave })
  }
  if (type.cold && b.coldStock > 0 && !b.coldBackup)
    fixes.push({ id: 'cold', title: 'Insulated cold box or chest freezer on a battery', cost: 3800, save: spoilage * 0.85 })
  if (type.waterDep > 0.1 && !b.tank && waterDays > 0)
    fixes.push({ id: 'tank', title: '500L water tank with a tap', cost: 1800, save: waterLoss * 0.85 })
  const ranked = fixes
    .map((f) => ({ ...f, save: Math.round(f.save), payback: f.save > 0 ? f.cost / f.save : Infinity }))
    .filter((f) => f.save > 0)
    .sort((a, b) => a.payback - b.payback)
  return { outHours, powerLoss, spoilage, waterLoss, loss, score, fixes: ranked }
}
