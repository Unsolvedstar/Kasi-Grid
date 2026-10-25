// Builds Kasi-Grid-deck.pptx (run from the submission folder: `node deck.cjs`), then export-deck.ps1 turns it into the PDF.
// Screenshots come from shots.mjs. Facts match content.mjs.
const fs = require('fs')
const pptxgen = require('pptxgenjs')
const REPO = 'https://github.com/Unsolvedstar/Kasi-Grid'
const LIVE_URL = 'https://kasi-grid.vercel.app'
const VIDEO_URL = 'https://drive.google.com/file/d/136fqIx7WRivrNcLZo90X4rfTMUO3MXxv/view?usp=drivesdk'

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'
pres.title = 'Kasi Grid'
pres.author = 'Amethyst & Azure'
const DK = '2B1F63', AM = '8A5FD6', AZ = '2A8BF2', AZL = '9CCBFF', LT = 'F4F0FD', INK = '241F38', MUT = '5A5475', RED = 'C0392B', GOLD = 'FFC933'
const H = 'Calibri', B = 'Calibri'
const shot = (n) => `shots/${n}.png`
const dims = (n) => { const b = fs.readFileSync(shot(n)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
const pic = (s, n, x, y, { h, w } = {}) => {
  const d = dims(n)
  const ph = h ?? (w * d.h) / d.w
  const pw = w ?? (h * d.w) / d.h
  s.addImage({ path: shot(n), x, y, w: pw, h: ph, shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 8, offset: 3, angle: 90 } })
  return pw
}
const T = (s, text, o) => s.addText(text, { fontFace: B, margin: 0, isTextBox: true, ...o })

function base(title, dark) {
  const s = pres.addSlide()
  s.background = { color: dark ? DK : 'FFFFFF' }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.09, fill: { color: AM }, line: { color: AM } })
  s.addShape(pres.ShapeType.rect, { x: 5, y: 0, w: 5, h: 0.09, fill: { color: AZ }, line: { color: AZ } })
  T(s, title, { x: 0.5, y: 0.3, w: 9, h: 0.7, fontFace: H, fontSize: 28, bold: true, color: dark ? 'FFFFFF' : DK })
  T(s, 'Kasi Grid  |  Amethyst & Azure', { x: 0.5, y: 5.3, w: 5, h: 0.2, fontSize: 9, color: dark ? 'B9AEE0' : MUT })
  T(s, REPO, { x: 4.5, y: 5.3, w: 5, h: 0.2, fontSize: 9, align: 'right', color: dark ? 'B9AEE0' : MUT })
  return s
}
const bullets = (s, items, o) => T(s, items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })), { fontSize: 15, color: INK, valign: 'top', ...o })
const card = (s, x, y, w, h, head, body, fill = LT, headColor = AM, bodyColor = INK) => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 })
  T(s, head, { x: x + 0.2, y: y + 0.14, w: w - 0.4, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: headColor })
  T(s, body, { x: x + 0.2, y: y + 0.55, w: w - 0.4, h: h - 0.7, fontSize: 12.5, color: bodyColor, valign: 'top' })
}
const stat = (s, x, y, w, big, label, color = RED) => {
  T(s, big, { x, y, w, h: 0.85, fontFace: H, fontSize: 42, bold: true, color })
  T(s, label, { x, y: y + 0.9, w, h: 1.0, fontSize: 13, color: INK, valign: 'top' })
}
const note = (s, text) => T(s, text, { x: 0.5, y: 5.0, w: 9, h: 0.28, fontSize: 9.5, color: MUT })

