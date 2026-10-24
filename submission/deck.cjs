const fs = require('fs')
const pptxgen = require('pptxgenjs')
const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'
pres.title = 'Kasi Grid'
const DK = '2E2457', TEAL = '6A57B8', AMB = '9FD3F0', LT = 'F4F1FC', INK = '241F38', MUT = '5F5978', RED = 'C0392B'
const H = 'Cambria', B = 'Calibri'
const shot = (n) => `shots/${n}.png`
// PNG width and height from the file header, so every screenshot keeps its own proportions.
const dims = (n) => { const b = fs.readFileSync(shot(n)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
const pic = (s, n, x, y, { h, w } = {}) => {
  const d = dims(n)
  const ph = h ?? (w * d.h) / d.w
  const pw = w ?? (h * d.w) / d.h
  s.addImage({ path: shot(n), x, y, w: pw, h: ph, shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 8, offset: 3, angle: 90 } })
}

function base(title, dark) {
  const s = pres.addSlide()
  s.background = { color: dark ? DK : 'FFFFFF' }
  s.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.7, fontFace: H, fontSize: 30, bold: true, color: dark ? 'FFFFFF' : DK, margin: 0, isTextBox: true })
  return s
}
const bullets = (s, items, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
  { fontFace: B, fontSize: 16, color: INK, valign: 'top', margin: 0, isTextBox: true, ...o })
const card = (s, x, y, w, h, head, body, fill = LT, headColor = TEAL) => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12 })
  s.addText(head, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, fontFace: H, fontSize: 18, bold: true, color: headColor, margin: 0, isTextBox: true })
  s.addText(body, { x: x + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.75, fontFace: B, fontSize: 14, color: INK, valign: 'top', margin: 0, isTextBox: true })
}
const stat = (s, x, y, w, big, label, color = RED) => {
  s.addText(big, { x, y, w, h: 0.9, fontFace: H, fontSize: 46, bold: true, color, margin: 0, isTextBox: true })
  s.addText(label, { x, y: y + 0.95, w, h: 0.9, fontFace: B, fontSize: 14, color: INK, valign: 'top', margin: 0, isTextBox: true })
}
const note = (s, text) => s.addText(text, { x: 0.5, y: 5.1, w: 9, h: 0.3, fontFace: B, fontSize: 10, color: MUT, margin: 0, isTextBox: true })

