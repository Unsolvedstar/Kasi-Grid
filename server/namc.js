import { db } from './db.js'
import { NAMC, staplesFrom } from '../shared/namc.js'

// Keeps the national food price reference up to date.
// Once a day it reads the NAMC listing page, finds the newest "Food Basket Price Monthly" PDF, extracts
// Table 2 and, only if every safety check passes, stores it as the new snapshot. Otherwise the previous
// snapshot (or the one bundled in shared/namc.js) stays in use and the reason is recorded for the admin page.

const LISTING = 'https://www.namc.co.za/output/food-basket-price-monthly/'
const PDF_PREFIX = 'https://www.namc.co.za/wp-content/uploads/'
const UA = 'KasiGrid/0.2 (community resilience app)'
const DAY = 24 * 3600 * 1000
const MAX_PDF_BYTES = 6 * 1024 * 1024

// One pattern per basket item, including its pack size. If NAMC changes an item or a pack size, the pattern
// stops matching and the import is rejected instead of silently mixing units.
const ROWS = {
  'baked-beans': /baked beans.*410\s?g/i,
  'dried-beans': /beans\s*-\s*dried.*500\s?g|dried beans.*500\s?g/i,
  'peanut-butter': /peanut butter.*400\s?g/i,
  tea: /(ceylon|black tea).*250\s?g/i,
  coffee: /instant coffee.*250\s?g/i,
  cheese: /cheddar.*kg/i,
  eggs: /\beggs\b.*1\.5\s?dozen/i,
  milk: /full cream milk.*1\s?[ℓlL]/i,
  margarine: /margarine.*500\s?g/i,
  oil: /sunflower oil.*750\s?m[ℓlL]/i,
  apples: /apples.*kg/i,
  bananas: /bananas.*kg/i,
  oranges: /oranges.*kg/i,
  mince: /beef mince.*kg/i,
  offal: /beef offal.*kg/i,
  giblets: /chicken giblets.*kg/i,
  fish: /fish.*400\s?g/i,
  chicken: /(iqf|chicken portions).*2\s?kg/i,
  polony: /polony.*1\s?kg/i,
  bread: /brown bread.*700\s?g/i,
  whitebread: /white bread.*700\s?g/i,
  rice: /\brice\b.*2\s?kg/i,
  maize: /maize meal.*5\s?kg/i,
  cabbage: /cabbage.*each/i,
  onions: /onions.*kg/i,
  potatoes: /potatoes.*kg/i,
  tomatoes: /tomatoes.*kg/i,
  sugar: /white sugar.*2\.5\s?kg/i,
}

const NUM = /^-?\d+(\.\d+)?$/
const num = (x) => Number(String(x).replace(/[\s%]/g, ''))

// Pure: turn the PDF's extracted text into a snapshot, or throw with the reason it was rejected.
export function parseNamcText(text, prev = NAMC) {
  const start = text.search(/Table 2\s*:/)
  if (start < 0) throw new Error('Table 2 not found')
  const totalAt = text.slice(start).search(/Total Rand Value/)
  if (totalAt < 0) throw new Error('Table 2 total row not found')
  const table = text.slice(start, start + totalAt)
  const totalLine = text.slice(start + totalAt, start + totalAt + 200).match(
    /Total Rand Value\s+(\d{1,3}(?: \d{3})*\.\d+)\s+(\d{1,3}(?: \d{3})*\.\d+)\s+(\d{1,3}(?: \d{3})*\.\d+)\s+(-?[\d.]+)\s*%\s+(-?[\d.]+)\s*%/,
  )
  if (!totalLine) throw new Error('Could not read the total row')

  const found = {}
  for (const raw of table.split('\n')) {
    const tokens = raw.trim().split(/\s+/)
    const tail = tokens.slice(-5)
    if (tokens.length < 6 || !tail.every((t) => NUM.test(t))) continue
    const name = tokens.slice(0, -5).join(' ')
    const hits = Object.entries(ROWS).filter(([, re]) => re.test(name))
    if (hits.length !== 1) throw new Error(`Unrecognised or ambiguous item: "${name}"`)
    const [id] = hits[0]
    if (found[id]) throw new Error(`Duplicate item: ${id}`)
    const [, , price, yoy, mom] = tail.map(Number)
    found[id] = { price, yoy, mom }
  }
  const ids = Object.keys(ROWS)
  const missing = ids.filter((id) => !found[id])
  if (missing.length) throw new Error('Missing items: ' + missing.join(', '))

  const items = prev.items.map((base) => ({ ...base, ...found[base.id] }))
  const total = num(totalLine[3])
  const sum = items.reduce((a, i) => a + i.price, 0)
  if (Math.abs(sum - total) > 0.15) throw new Error(`Items sum to ${sum.toFixed(2)} but the report total is ${total}`)
  // Guard against a mis-read column: no price may jump more than 40% from the previous snapshot.
  for (const it of items) {
    const before = prev.items.find((b) => b.id === it.id).price
    if (Math.abs(it.price / before - 1) > 0.4) throw new Error(`${it.id} moved ${before} -> ${it.price}, refusing to import`)
  }
  const issueNo = Number((text.match(/Issue\s+(\d{2,4})/) || [])[1])
  const period = (text.match(/During\s+([A-Z][a-z]+\s+\d{4})/) || [])[1]
  if (!issueNo || !period) throw new Error('Could not read the issue number or period')
  return {
    period,
    issue: `NAMC Food Basket Price Monthly, Issue ${issueNo}`,
    issueNo,
    url: prev.url,
    basketTotal: total,
    basketYoy: num(totalLine[4]),
    basketMom: num(totalLine[5]),
    items,
  }
}