// 1 Title
let s = pres.addSlide(); s.background = { color: DK }
s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.12, fill: { color: AM }, line: { color: AM } })
s.addShape(pres.ShapeType.rect, { x: 5, y: 0, w: 5, h: 0.12, fill: { color: AZ }, line: { color: AZ } })
if (fs.existsSync('logo-mark.png')) s.addImage({ path: 'logo-mark.png', x: 0.6, y: 0.5, w: 1.7, h: 0.92 })
T(s, 'Kasi Grid', { x: 0.6, y: 1.5, w: 5.4, h: 0.9, fontFace: H, fontSize: 52, bold: true, color: 'FFFFFF' })
T(s, 'Know before it goes dark.', { x: 0.6, y: 2.4, w: 5.6, h: 0.5, fontFace: H, fontSize: 24, italic: true, color: AZL })
T(s, 'Neighbours verify power and water outages anywhere in South Africa, the app learns when and how long they last, and families that depend on power for health get help in time.', { x: 0.6, y: 3.0, w: 5.3, h: 1.2, fontSize: 15, color: 'E9E2FB', valign: 'top' })
T(s, `FNB App of the Year Hackathon 2026  |  Climate resilience and essential services\nTeam Amethyst & Azure: Tshedza Tshikovhi and Mulanga Munaka\nSource code: ${REPO}`, { x: 0.6, y: 4.4, w: 5.6, h: 0.8, fontSize: 11.5, color: 'C9BEEB', valign: 'top' })
pic(s, 'street', 6.7, 0.45, { h: 4.7 })

// 2 Problem
s = base('The grid is better. Kasi still goes dark.')
stat(s, 0.5, 1.15, 2.9, '500+ days', 'without loadshedding (Eskom, October 2026). There is no stage or schedule left to check.', AM)
stat(s, 3.6, 1.15, 2.9, 'Still dark', 'Townships lose power to load reduction, cable theft and substation faults, with no schedule and no warning.', AZ)
stat(s, 6.7, 1.15, 2.9, '22', 'major water outages in two weeks in Johannesburg, January 2026.', RED)
card(s, 0.5, 3.2, 9.0, 1.65, 'What a family sees', 'The power or water goes off on one street. Nobody says why or for how long, so a WhatsApp rumour decides whether the fridge stays shut. A spaza loses a day of stock. And a household on an oxygen concentrator cannot tell how long its battery will last against an outage.')
note(s, 'Sources: Eskom statements and SAnews (Oct 2026); Daily Maverick (Jan 2026); allAfrica (Aug 2026).')

// 3 Solution at a glance
s = base('Kasi Grid in one slide')
;[
  ['Live satellite street', 'Every home is a glowing dot. Drag through the next 48 hours and watch the street dim and relight.'],
  ['Verified by neighbours', '3 different devices must agree before an outage is verified. Anonymous. Anywhere in South Africa.'],
  ['Thinks ahead', 'Learns when outages cluster and how long they last. Says "expected back around 09:30".'],
  ['When minutes matter', 'Live battery countdown for medical devices, staged alerts, a one-tap ambulance call.'],
  ['Money and help', 'What an outage costs a shop, pooled restock orders, a board for neighbours to help each other.'],
  ['For everyone', 'Works for deaf and blind users, offline, in four languages, on a basic phone.'],
].forEach(([h, b], i) => card(s, 0.5 + (i % 3) * 3.05, 1.2 + Math.floor(i / 3) * 1.95, 2.9, 1.8, h, b, i % 2 ? 'EAF3FE' : LT, i % 2 ? AZ : AM))

// 4 The street, felt
s = base('The street, felt: scrub through the night', true)
pic(s, 'street', 0.5, 1.1, { h: 3.95 })
pic(s, 'street-later', 2.75, 1.1, { h: 3.95 })
pic(s, 'orb', 5.0, 1.1, { h: 3.95 })
bullets(s, ['Real satellite imagery; every mapped home is a dot. 40% outage risk darkens about 40% of them, so the odds are visible', 'Drag through 48 hours; tap the map to explore it full screen', 'Hear it, Tell me and a heartbeat buzz make it felt as well as seen', 'One orb for navigation'], { x: 7.3, y: 1.15, w: 2.4, h: 3.9, fontSize: 12, color: 'E9E2FB' })