// 1 Title
let s = pres.addSlide(); s.background = { color: DK }
s.addText('Kasi Grid', { x: 0.6, y: 1.0, w: 5.4, h: 1.0, fontFace: H, fontSize: 54, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
s.addText('Loadshedding ended. The outages did not.', { x: 0.6, y: 2.05, w: 5.6, h: 0.9, fontFace: H, fontSize: 24, italic: true, color: AMB, margin: 0, isTextBox: true })
s.addText('Neighbours verify power and water outages, the app learns when and how long they last, and families that depend on power get help.', { x: 0.6, y: 3.1, w: 5.4, h: 1.2, fontFace: B, fontSize: 16, color: 'DDD4F6', margin: 0, isTextBox: true })
s.addText('FNB App of the Year Hackathon 2026  |  Climate resilience and essential services\nTshedza Tshikovhi and Mulanga Munaka  |  Team: [TEAM NAME]', { x: 0.6, y: 4.6, w: 5.8, h: 0.6, fontFace: B, fontSize: 12, color: 'DDD4F6', margin: 0, isTextBox: true })
pic(s, 'today', 6.9, 0.45, { h: 4.6 })

// 2 Problem
s = base('The grid is better. Kasi still goes dark.')
stat(s, 0.5, 1.2, 2.9, '504 days', 'without loadshedding (Eskom, 2 Oct 2026). There is no stage or schedule left to check.', TEAL)
stat(s, 3.6, 1.2, 2.9, '202,590', 'Eskom customers still on local load reduction: illegal connections, overloaded transformers. Cable theft and faults add more.')
stat(s, 6.7, 1.2, 2.9, '22', 'major water outages in two weeks in Johannesburg, January 2026. 50,536 pipe leaks in a year.')
card(s, 0.5, 3.35, 9.0, 1.45, 'What a family sees', 'The power or water goes off on one street. Nobody says why or for how long. A WhatsApp rumour decides whether the fridge stays shut, the oxygen concentrator switches to battery, or the spaza closes. Some households cannot wait to find out.', LT)
note(s, 'Sources: Eskom statements and SAnews (Oct 2026); parliamentary reply on load reduction (PMG); Daily Maverick (Jan 2026); allAfrica (Aug 2026).')

// 2b The street, felt
s = base('The street, felt: an outage you can see, hear and scrub through', true)
pic(s, 'street', 0.5, 1.1, { h: 3.9 })
pic(s, 'street-later', 2.75, 1.1, { h: 3.9 })
pic(s, 'orb', 5.0, 1.1, { h: 3.9 })
bullets(s, ['Every home is a dot. 40% outage risk darkens about 40% of them, so the odds are visible', 'Drag through the next 48 hours and watch the street dim and relight', 'Hear it and Tell me: a chord that goes out of tune, a spoken summary and a heartbeat vibration, for people who cannot read the screen', 'The whole app takes the mood of the street: calm, amber, red'], { x: 7.3, y: 1.15, w: 2.4, h: 3.9, fontSize: 11, color: 'FFFFFF' })

// 3 Verify
s = base('Neighbours make it real: verified, local, on a map')
pic(s, 'today', 0.5, 1.1, { h: 4.1 })
pic(s, 'map', 2.85, 1.1, { w: 3.0 })
bullets(s, ['3 or more different devices report the same problem and it becomes a Verified outage', 'The map shows every suburb in the city: red verified, green back on, grey quiet', 'Neighbours vote "back on for me" and the alert closes itself', 'Anonymous: no accounts, no phone numbers. One vote per device'], { x: 6.1, y: 1.2, w: 3.5, h: 3.6, fontSize: 14 })

// 4 Intelligence
s = base('It thinks ahead: when, and for how long', true)
pic(s, 'forecast', 0.5, 1.15, { w: 3.2 })
bullets(s, ['Learns each suburb\'s own pattern: the weekday and time of day outages cluster', 'Learns how long they last, from the "back on" votes, and shows "expected back around 16:30"', 'Warns a household with a medical device before its high-risk window', 'Transparent: shows its confidence and says when there is not enough data'].map((x) => x), { x: 4.0, y: 1.2, w: 5.5, h: 2.6, fontSize: 15, color: 'FFFFFF' })
s.addText('Example from our demo data: "Outages here are most likely Thursday evening. Past outages usually last about 5 hours." Rule-based by design: a small township does not have the data for a black box.', { x: 4.0, y: 3.9, w: 5.5, h: 1.2, fontFace: B, fontSize: 13, italic: true, color: AMB, valign: 'top', margin: 0, isTextBox: true })

// 5 Care + biomed
s = base('When power is a medical need: the care plan')
pic(s, 'care', 0.5, 1.1, { h: 4.1 })
pic(s, 'booking', 2.85, 1.1, { w: 3.0 })
bullets(s, ['Medical power plan: device watts and battery watt-hours give the hours it runs, set against the live outage and the typical duration here', 'Battery too short? One tap books a battery backup', 'Book a carer or equipment the SweepSouth way: fixed price, the 3 nearest carers are asked, the first to accept takes it', 'Oxygen needs a prescription approved first'], { x: 6.1, y: 1.2, w: 3.5, h: 3.7, fontSize: 13 })

// 6 Business
s = base('Outages cost money: show how much, and how to stop it')
pic(s, 'business', 0.5, 1.1, { h: 4.1 })
bullets(s, ['During a verified outage the shop owner sees: "About R___ lost so far", with lost sales and stock at risk', 'Fridges hold cold about 4 hours shut; the app counts stock at risk after that', 'Ranked fixes by payback: inverter, cold box, water tank', 'Opportunity for a bank: an outage savings pot, stock insurance or backup-power finance. Not built, a partnership to explore'], { x: 3.2, y: 1.2, w: 6.3, h: 3.7, fontSize: 15 })

// 7 Journey
s = base('One outage, one household: Gogo\'s family in Alexandra')
const steps = [['1', 'Set up once', 'Her grandson enters the concentrator (300 W) and battery (1000 Wh): 2.8 hours.'], ['2', 'Power fails', 'Three neighbours report it. It is verified in minutes, on the map.'], ['3', 'Knows what to do', '"Past outages here last about 5 hours. Your battery is shorter. Get a backup."'], ['4', 'Gets help', 'Books a battery backup. The nearest carers are asked.'], ['5', 'It is back', 'Neighbours vote it back on. The outage and its length feed the forecast.']]
steps.forEach(([n, h, b], i) => {
  const x = 0.5 + i * 1.82
  s.addShape(pres.ShapeType.ellipse, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, fill: { color: TEAL }, line: { color: TEAL } })
  s.addText(n, { x: x + 0.05, y: 1.4, w: 0.6, h: 0.6, align: 'center', valign: 'middle', fontFace: H, fontSize: 20, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true })
  s.addText(h, { x, y: 2.2, w: 1.7, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: DK, margin: 0, isTextBox: true })
  s.addText(b, { x, y: 2.65, w: 1.7, h: 2.2, fontFace: B, fontSize: 13, color: INK, valign: 'top', margin: 0, isTextBox: true })
})

// 8 Usability
s = base('Built for a phone, a weak signal and four languages')
pic(s, 'alerts', 0.6, 1.1, { h: 4.0 })
pic(s, 'share', 3.0, 1.1, { h: 4.0 })
bullets(s, ['One orb for navigation: tap it and the sections bloom in an arc', 'English, isiZulu, Sesotho, Afrikaans (drafts, native review planned)', 'Installable, works offline. Posts queue and send when signal returns', 'Skip link, keyboard navigation, labelled controls, light and dark', 'First load is about 86 kB of JavaScript (gzipped); other tabs load when opened'], { x: 5.6, y: 1.3, w: 3.9, h: 3.6, fontSize: 14 })

// 9 Architecture and security
s = base('How it is built, and kept safe')
const box = (x, y, w, h, t, sub, fill, tc = 'FFFFFF') => {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.1 })
  s.addText([{ text: t, options: { bold: true, breakLine: true, fontSize: 15 } }, { text: sub, options: { fontSize: 12 } }], { x: x + 0.1, y, w: w - 0.2, h, align: 'center', valign: 'middle', fontFace: B, color: tc, margin: 0, isTextBox: true })
}
box(0.5, 1.2, 2.4, 1.2, 'PWA client', 'React + Vite, service worker, offline queue', TEAL)
box(3.8, 1.2, 2.4, 1.2, 'API server', 'Node + Express, rate limits, validation', DK)
box(7.1, 1.2, 2.4, 1.2, 'Database', 'SQLite / libSQL (Turso-ready)', TEAL)
box(0.5, 2.7, 2.4, 1.0, 'Eskom + EskomSePush', 'Stage and official slots', LT, INK)
box(3.8, 2.7, 2.4, 1.0, 'OpenStreetMap', 'Shops, clinics, food banks', LT, INK)
box(7.1, 2.7, 2.4, 1.0, 'Open-Meteo + NAMC', 'Weather, food prices', LT, INK)
card(s, 0.5, 3.95, 4.4, 1.15, 'Privacy', 'Anonymous device id. No accounts. Medical plan and household data stay on the phone.')
card(s, 5.1, 3.95, 4.4, 1.15, 'Safety', 'Input limits, no links or phone numbers, rate limits, 3 flags auto-hide, token-protected admin.')

