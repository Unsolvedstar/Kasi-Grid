import { mkdirSync } from 'node:fs'

// Local SQLite file by default. Set DATABASE_URL (and DATABASE_AUTH_TOKEN) to use a hosted libSQL/Turso database.
// On Vercel there is no persistent disk: a hosted database is required for real use. Without one the app still starts on a
// throwaway file in /tmp, which is wiped whenever the function restarts (fine for a quick look, not for real data).
const onVercel = !!process.env.VERCEL
// Vercel's Turso integration names its settings TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, so those work too.
const hosted = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL
const url = hosted || (onVercel ? 'file:/tmp/kasi.db' : 'file:data/kasi.db')
if (!hosted && !onVercel) mkdirSync('data', { recursive: true })
// A remote database needs only the small web client, so no native SQLite binary has to ship to the serverless function.
const remote = /^(libsql|https?|wss?):/.test(url)
const { createClient } = await import(remote ? '@libsql/client/web' : '@libsql/client')
export const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN })

const HOUR = 3600 * 1000

export async function migrate() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT, suburb TEXT NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL,
        ts INTEGER NOT NULL, confirms INTEGER NOT NULL DEFAULT 1, owner TEXT, sample INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS report_confirms (report_id INTEGER, device TEXT, PRIMARY KEY (report_id, device))`,
      `CREATE TABLE IF NOT EXISTS report_restored (report_id INTEGER, device TEXT, ts INTEGER NOT NULL, PRIMARY KEY (report_id, device))`,
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
      `CREATE TABLE IF NOT EXISTS care_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, device TEXT NOT NULL, suburb TEXT NOT NULL, service TEXT NOT NULL, hours INTEGER NOT NULL DEFAULT 0,
        start_ts INTEGER NOT NULL, patient TEXT NOT NULL, needs TEXT NOT NULL DEFAULT '', landmark TEXT NOT NULL DEFAULT '', equipment TEXT NOT NULL DEFAULT '[]',
        total INTEGER NOT NULL DEFAULT 0, quoted TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL, offered TEXT NOT NULL DEFAULT '[]',
        declined TEXT NOT NULL DEFAULT '[]', carer TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS restock_lines (
        cycle TEXT NOT NULL, suburb TEXT NOT NULL, device TEXT NOT NULL, shop TEXT NOT NULL, item TEXT NOT NULL, qty INTEGER NOT NULL,
        ts INTEGER NOT NULL, PRIMARY KEY (cycle, suburb, device, item))`,
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, handle TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', pw TEXT NOT NULL, prefs TEXT NOT NULL DEFAULT '{}', created INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user)`,
      `CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, ts INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
      `CREATE TABLE IF NOT EXISTS suburb_areas (suburb TEXT PRIMARY KEY, area_id TEXT NOT NULL, area_name TEXT, updated INTEGER)`,
      `CREATE TABLE IF NOT EXISTS namc_snapshots (issue INTEGER PRIMARY KEY, period TEXT NOT NULL, data TEXT NOT NULL, pdf_url TEXT, fetched_at INTEGER NOT NULL)`,
    ],
    'write',
  )
  // Older databases predate delivery bookings: add the columns if they are missing.
  for (const col of ["pickup TEXT NOT NULL DEFAULT ''", 'urgent INTEGER NOT NULL DEFAULT 0', 'fee INTEGER NOT NULL DEFAULT 0', 'user INTEGER']) {
    try {
      await db.execute(`ALTER TABLE care_bookings ADD COLUMN ${col}`)
    } catch {
      /* column already exists */
    }
  }
  // Community actions are named: who wrote a report, who confirmed it, who is interested in a post.
  for (const [table, col] of [['reports', 'author TEXT'], ['report_confirms', 'name TEXT'], ['share_interest', 'name TEXT']]) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col}`)
    } catch {
      /* column already exists */
    }
  }
  // Reports and posts can carry an exact pin (and the GPS accuracy in metres).
  for (const table of ['reports', 'shares']) {
    for (const col of ['lat REAL', 'lng REAL', 'acc INTEGER']) {
      try {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col}`)
      } catch {
        /* column already exists */
      }
    }
  }
  const seeded = await db.execute(`SELECT value FROM meta WHERE key = 'seeded'`)
  if (seeded.rows.length) return
  const now = Date.now()
  const reports = [
    ['alex', 'power', 'Transformer humming loudly on 4th Ave, lights flickering.', 2, 4],
    ['diepsloot', 'water', 'Water gushing from a burst pipe near the clinic.', 5, 7],
    ['soweto', 'road', 'Taxi rank flooded, minibuses using the back road.', 1, 1],
    ['katlehong', 'power', 'No power since last night, only our street. Not loadshedding.', 9, 2],
  ]
  const shares = [
    ['offer', 'power', 'soweto', 'Phone & power bank charging', 'I have a solar setup. Free charging from 08:00 to 20:00, bring your own cable.', 'Thandi', 6, 3],
    ['offer', 'water', 'diepsloot', 'Borehole water, 25L free per household', 'Bring your own containers.', 'Bra Sipho', 4, 9],
    ['request', 'food', 'alex', 'Need freezer space for a few hours', 'Stock from my tuck shop will thaw during the outage tonight.', 'Mama Lindi', 3, 1],
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