// 5 Verified
s = base('Neighbours make it real: verified, local, on a map')
pic(s, 'today', 0.5, 1.1, { h: 3.95 })
pic(s, 'map', 3.0, 1.1, { w: 3.1 })
bullets(s, ['3 or more different devices report the same problem and it becomes a verified outage', 'The map shows every community: red verified, green back on, grey quiet', 'Neighbours vote "back on for me" and the alert closes itself', 'Anonymous by default: no account needed. One vote per device'], { x: 6.4, y: 1.2, w: 3.2, h: 3.7, fontSize: 14 })

// 6 Intelligence
s = base('It thinks ahead: when, and for how long', true)
pic(s, 'forecast', 0.5, 1.15, { w: 3.3 })
bullets(s, ['Learns each community\'s own pattern: the weekday and time of day outages cluster', 'Learns how long they last, from the "back on" votes, and shows "expected back around 09:30"', 'Warns a household with a medical device before its high-risk window', 'Transparent: shows its confidence and says when there is not enough data'], { x: 4.1, y: 1.2, w: 5.4, h: 2.7, fontSize: 15, color: 'FFFFFF' })
T(s, 'From our demo data: "Outages here are most likely Thursday evening. Past outages usually last about 5 hours." Rule-based on purpose: a small community does not have the data for a black box.', { x: 4.1, y: 3.95, w: 5.4, h: 1.1, fontSize: 12.5, italic: true, color: AZL, valign: 'top' })

// 7 Medical
s = base('When power is a medical need: a live battery plan')
pic(s, 'countdown', 0.5, 1.4, { w: 2.7 })
pic(s, 'booking', 3.4, 1.1, { w: 2.55 })
bullets(s, ['Enter the device (watts) and the battery (watt-hours, charge, age, type): the plan counts the honest hours, not the label', 'Tap when you switch to battery: a live countdown, corrected by readings from the battery display', 'Compared with how long outages usually last here. Too short? Book a backup in four short steps', 'Carers and equipment: fixed price, the 3 nearest are asked, a prescription check for oxygen'], { x: 6.0, y: 1.2, w: 3.6, h: 3.8, fontSize: 12.5 })

// 8 Minutes matter
s = base('When minutes matter: alerts and the ambulance', true)
pic(s, 'battery', 0.5, 1.1, { h: 3.95 })
pic(s, 'emergency', 2.75, 1.1, { h: 3.95 })
bullets(s, ['Alerts at 2 hours, 1 hour, 30 minutes and empty: sound, vibration, screen flash, spoken words and large text, whatever the person can perceive', 'Life-support devices get the ambulance prompt a stage earlier', 'Call ambulance 10177 or 112 in one tap', 'Cannot speak on the phone? The emergency card texts or WhatsApps your exact location to a contact, with nothing to say'], { x: 5.3, y: 1.15, w: 4.3, h: 3.9, fontSize: 13, color: 'FFFFFF' })

// 9 Anywhere + pins
s = base('Anywhere in South Africa, down to the exact spot')
pic(s, 'wizard', 0.5, 1.1, { h: 3.95 })
pic(s, 'alerts', 2.85, 1.1, { h: 3.95, w: undefined })
bullets(s, ['Every place is a community of about 2 km: find any town, suburb or street, or use your location', 'A precise GPS fix that settles on the best reading, shown on the map as "you are here"', 'Reports and posts take an optional exact pin. Board posts are shown only to about 100 m, so no home is given away', 'Long forms are short steps: one question at a time'], { x: 5.7, y: 1.2, w: 3.9, h: 3.8, fontSize: 13 })

// 10 Business
s = base('Outages cost money: see how much')
pic(s, 'business', 0.5, 1.1, { h: 3.95 })
bullets(s, ['During a verified outage the shop owner sees what it has cost so far: lost sales and stock at risk', 'Fridges hold cold about 4 hours shut; the app counts stock at risk after that', 'Ranked fixes by payback: inverter, cold box, water tank', 'Spazas order together for lower prices (pooled restock)', 'An opening for a bank: an outage savings pot, stock insurance or finance for backup power'], { x: 3.4, y: 1.2, w: 6.1, h: 3.7, fontSize: 15 })

