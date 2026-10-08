const pptxgen = require('pptxgenjs')
const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'
pres.title = 'Kasi Grid'
const DK = '0B3D3D', TEAL = '0B6E6E', AMB = 'F2A33A', LT = 'F4F6F5', INK = '16211F', MUT = '5D6B68'
const H = 'Cambria', B = 'Calibri'
const shot = (n) => `shots/${n}.png`

function base(title, dark) {
  const s = pres.addSlide()
  s.background = { color: dark ? DK : 'FFFFFF' }
  s.addText(title, { x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: H, fontSize: 34, bold: true, color: dark ? 'FFFFFF' : DK, margin: 0, isTextBox: true })
  return s
}
const bullets = (s, items, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
  { fontFace: B, fontSize: 16, color: INK, valign: 'top', margin: 0, isTextBox: true, ...o })
const phone = (s, n, x, y = 1.1, h = 4.3) => s.addImage({ path: shot(n), x, y, w: h * 420 / 860, h, shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 8, offset: 3, angle: 90 } })
const card = (s, x, y, w, h, head, body, fill = LT) => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 })
  s.addText(head, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, fontFace: H, fontSize: 18, bold: true, color: TEAL, margin: 0, isTextBox: true })
  s.addText(body, { x: x + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.75, fontFace: B, fontSize: 14, color: INK, valign: 'top', margin: 0, isTextBox: true })
}

