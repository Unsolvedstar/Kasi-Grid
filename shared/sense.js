// Hour-by-hour risk for the next 48 hours, blended from every signal we have: the loadshedding slots, the suburb's own
// outage pattern, and any verified outage running now. Pure and transparent: each hour says WHY it is risky.
const H = 3600 * 1000
const CONF = { high: 0.65, medium: 0.4, low: 0.22 }
export const HOURS = 48

// slots: [{start: Date, end: Date}]; fc: /api/forecast body; incidents: verified incidents for this suburb;
// medianHours: {power, water} typical outage length (or null). Returns [{ t, power, water, why: [...] }] for hours 0..HOURS.
export function riskTimeline({ now = Date.now(), slots = [], fc = null, incidents = [], medianHours = {} } = {}) {
  const base = Math.floor(now / H) * H
  const out = []
  for (let i = 0; i <= HOURS; i++) {
    const a = base + i * H
    const b = a + H
    const hour = { t: a, power: 0, water: 0, why: [] }
    const bump = (type, v, why) => {
      if (v > hour[type]) hour[type] = Math.min(1, v)
      if (!hour.why.includes(why)) hour.why.push(why)
    }
    for (const s of slots) if (s.start.getTime() < b && s.end.getTime() > a) bump('power', 1, 'loadshedding')
    for (const type of ['power', 'water']) {
      const p = fc?.[type]
      if (p?.pattern && p.next && p.next.start < b && p.next.end > a) bump(type, CONF[p.confidence] ?? 0.2, 'pattern')
      for (const inc of incidents) {
        if (inc.type !== type || inc.resolved) continue
        const end = inc.since + (medianHours?.[type] ?? 3) * H
        if (a < Math.max(end, now + H)) bump(type, a < end ? 1 : 0.55, 'verified')
      }
    }
    for (const w of fc?.building ?? []) if (i < 3) bump(w.type, 0.35, 'building')
    out.push(hour)
  }
  return out
}

// One number for the sound and the heartbeat: 0 calm .. 1 outage now.
export const mood = (tl, i = 0) => Math.max(tl[i]?.power ?? 0, tl[i]?.water ?? 0)

// What a household should do about the risk at hour i, as plain keys the UI can translate.
export function advise(tl, i) {
  const h = tl[i]
  if (!h) return []
  const out = []
  const ahead = (type, n) => tl.slice(i, i + n + 1).some((x) => x[type] >= 0.5)
  if (h.power >= 0.5) out.push('cook-gas', 'lantern', 'fridge-shut')
  else if (ahead('power', 3)) out.push('charge', 'cook-now')
  if (h.water >= 0.5) out.push('use-stored')
  else if (ahead('water', 3)) out.push('fill-water')
  if (!out.length) out.push('calm')
  return out
}
