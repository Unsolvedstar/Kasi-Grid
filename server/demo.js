// DEMO MODE ONLY (DEMO_MODE=true). Keeps a judge-facing copy of the app in a rich state: ten weeks of outage history with
// "back on" votes (so the forecast and typical-duration estimate have data) and two fresh verified outages on the map.
// These rows look like real reports and count in /api/stats, so never turn this on for a pilot or production database.
import { cycleOf } from '../shared/restock.js'
const DAY = 86400e3
const HOUR = 3600e3

// Water usually goes out on Monday mornings, an occasional power cut on a Thursday evening. Written once per suburb.
export async function seedHistory(db, suburb = 'alex') {
  const done = await db.execute({ sql: `SELECT 1 FROM reports WHERE owner = 'demo-history-owner' AND suburb = ? LIMIT 1`, args: [suburb] })
  if (done.rows.length) return 0
  const now = Date.now()
  const monday = new Date(now)
  monday.setUTCHours(5, 30, 0, 0) // 07:30 SAST
  let n = 0
  for (let w = 1; w <= 10; w++) {
    const d = new Date(monday)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 * (w - 1))
    const rows = [['water', d.getTime(), 'No water since early this morning']]
    if (w % 3 === 0) rows.push(['power', d.getTime() + 3 * DAY + 11 * HOUR, 'Power cut, not on the schedule'])
    for (const [type, ts, text] of rows) {
      if (ts > now) continue
      const r = await db.execute({ sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,owner) VALUES (?,?,?,?,?,?)', args: [suburb, type, text, ts, 3, 'demo-history-owner'] })
      const id = Number(r.lastInsertRowid)
      for (const dev of ['hist-a', 'hist-b', 'hist-c']) await db.execute({ sql: 'INSERT OR IGNORE INTO report_confirms (report_id, device) VALUES (?,?)', args: [id, dev + '-0000000000000000'] })
      // Neighbours marked it back on after a plausible time: water 5 to 9 hours, power 2 to 5.
      const hours = type === 'water' ? 5 + (n % 5) : 2 + (n % 4)
      await db.execute({ sql: 'INSERT OR IGNORE INTO report_restored (report_id, device, ts) VALUES (?,?,?)', args: [id, 'hist-a-0000000000000000', ts + hours * HOUR] })
      n++
    }
  }
  return n
}

// Replaces the live demo outages so there is always a verified one that started a little while ago.
const LIVE = [
  { suburb: 'alex', type: 'power', text: 'No power since a few minutes ago, whole street', ago: 25 * 60e3 },
  { suburb: 'soweto', type: 'water', text: 'No water in our section since this morning', ago: 2 * HOUR },
]
export async function refreshOutages(db) {
  const old = await db.execute(`SELECT id FROM reports WHERE owner = 'demo-live-owner'`)
  for (const r of old.rows) {
    const id = Number(r.id)
    await db.batch([
      { sql: 'DELETE FROM report_confirms WHERE report_id = ?', args: [id] },
      { sql: 'DELETE FROM report_restored WHERE report_id = ?', args: [id] },
      { sql: 'DELETE FROM reports WHERE id = ?', args: [id] },
    ], 'write')
  }
  const now = Date.now()
  for (const o of LIVE) {
    const r = await db.execute({ sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,owner) VALUES (?,?,?,?,?,?)', args: [o.suburb, o.type, o.text, now - o.ago, 3, 'demo-live-owner'] })
    for (const dev of ['demo-a', 'demo-b', 'demo-c']) await db.execute({ sql: 'INSERT OR IGNORE INTO report_confirms (report_id, device) VALUES (?,?)', args: [Number(r.lastInsertRowid), dev + '-0000000000000000'] })
  }
}

// Neighbouring demo spazas with baskets in the current cycle, so the pool always shows a discount tier and a next one to reach.
const DEMO_SHOPS = [
  ['Mama Lindi Tuck Shop', { maize: 12, bread: 14, oil: 6, sugar: 5, milk: 8 }],
  ['Bra Sipho Spaza', { maize: 10, rice: 8, oil: 5, eggs: 6, bread: 10 }],
  ['Thandi Corner Shop', { maize: 8, sugar: 6, milk: 10, beans: 4, whitebread: 8 }],
  ['Kagiso General Dealer', { maize: 6, rice: 6, oil: 4, potatoes: 6, onions: 4 }],
]
export async function refreshRestock(db, cycleKey) {
  await db.execute(`DELETE FROM restock_lines WHERE device LIKE 'demo-shop-%'`)
  const now = Date.now()
  const stmts = []
  for (const suburb of ['alex', 'soweto']) {
    DEMO_SHOPS.forEach(([shop, items], i) => {
      for (const [item, qty] of Object.entries(items)) stmts.push({ sql: 'INSERT INTO restock_lines (cycle, suburb, device, shop, item, qty, ts) VALUES (?,?,?,?,?,?,?)', args: [cycleKey, suburb, `demo-shop-${suburb}-${i}-0000000000`, shop, item, qty, now] })
    })
  }
  await db.batch(stmts, 'write')
}

export async function startDemo(db) {
  const n = await seedHistory(db, 'alex')
  await seedHistory(db, 'soweto')
  await refreshOutages(db)
  await refreshRestock(db, cycleOf().key)
  setInterval(() => refreshRestock(db, cycleOf().key).catch((e) => console.error('demo restock failed', e.message)), 6 * HOUR).unref()
  // The pulse looks at the last 6 hours, so keep the demo outages fresh while the server stays up.
  setInterval(() => refreshOutages(db).catch((e) => console.error('demo refresh failed', e.message)), 30 * 60e3).unref()
  console.log(`DEMO MODE: ${n} history reports written, live demo outages refreshed every 30 minutes. Do not use this database for a real pilot.`)
}