// 1 Title
let s = pres.addSlide(); s.background = { color: DK }
s.addText('Kasi Grid', { x: 0.6, y: 1.3, w: 5.4, h: 1.0, fontFace: H, fontSize: 54, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
s.addText('Prepare. Save. Share.', { x: 0.6, y: 2.3, w: 5.4, h: 0.5, fontFace: H, fontSize: 24, italic: true, color: AMB, margin: 0, isTextBox: true })
s.addText('Community resilience for South African townships: loadshedding, water outages, food prices and neighbours helping neighbours.', { x: 0.6, y: 3.0, w: 5.2, h: 1.1, fontFace: B, fontSize: 16, color: 'CFE3E1', margin: 0, isTextBox: true })
s.addText('FNB App of the Year Hackathon 2026  |  Team: [TEAM NAME]', { x: 0.6, y: 4.8, w: 5.6, h: 0.3, fontFace: B, fontSize: 12, color: 'CFE3E1', margin: 0, isTextBox: true })
phone(s, 'today', 6.9, 0.55, 4.5)

// 2 Problem
s = base('When the grid fails, kasi carries the cost')
card(s, 0.5, 1.3, 2.9, 2.3, 'Information gap', 'Official schedules are generic. Residents learn about a burst pipe or dead transformer from a WhatsApp rumour.')
card(s, 3.55, 1.3, 2.9, 2.3, 'Money drain', 'Spaza owners lose stock to outages. Households pay more for the same food because prices are invisible.')
card(s, 6.6, 1.3, 2.9, 2.3, 'Trust gap', 'Nobody knows if a report is real. Help offered by neighbours never reaches those who need it.')
s.addText('Kasi Grid turns what neighbours see into verified, local, actionable information, in four languages, even offline.', { x: 0.5, y: 3.95, w: 9, h: 0.9, fontFace: H, fontSize: 20, italic: true, color: DK, margin: 0, isTextBox: true })

// 3 Features
s = base('One app for the whole outage day')
phone(s, 'alerts', 0.5, 1.1)
const feats = [['Live status', 'Eskom stage, official time slots by area, weather alerts with advice'], ['Neighbour reports', 'Power, water and road reports, confirmed by other residents'], ['Share board', 'Offers and requests: charging, borehole water, lifts, freezer space'], ['Nearby + food prices', 'Shops, clinics, food banks from OpenStreetMap, with community-reported staple prices'], ['Savings + business', 'Tariff calculators and a spaza outage-loss planner']]
feats.forEach(([h, b], i) => {
  s.addText([{ text: h, options: { bold: true, color: TEAL, breakLine: true } }, { text: b, options: { color: INK } }], { x: 3.3, y: 1.1 + i * 0.85, w: 6.2, h: 0.8, fontFace: B, fontSize: 14, margin: 0, valign: 'top', isTextBox: true })
})

// 4 New feature
s = base('New this weekend: Pulse and Forecast', true)
phone(s, 'today', 7.55, 0.5, 4.5)
bullets(s, ['Outage Pulse: 3+ different neighbours report the same problem and it becomes a Verified outage', 'Neighbours vote "back on" and the alert closes itself', 'Outage Forecast: learns each suburb's weekday and time-of-day pattern from its own reports', 'Early warning at 2 reports, one short of verified', 'Opt-in phone notifications'], { x: 0.5, y: 1.3, w: 3.9, h: 3.8, fontSize: 14, color: 'FFFFFF' })
s.addImage({ path: shot('forecast'), x: 4.7, y: 1.4, w: 2.6, h: 2.6 * 606 / 776 })
s.addText('Rule-based and transparent: it shows its confidence and says when there is not enough data.', { x: 4.7, y: 3.55, w: 2.6, h: 0.9, fontFace: B, fontSize: 12, italic: true, color: 'CFE3E1', valign: 'top', margin: 0, isTextBox: true })

// 5 Journey
s = base('User journey: Thandi in Alexandra')
const steps = [['1', 'Opens the app', 'Today tab shows power, water and confirmed problems for her suburb.'], ['2', 'Spots no water', 'Reports it in 10 seconds, even with no signal. It syncs later.'], ['3', 'Neighbours confirm', 'Three devices later it is a Verified outage and everyone is alerted.'], ['4', 'Finds help', "Board shows Bra Sipho's free borehole water two streets away."], ['5', 'Water returns', 'Neighbours tap "back on". The card turns green and closes.']]
steps.forEach(([n, h, b], i) => {
  const x = 0.5 + i * 1.82
  s.addShape(pres.ShapeType.ellipse, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, fill: { color: TEAL }, line: { color: TEAL } })
  s.addText(n, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontFace: H, fontSize: 20, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
  s.addText(h, { x, y: 2.2, w: 1.7, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: DK, margin: 0, isTextBox: true })
  s.addText(b, { x, y: 2.65, w: 1.7, h: 1.9, fontFace: B, fontSize: 14, color: INK, valign: 'top', margin: 0, isTextBox: true })
})

// 6 Screens
s = base('Built for a phone, a weak signal and four languages')
;['share', 'food', 'savings'].forEach((n, i) => phone(s, n, 0.7 + i * 2.2, 1.15, 4.0))
bullets(s, ['English, isiZulu, Sesotho, Afrikaans', 'Installable PWA, works offline', 'Posts queue on the phone and send when signal returns', 'Light and dark mode'], { x: 7.4, y: 1.3, w: 2.2, h: 3.5, fontSize: 14 })

// 7 Architecture
s = base('Technical architecture')
const box = (x, y, w, h, t, sub, fill, tc = 'FFFFFF') => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.1 })
  s.addText([{ text: t, options: { bold: true, breakLine: true, fontSize: 15 } }, { text: sub, options: { fontSize: 12 } }], { x: x + 0.1, y, w: w - 0.2, h, align: 'center', valign: 'middle', fontFace: B, color: tc, margin: 0, isTextBox: true })
}
box(0.5, 1.4, 2.4, 1.3, 'PWA client', 'React + Vite, service worker, offline queue', TEAL)
box(3.8, 1.4, 2.4, 1.3, 'API server', 'Node + Express, rate limits, validation', DK)
box(7.1, 1.4, 2.4, 1.3, 'Database', 'SQLite / libSQL (Turso-ready)', TEAL)
box(0.5, 3.4, 2.4, 1.2, 'Eskom + EskomSePush', 'Stage and official slots', LT, INK)
box(3.8, 3.4, 2.4, 1.2, 'OpenStreetMap', 'Shops, clinics, food banks', LT, INK)
box(7.1, 3.4, 2.4, 1.2, 'Open-Meteo + NAMC', 'Weather, food price reports', LT, INK)
s.addText('<>', { x: 2.9, y: 1.8, w: 0.9, h: 0.5, align: 'center', fontSize: 20, bold: true, color: DK, fontFace: B, margin: 0, isTextBox: true })
s.addText('<>', { x: 6.2, y: 1.8, w: 0.9, h: 0.5, align: 'center', fontSize: 20, bold: true, color: DK, fontFace: B, margin: 0, isTextBox: true })
s.addText('Server fetches and caches external sources (5 min to 24 h), so phones stay light.', { x: 0.5, y: 4.85, w: 9, h: 0.3, fontFace: B, fontSize: 13, color: MUT, margin: 0, isTextBox: true })

// 8 Security
s = base('Security and privacy by design')
card(s, 0.5, 1.3, 4.4, 1.6, 'Anonymous by default', 'No accounts, no phone numbers. A random device id limits one vote per device.')
card(s, 5.1, 1.3, 4.4, 1.6, 'Input safety', 'Length limits, no links, phone or ID numbers in posts. Parameterised SQL only.')
card(s, 0.5, 3.1, 4.4, 1.6, 'Abuse control', 'Per-IP rate limits. 3 flags from different devices auto-hide content.')
card(s, 5.1, 3.1, 4.4, 1.6, 'Admin and transport', 'Token-protected moderation, constant-time compare, no-store cache. Security headers set.')

// 9 Business
s = base('Who pays, and why they will', true)
bullets(s, ['Municipalities and utilities: verified, suburb-level outage data to dispatch faster than call centres', 'Spaza and small business: Pro plan with outage alerts and loss planner', 'Banks and insurers (e.g. FNB): township resilience and financial inclusion partnerships', 'Data ownership: all community data sits in our own database, exportable and anonymous', 'Pilot: [N] neighbours in [SUBURB], [N] reports, [N] verified outages'], { x: 0.5, y: 1.3, w: 5.4, h: 3.6, color: 'FFFFFF' })
;[['3+', 'devices verify an outage'], ['4', 'languages'], ['R0', 'for residents, always']].forEach(([n, l], i) => {
  s.addText(n, { x: 6.5, y: 1.2 + i * 1.3, w: 3, h: 0.75, fontFace: H, fontSize: 44, bold: true, color: AMB, margin: 0, isTextBox: true })
  s.addText(l, { x: 6.5, y: 1.95 + i * 1.3, w: 3, h: 0.3, fontFace: B, fontSize: 14, color: 'CFE3E1', margin: 0, isTextBox: true })
})

// 10 Demo
s = base('Judges: try it in 2 minutes')
card(s, 0.5, 1.3, 4.4, 3.4, 'Access', 'Live app: [DEPLOYED URL]\nNo login needed, it is anonymous. Open on a phone and choose "Add to home screen".\nModeration page: [URL]/admin\nAdmin token: [DEMO ADMIN TOKEN]')
card(s, 5.1, 1.3, 4.4, 3.4, 'Suggested path', '1. Today tab: Alexandra has a Verified outage.\n2. Tap "It is back on for me".\n3. Alerts: file a report.\n4. Share: post an offer.\n5. Nearby: add a food price.\n\nDemo video (90 s): [VIDEO LINK]')
pres.writeFile({ fileName: 'Kasi-Grid-deck.pptx' }).then(() => console.log('ok'))