// 11 Journey
s = base('One outage, one household: Gogo\'s family in Alexandra')
const steps = [['1', 'Set up once', 'Her grandson enters the concentrator (300 W) and battery (1000 Wh): about 2.4 hours.'], ['2', 'Power fails', 'Three neighbours report it. It is verified in minutes, and the street goes dark on the map.'], ['3', 'Knows what to do', '"Past outages here last about 5 hours. Your battery is shorter. Get a backup."'], ['4', 'Time runs low', 'The countdown alerts at 1 hour and 30 minutes, and the ambulance is one tap away.'], ['5', 'Help arrives', 'A neighbour with a generator, a runner with a cylinder, or the ambulance.']]
steps.forEach(([n, h, b], i) => {
  const x = 0.5 + i * 1.82
  s.addShape(pres.ShapeType.ellipse, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, fill: { color: i % 2 ? AZ : AM }, line: { color: i % 2 ? AZ : AM } })
  T(s, n, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontFace: H, fontSize: 20, bold: true, color: 'FFFFFF' })
  T(s, h, { x, y: 2.2, w: 1.7, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: DK })
  T(s, b, { x, y: 2.65, w: 1.7, h: 2.2, fontSize: 12.5, color: INK, valign: 'top' })
})

// 12 Accessibility
s = base('For everyone: deaf, blind, offline', true)
pic(s, 'access', 0.5, 1.1, { h: 3.95 })
bullets(s, ['Deaf or hard of hearing: every alert can flash the screen (slow, safe flashes), vibrate and show as large text', 'Blind or low vision: screen-reader announcements, spoken alerts, text up to 200%, high contrast, full-height panels', 'Reduce motion; a bright theme on every phone; touch targets sized for thumbs', 'English, isiZulu, Sesotho, Afrikaans (drafts, native review planned). Installable, works offline, posts queue and send later'], { x: 3.5, y: 1.2, w: 6.1, h: 3.8, fontSize: 14, color: 'FFFFFF' })

// 13 Architecture and security
s = base('How it is built, and kept safe')
const box = (x, y, w, h, t, sub, fill, tc = 'FFFFFF') => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.1 })
  T(s, [{ text: t, options: { bold: true, breakLine: true, fontSize: 14 } }, { text: sub, options: { fontSize: 11 } }], { x: x + 0.1, y, w: w - 0.2, h, align: 'center', valign: 'middle', color: tc })
}
box(0.5, 1.2, 2.4, 1.15, 'Installable web app', 'React + Vite, offline queue, service worker', AM)
box(3.8, 1.2, 2.4, 1.15, 'API', 'Node + Express as a serverless function, rate limits, validation', DK)
box(7.1, 1.2, 2.4, 1.15, 'Database', 'Hosted libSQL (Turso)', AM)
box(0.5, 2.55, 2.4, 0.95, 'Eskom + EskomSePush', 'Stage and official slots', LT, INK)
box(3.8, 2.55, 2.4, 0.95, 'OpenStreetMap + Esri', 'Homes, shops, clinics, satellite imagery', LT, INK)
box(7.1, 2.55, 2.4, 0.95, 'Open-Meteo + NAMC', 'Weather, food prices', LT, INK)
card(s, 0.5, 3.7, 4.4, 1.3, 'Privacy', 'No account needed; an optional one is hashed and deletable. Location is optional. Board posts only to about 100 m. The medical plan stays on the phone.')
card(s, 5.1, 3.7, 4.4, 1.3, 'Safety', '111 automated tests. Production dependency scan: 0 vulnerabilities. Parameterised SQL, input limits, rate limits, token-protected admin.', 'EAF3FE', AZ)

