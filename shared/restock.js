// Pooled restocking for spazas: shops in one suburb order together, and the more packs the pool holds, the lower the price per pack.
// The base price is the NAMC national average for the pack (what a shop pays alone). The discount tiers are PLACEHOLDERS until a
// wholesaler quotes real ones, so every screen that shows them says so.
import { STAPLES } from './namc.js'

export const TIERS = [
  { min: 0, off: 0 },
  { min: 20, off: 0.05 },
  { min: 50, off: 0.09 },
  { min: 100, off: 0.12 },
]
export const MAX_QTY = 50
export const CUTOFF_DOW = 4 // Thursday (UTC)
export const CUTOFF_HOUR_UTC = 16 // 18:00 SAST

export const CATALOGUE = STAPLES.map(({ id, label, ref }) => ({ id, label, ref }))
export const ITEM_IDS = CATALOGUE.map((i) => i.id)

// The ordering cycle that `now` falls in: it closes at the next Thursday 18:00 SAST. The key is that date, e.g. "2026-10-15".
export function cycleOf(now = Date.now()) {
  const d = new Date(now)
  d.setUTCHours(CUTOFF_HOUR_UTC, 0, 0, 0)
  let add = (CUTOFF_DOW - d.getUTCDay() + 7) % 7
  if (add === 0 && d.getTime() <= now) add = 7
  d.setUTCDate(d.getUTCDate() + add)
  return { key: d.toISOString().slice(0, 10), cutoff: d.getTime() }
}

// Discount for a pool of `units` packs of one item, and how many more packs unlock the next tier.
export function tierFor(units) {
  let i = 0
  while (i + 1 < TIERS.length && units >= TIERS[i + 1].min) i++
  const next = TIERS[i + 1]
  return { off: TIERS[i].off, next: next ? { off: next.off, more: next.min - units } : null }
}

const r2 = (n) => Math.round(n * 100) / 100

// totals: { itemId: packsInPool }, mine: { itemId: myPacks }. Returns a row per item that is in the pool or in my basket,
// plus what I pay now, what I would pay alone, and what I save.
export function summarize(totals = {}, mine = {}) {
  const rows = []
  let pay = 0
  let alone = 0
  let poolValue = 0
  let poolSaving = 0
  for (const it of CATALOGUE) {
    const units = Math.max(0, Number(totals[it.id]) || 0)
    const my = Math.max(0, Number(mine[it.id]) || 0)
    if (!units && !my) continue
    const { off, next } = tierFor(units)
    const price = r2(it.ref * (1 - off))
    rows.push({ ...it, units, my, off, price, next })
    pay += price * my
    alone += it.ref * my
    poolValue += price * units
    poolSaving += (it.ref - price) * units
  }
  return { rows, pay: r2(pay), alone: r2(alone), saving: r2(alone - pay), poolValue: r2(poolValue), poolSaving: r2(poolSaving) }
}
