// DEMO ONLY: writes 12 weeks of plausible outage history for one suburb straight into the database, so the
// Outage Forecast card has something to show. These rows look like real reports, so never run this on a live database.
// Usage: DATABASE_URL=file:data/kasi.db node scripts/demo-history.mjs [suburb]
import { createClient } from '@libsql/client'
import { migrate } from '../server/db.js'
const suburb = process.argv[2] || 'alex'
const db = createClient({ url: process.env.DATABASE_URL || 'file:data/kasi.db', authToken: process.env.DATABASE_AUTH_TOKEN })
await migrate()
const DAY = 86400e3
const now = Date.now()
const monday = new Date(now); monday.setUTCHours(5, 30, 0, 0) // 07:30 SAST
let n = 0
for (let w = 1; w <= 10; w++) {
  // Water usually goes out on Monday mornings; an occasional power cut on a Thursday evening.
  const d = new Date(monday); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7 * (w - 1))
  const rows = [['water', d.getTime(), 'No water since early this morning']]
  if (w % 3 === 0) rows.push(['power', d.getTime() + 3 * DAY + 11 * 3600e3, 'Power cut, not on the schedule'])
  for (const [type, ts, text] of rows) {
    if (ts > now) continue
    const r = await db.execute({ sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,owner) VALUES (?,?,?,?,?,?)', args: [suburb, type, text, ts, 3, 'demo-history-owner'] })
    for (const dev of ['hist-a', 'hist-b', 'hist-c']) await db.execute({ sql: 'INSERT OR IGNORE INTO report_confirms (report_id, device) VALUES (?,?)', args: [Number(r.lastInsertRowid), dev + '-0000000000000000'] })
    n++
  }
}
console.log(`Wrote ${n} demo history reports for ${suburb}.`)