export async function pdfText(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, verbosity: 0 }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    out += tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n'
  }
  return out
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

// Newest first: by upload folder (year/month), then by the month named in the file.
export function candidateLinks(html) {
  const links = [...new Set([...html.matchAll(/https?:\/\/[^"'\s<>]*Food-Basket-Price-Monthly[^"'\s<>]*\.pdf/gi)].map((m) => m[0].replace(/^http:/, 'https:')))]
  const key = (u) => {
    const [, y, m] = u.match(/uploads\/(\d{4})\/(\d{2})\//) || []
    const name = (u.match(/Report-([A-Za-z]+)-(\d{4})/) || []).slice(1)
    const mi = name[0] ? MONTHS.indexOf(name[0].toLowerCase()) : -1
    return `${y || '0000'}${m || '00'}${name[1] || '0000'}${String(mi + 1).padStart(2, '0')}`
  }
  return links.filter((u) => u.startsWith(PDF_PREFIX)).sort((a, b) => key(b).localeCompare(key(a)))
}

const setMeta = (key, value) => db.execute({ sql: 'INSERT OR REPLACE INTO meta (key, value) VALUES (?,?)', args: [key, JSON.stringify(value)] })

export async function latestSnapshot() {
  const r = await db.execute('SELECT data, pdf_url, fetched_at FROM namc_snapshots ORDER BY issue DESC LIMIT 1')
  if (!r.rows.length) return { snapshot: NAMC, source: 'bundled', fetchedAt: null, pdfUrl: null }
  return { snapshot: JSON.parse(r.rows[0].data), source: 'live', fetchedAt: Number(r.rows[0].fetched_at), pdfUrl: r.rows[0].pdf_url }
}

export async function foodReference() {
  const { snapshot, source, fetchedAt, pdfUrl } = await latestSnapshot()
  return { snapshot, staples: staplesFrom(snapshot.items), source, fetchedAt, pdfUrl }
}

export async function namcStatus() {
  const r = await db.execute(`SELECT value FROM meta WHERE key = 'namc_check'`)
  const last = r.rows.length ? JSON.parse(r.rows[0].value) : null
  const cur = await latestSnapshot()
  return { current: { period: cur.snapshot.period, issueNo: cur.snapshot.issueNo ?? 129, source: cur.source }, lastCheck: last }
}

// Checks NAMC for a newer report. Never throws: the outcome is recorded and returned.
export async function refreshNamc() {
  const started = Date.now()
  const done = async (ok, message, extra = {}) => {
    const result = { ok, message, at: started, ...extra }
    await setMeta('namc_check', result)
    return result
  }
  try {
    const page = await fetch(LISTING, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
    if (!page.ok) return done(false, `NAMC listing returned ${page.status}`)
    const links = candidateLinks(await page.text()).slice(0, 3)
    if (!links.length) return done(false, 'No report links found on the NAMC page')
    const { snapshot: current } = await latestSnapshot()
    let lastErr = ''
    for (const url of links) {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40000) })
      if (!res.ok) {
        lastErr = `PDF returned ${res.status}`
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_PDF_BYTES) {
        lastErr = 'PDF is unexpectedly large'
        continue
      }
      let snap
      try {
        snap = parseNamcText(await pdfText(buf), current)
      } catch (e) {
        lastErr = `${url.split('/').pop()}: ${e.message}`
        continue
      }
      if ((current.issueNo ?? 0) >= snap.issueNo) return done(true, `Already up to date (issue ${current.issueNo}, ${current.period})`)
      await db.execute({
        sql: 'INSERT OR REPLACE INTO namc_snapshots (issue, period, data, pdf_url, fetched_at) VALUES (?,?,?,?,?)',
        args: [snap.issueNo, snap.period, JSON.stringify(snap), url, Date.now()],
      })
      return done(true, `Imported issue ${snap.issueNo} (${snap.period}), basket R${snap.basketTotal}`, { imported: snap.issueNo })
    }
    return done(false, `Could not import a newer report. ${lastErr}`)
  } catch (e) {
    return done(false, `Check failed: ${e.message}`)
  }
}

export function startNamcSchedule() {
  if (process.env.NAMC_AUTO === 'off') return
  // First check shortly after start-up so a fresh deploy does not wait a day, then daily.
  setTimeout(() => refreshNamc().then((r) => console.log('NAMC check:', r.message)), 15000).unref()
  setInterval(() => refreshNamc(), DAY).unref()
}
