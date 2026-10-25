// Regenerates the deck screenshots from a running app that has demo data.
//   DATABASE_URL=file:data/shots.db PORT=3111 node server/index.js      (in another terminal, after `npm run build`)
//   DATABASE_URL=file:data/shots.db node scripts/demo-history.mjs alex && node scripts/demo-seed.mjs http://localhost:3111 alex
//   node submission/shots.mjs [baseUrl]
// Needs the internet for the satellite tiles.
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:3111'
const out = 'submission/shots'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, geolocation: { latitude: -26.1038, longitude: 28.099, accuracy: 12 }, permissions: ['geolocation'] })
const p = await ctx.newPage()
const wait = (ms) => p.waitForTimeout(ms)

// A household with a 300 W concentrator on a 1000 Wh battery, 1 hour 40 minutes into an outage, so the countdown is live.
await p.addInitScript(() => {
  try {
    localStorage.setItem('kg2.welcomed', 'true')
    localStorage.setItem('kg2.medplan', JSON.stringify({ watts: 300, wh: 1000, charge: 100, health: 100, chemistry: 'liion', inverter: true, lifeSupport: true }))
    localStorage.setItem('kg2.emergency', JSON.stringify({ name: 'Thandi', phone: '082 123 4567', note: 'I use sign language' }))
  } catch { /* ignore */ }
})
// Overlays that sit on top of a card when the card itself is the picture.
const bare = '.dock,.top,.vitals,.batt-banner,.caption{display:none!important}'
const quiet = '.caption{display:none!important}' // the alert toast would cover the sheet in every picture
const tab = async (label) => {
  await p.locator('.orb').click(); await wait(700)
  await p.locator('.dock-fan button', { hasText: label }).click(); await wait(2200)
}
const sheet = async (to) => { // 'peek' | 'half' | 'full'
  for (let i = 0; i < 3 && !(await p.locator('.sheet').getAttribute('class')).includes(to); i++) { await p.locator('.sheet-grip').click(); await wait(600) }
}
const card = async (text, file) => {
  const hide = await p.addStyleTag({ content: bare })
  await p.setViewportSize({ width: 420, height: 1500 }); await wait(400) // tall enough to show the whole card
  const el = p.locator('section.card', { hasText: text }).first()
  await el.scrollIntoViewIfNeeded(); await wait(300)
  // never include the page background below the sheet
  const bb = await el.boundingBox(); const sb = await p.locator('.sheet').boundingBox()
  await p.screenshot({ path: `${out}/${file}.png`, clip: { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, sb.y + sb.height - bb.y - 4) } })
  await p.setViewportSize({ width: 420, height: 860 }); await wait(300)
  await hide.evaluate((e) => e.remove())
}

await p.goto(base)
await p.addStyleTag({ content: quiet })
await wait(8000)
await p.screenshot({ path: `${out}/street.png` })                                    // the live satellite street, with the sheet peeking
await p.locator('.scrub input').fill('20'); await wait(2500)
await p.screenshot({ path: `${out}/street-later.png` })                              // the same street 20 hours on
await p.locator('.scrub input').fill('0'); await wait(1200)
await p.locator('.street-sat, .stage-layer').first().click({ position: { x: 200, y: 200 } }).catch(() => {})
await p.locator('.orb').click(); await wait(900)
await p.screenshot({ path: `${out}/orb.png` })                                       // navigation: the orb and its arc
await p.keyboard.press('Escape'); await wait(400)

await p.locator('button.a11y-btn').click(); await wait(600)
await p.screenshot({ path: `${out}/access.png` })                                    // the accessibility panel
await p.keyboard.press('Escape'); await wait(300)

await tab('Today')
await sheet('half')
await p.screenshot({ path: `${out}/today.png` })
await card('Outage map', 'map')
await card('Outage forecast', 'forecast')

await tab('Alerts')
await sheet('full')
const wiz = p.locator('.wizard').first()
await wiz.scrollIntoViewIfNeeded(); await wait(300)
await wiz.getByRole('button', { name: 'Next' }).click({ force: true }); await wait(500)
await wiz.getByRole('button', { name: /Whole street is dark/ }).click({ force: true }); await wait(300)
await p.screenshot({ path: `${out}/wizard.png` })                                    // a report, one step at a time
await card('Report a problem', 'alerts')

await tab('Deliver')
await sheet('full')
await p.evaluate(() => localStorage.setItem('kg2.battery', JSON.stringify({ start: Date.now() - 100 * 60000, startPct: 100, readings: [] })))
await p.reload(); await p.addStyleTag({ content: quiet }); await wait(5000)
await p.screenshot({ path: `${out}/battery.png` })                                   // banner: time left and the ambulance button
await tab('Deliver'); await sheet('full')
await card('Medical power plan', 'care')
{
  const hide = await p.addStyleTag({ content: bare })
  await p.locator('.batt-live').first().screenshot({ path: `${out}/countdown.png` })
  await hide.evaluate((e) => e.remove())
}   // the live countdown on its own
await p.getByRole('button', { name: 'Emergency card (no phone call needed)' }).first().click({ force: true }); await wait(2000)
await p.screenshot({ path: `${out}/emergency.png` })                                 // the card to show or text, no voice call
await p.keyboard.press('Escape'); await wait(400)
{
  const w = p.locator('.wizard').last()
  await w.scrollIntoViewIfNeeded()
  await w.getByRole('button', { name: 'Next' }).click({ force: true }); await wait(300)
  await w.getByRole('button', { name: 'Next' }).click({ force: true }); await wait(300)
  await w.getByLabel('Patient first name').fill('Gogo Dlamini'); await w.getByLabel('Street or landmark').fill('Opposite the clinic, 4th Ave')
  await w.getByRole('button', { name: 'Next' }).click({ force: true }); await wait(500)
  await card('Book a delivery', 'booking')
}

await p.evaluate(() => localStorage.removeItem('kg2.battery'))
await p.reload(); await p.addStyleTag({ content: quiet }); await wait(4000)
await tab('Business')
await sheet('full')
await p.screenshot({ path: `${out}/business.png` })

await tab('More')
await p.locator('.more-item', { hasText: 'Share' }).click(); await wait(1500)
await sheet('full')
await p.screenshot({ path: `${out}/share.png` })
await b.close()
console.log('shots done')