// 10 Business model
s = base('Who pays, and why', true)
bullets(s, ['Carer jobs: a commission on each booking (rate to be agreed with partners)', 'Equipment partners: delivery and rental fees from licensed suppliers', 'Small business Pro: outage alerts and the loss planner (about R29 a month, to test)', 'Banks and insurers: sponsored resilience content, outage savings and cover', 'Municipalities and utilities: verified suburb-level outage data and a dashboard'], { x: 0.5, y: 1.2, w: 5.8, h: 3.6, fontSize: 15, color: 'FFFFFF' })
;[['R0', 'for residents, always'], ['3+', 'devices verify an outage'], ['4', 'languages']].forEach(([n, l], i) => {
  s.addText(n, { x: 6.8, y: 1.2 + i * 1.3, w: 2.8, h: 0.75, fontFace: H, fontSize: 44, bold: true, color: AMB, margin: 0, isTextBox: true })
  s.addText(l, { x: 6.8, y: 1.95 + i * 1.3, w: 2.8, h: 0.3, fontFace: B, fontSize: 14, color: 'DDD4F6', margin: 0, isTextBox: true })
})
s.addText('These are hypotheses to validate in the pilot, not measured results.', { x: 0.5, y: 4.9, w: 9, h: 0.3, fontFace: B, fontSize: 11, italic: true, color: 'DDD4F6', margin: 0, isTextBox: true })

