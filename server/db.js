import { mkdirSync } from 'node:fs'
import { createClient } from '@libsql/client'

// Local SQLite file by default. Set DATABASE_URL (and DATABASE_AUTH_TOKEN) to use a hosted libSQL/Turso database.
if (!process.env.DATABASE_URL) mkdirSync('data', { recursive: true })
export const db = createClient({
  url: process.env.DATABASE_URL || 'file:data/kasi.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const HOUR = 3600 * 1000

export async function migrate() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, suburb TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL,
        ts INTEGER NOT NULL, confirms INTEGER NOT NULL DEFAULT 1, owner TEXT, sample INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS report_confirms (report_id INTEGER, device TEXT, PRIMARY KEY (report_id, device))`,
      `CREATE TABLE IF NOT EXISTS shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, category TEXT NOT NULL, suburb TEXT NOT NULL, title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, ts INTEGER NOT NULL, interested INTEGER NOT NULL DEFAULT 0,
        done INTEGER NOT NULL DEFAULT 0, owner TEXT, sample INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS share_interest (share_id INTEGER, device TEXT, PRIMARY KEY (share_id, device))`,
      `CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, hours TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '', lat REAL NOT NULL, lng REAL NOT NULL, ts INTEGER NOT NULL, owner TEXT, hidden INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS prices (
        place_id TEXT NOT NULL, item TEXT NOT NULL, price REAL NOT NULL, ts INTEGER NOT NULL, device TEXT, PRIMARY KEY (place_id, item))`,
      `CREATE TABLE IF NOT EXISTS flags (kind TEXT, target_id INTEGER, device TEXT, PRIMARY KEY (kind, target_id, device))`,
      `CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, ts INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
      `CREATE TABLE IF NOT EXISTS suburb_areas (suburb TEXT PRIMARY KEY, area_id TEXT NOT NULL, area_name TEXT, updated INTEGER)`,
      `CREATE TABLE IF NOT EXISTS namc_snapshots (issue INTEGER PRIMARY KEY, period TEXT NOT NULL, data TEXT NOT NULL, pdf_url TEXT, fetched_at INTEGER NOT NULL)`,
    ],
    'write',
  )
  const seeded = await db.execute(`SELECT value FROM meta WHERE key = 'seeded'`)
  if (seeded.rows.length) return
  const now = Date.now()
  const reports = [
    ['alex', 'power', 'Transformer humming loudly on 4th Ave, lights flickering.', 2, 4],
    ['diepsloot', 'water', 'Water gushing from a burst pipe near the clinic.', 5, 7],
    ['soweto', 'road', 'Taxi rank flooded, minibuses using the back road.', 1, 1],
    ['katlehong', 'power', 'No power since last night, not on the loadshedding schedule.', 9, 2],
  ]
  const shares = [
    ['offer', 'power', 'soweto', 'Phone & power bank charging', 'I have a solar setup. Free charging from 08:00 to 20:00, bring your own cable.', 'Thandi', 6, 3],
    ['offer', 'water', 'diepsloot', 'Borehole water, 25L free per household', 'Bring your own containers.', 'Bra Sipho', 4, 9],
    ['request', 'food', 'alex', 'Need freezer space for a few hours', 'Stock from my tuck shop will thaw during loadshedding tonight.', 'Mama Lindi', 3, 1],
    ['offer', 'transport', 'mamelodi', 'Lift to Denneboom station 06:00 weekdays', '3 seats free, R15 petrol contribution.', 'Kagiso', 20, 2],
    ['request', 'water', 'katlehong', 'Elderly neighbour needs water carried', 'Two 20L buckets from the tanker to Section 5.', 'Nomsa', 1, 0],
  ]
  await db.batch(
    [
      ...reports.map(([suburb, type, text, hrs, confirms]) => ({
        sql: 'INSERT INTO reports (suburb,type,text,ts,confirms,sample) VALUES (?,?,?,?,?,1)',
        args: [suburb, type, text, now - hrs * HOUR, confirms],
      })),
      ...shares.map(([kind, category, suburb, title, detail, name, hrs, interested]) => ({
        sql: 'INSERT INTO shares (kind,category,suburb,title,detail,name,ts,interested,sample) VALUES (?,?,?,?,?,?,?,?,1)',
        args: [kind, category, suburb, title, detail, name, now - hrs * HOUR, interested],
      })),
      `INSERT INTO meta (key, value) VALUES ('seeded', '1')`,
    ],
    'write',
  )
}