// 14 Business model
s = base('Who pays, and why', true)
bullets(s, ['Households pay nothing: reporting, alerts, forecasts and the medical plan stay free', 'Spaza Pro: advanced outage-cost reports, about R49 a month', 'Commission: 4% on pooled restock orders, 10% on care and equipment bookings', 'Partner listings for suppliers, carers and clinics: about R299 a month', 'A municipal dashboard or sponsor: about R3,000 a month'], { x: 0.5, y: 1.2, w: 5.9, h: 3.3, fontSize: 15, color: 'FFFFFF' })
;[['~R9,800', 'a month to run a 3,000-user pilot'], ['~R17,000', 'a month by month 6 (projection)'], ['R0', 'for residents, always']].forEach(([n, l], i) => {
  T(s, n, { x: 6.8, y: 1.15 + i * 1.3, w: 2.9, h: 0.75, fontFace: H, fontSize: 38, bold: true, color: i === 1 ? AZL : GOLD })
  T(s, l, { x: 6.8, y: 1.9 + i * 1.3, w: 2.9, h: 0.35, fontSize: 13, color: 'DDD4F6' })
})
T(s, 'Estimates and hypotheses to validate in the pilot, not measured results.', { x: 0.5, y: 4.85, w: 9, h: 0.3, fontSize: 11, italic: true, color: 'DDD4F6' })

// 15 What we built and tested
s = base('Built, tested, ready to pilot')
;[['111', 'automated tests passing'], ['0', 'known vulnerabilities in production dependencies'], ['4', 'languages, offline-capable'], ['0', 'accounts required to use it']].forEach(([n, l], i) => {
  const x = 0.5 + i * 2.3
  T(s, n, { x, y: 1.25, w: 2.1, h: 0.9, fontFace: H, fontSize: 40, bold: true, color: i % 2 ? AZ : AM })
  T(s, l, { x, y: 2.15, w: 2.1, h: 0.75, fontSize: 13, color: INK, valign: 'top' })
})
card(s, 0.5, 3.1, 4.4, 1.8, 'What is real today', 'A working app on a phone: verified outages, forecast, duration estimate, live medical battery plan, care booking, outage cost, accessibility. Live Eskom status, real tariffs, real maps and buildings. Checked in a browser.')
card(s, 5.1, 3.1, 4.4, 1.8, 'What is demo data, and said so', 'Outage history, carers, equipment prices and bookings are samples and labelled in the app. Next: a one-week pilot in one community, then real suppliers and payments.', 'EAF3FE', AZ)

// 16 Roadmap
s = base('Next six months')
card(s, 0.5, 1.2, 2.9, 3.5, 'Months 1-2: prove it', 'Run the pilot in one community. Native-speaker review of all four languages. Get real supplier prices. First conversation with a bank about an outage savings pot. An independent security check.')
card(s, 3.55, 1.2, 2.9, 3.5, 'Months 3-4: make it real', 'Payments through a provider. Carer vetting through a background-check partner. Equipment from licensed suppliers. POPIA review before handling health or booking data.', 'EAF3FE', AZ)
card(s, 6.6, 1.2, 2.9, 3.5, 'Months 5-6: scale it', 'More communities from the same code. A dashboard for municipalities and utilities. Pro plan for small businesses. A pilot with a bank or insurer.')

// 17 Team and links
s = base('Team Amethyst & Azure, and where to find the code', true)
card(s, 0.5, 1.2, 4.4, 2.0, 'Team', 'Tshedza Tshikovhi (22): software developer, leads a small team at Shudu Connections (Innovation Hub). Built CashCram, Top-13 in the NWU 2026 pitch competition.\nMulanga Munaka (22): biomedical engineering student at Wits, responsible for the medical side: the power plan, battery alerts and emergency features.', 'EAE7F7', DK)
card(s, 5.1, 1.2, 4.4, 2.0, 'Why us', 'A developer who ships and a biomedical engineer who knows how people depend on power for health. Built, tested and checked on a phone.', 'EAE7F7', DK)
card(s, 0.5, 3.4, 9.0, 1.5, 'Source code and demo', `Git repository: ${REPO}${LIVE_URL ? `\nLive app: ${LIVE_URL}` : ''}${VIDEO_URL ? `\nDemo video (90 s): ${VIDEO_URL}` : ''}\nTry: the street slider, Today, Deliver (300 W, 1000 Wh, "Switched to battery"), and the accessibility button.`, 'EAE7F7', DK)

pres.writeFile({ fileName: process.env.DECK_OUT || 'Kasi-Grid-deck.pptx' }).then(() => console.log('ok'))