// 11 What we tested
s = base('Built, tested, ready to pilot')
;[['99', 'automated tests passing'], ['4', 'languages, offline-capable'], ['0', 'accounts or phone numbers collected'], ['1 week', 'pilot plan ready']].forEach(([n, l], i) => {
  const x = 0.5 + i * 2.3
  s.addText(n, { x, y: 1.3, w: 2.1, h: 0.9, fontFace: H, fontSize: 40, bold: true, color: TEAL, margin: 0, isTextBox: true })
  s.addText(l, { x, y: 2.2, w: 2.1, h: 0.7, fontFace: B, fontSize: 14, color: INK, valign: 'top', margin: 0, isTextBox: true })
})
card(s, 0.5, 3.2, 4.4, 1.7, 'What is real today', 'A working app on a phone: verified outages, forecast, duration estimate, medical power plan, care booking, outage cost. Live Eskom status and real tariffs. Checked in a browser.')
card(s, 5.1, 3.2, 4.4, 1.7, 'What is demo data, and said so', 'Outage history, carers, equipment prices and bookings are samples and labelled. Next: a one-week pilot in one suburb, then real suppliers and payments.')

// 12 Roadmap
s = base('Next six months')
card(s, 0.5, 1.2, 2.9, 3.5, 'Months 1-2: prove it', 'Run the pilot in one suburb. Native-speaker review of all four languages. Get real supplier prices for equipment. First conversation with a bank about an outage savings pot.')
card(s, 3.55, 1.2, 2.9, 3.5, 'Months 3-4: make it real', 'Payments through a provider. Carer vetting through a background-check partner. Equipment from licensed suppliers. POPIA review before handling health or booking data.')
card(s, 6.6, 1.2, 2.9, 3.5, 'Months 5-6: scale it', 'More suburbs from the same code. A dashboard for municipalities and utilities. Pro plan for small businesses. A pilot with a bank or insurer.')

// 13 Team, roadmap, try it
s = base('Team and try it', true)
card(s, 0.5, 1.2, 4.4, 1.9, 'Team', 'Tshedza Tshikovhi (22): software developer, leads a small team at Shudu Connections (Innovation Hub). Built CashCram, Top-13 NWU 2026 pitch competition.\nMulanga Munaka (22): biomedical engineering student, Wits. [Her part in the project]', 'EAE7F7', DK)
card(s, 5.1, 1.2, 4.4, 1.9, 'Why us', 'A developer who ships and a biomedical engineer who knows how people depend on power for health. Built, tested and checked on a phone in a week.', 'EAE7F7', DK)
card(s, 0.5, 3.3, 9.0, 1.6, 'Try it in 2 minutes', 'Live app: [DEPLOYED URL]  |  Demo video (90 s): [VIDEO LINK]\nToday: a verified outage and the map. Care: enter 300 W and 1000 Wh. Book a carer. Moderation: [URL]/admin, token [DEMO ADMIN TOKEN]', 'EAE7F7', DK)

pres.writeFile({ fileName: 'Kasi-Grid-deck.pptx' }).then(() => console.log('ok'))
