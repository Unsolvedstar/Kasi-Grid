// Regenerates the deck screenshots from a running app on :3111 that has demo data.
// DATABASE_URL=file:data/shots.db PORT=3111 node server/index.js   (in another terminal)
// DATABASE_URL=file:data/shots.db node scripts/demo-history.mjs alex && node scripts/demo-seed.mjs http://localhost:3111 alex
import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
// Navigation is the orb: tap it, then pick a section from the arc.
const tab = async (label) => { await p.locator('.orb').click(); await p.waitForTimeout(700); await p.locator('.dock-fan button', { hasText: label }).click(); await p.waitForTimeout(2200) }
// Map tiles need the internet; draw the markers on a plain background so the screenshot is the same offline.
await p.addInitScript(() => {
  try {
    localStorage.setItem('kg2.welcomed', 'true')
    localStorage.setItem('kg2.medplan', JSON.stringify({ watts: '300', wh: '1000' }))
  } catch { /* ignore */ }
})
await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style')
  st.textContent = '.leaflet-tile-pane{display:none}.leaflet-container{background:#e6e1f7!important}'
  document.head.appendChild(st)
}))
await p.goto('http://localhost:3111')
await p.waitForTimeout(3500)
// Street tab is the home screen: now, then 20 hours ahead, then the orb open.
await p.screenshot({ path: 'submission/shots/street.png' })
await p.locator('.scrub input').fill('20'); await p.waitForTimeout(2500)
await p.screenshot({ path: 'submission/shots/street-later.png' })
await p.locator('.scrub input').fill('0'); await p.waitForTimeout(1500)
await p.locator('.orb').click(); await p.waitForTimeout(900)
await p.screenshot({ path: 'submission/shots/orb.png' })
await p.keyboard.press('Escape')
await tab('Today')
await p.screenshot({ path: 'submission/shots/today.png' })
const hide = await p.addStyleTag({ content: '.dock,.top{display:none!important}' })
await p.locator('section.card', { hasText: 'Outage map' }).first().screenshot({ path: 'submission/shots/map.png' })
await p.locator('section.card', { hasText: 'Outage forecast' }).first().screenshot({ path: 'submission/shots/forecast.png' })
await hide.evaluate((e) => e.remove())
await tab('Alerts')
await p.screenshot({ path: 'submission/shots/alerts.png' })
await tab('Deliver')
await p.waitForTimeout(500)
await p.screenshot({ path: 'submission/shots/care.png' })
await p.locator('.chip', { hasText: 'Companion' }).click()
const hide2 = await p.addStyleTag({ content: '.dock,.top{display:none!important}' })
await p.locator('section.card', { hasText: 'Book a delivery, care or equipment' }).first().screenshot({ path: 'submission/shots/booking.png' })
await hide2.evaluate((e) => e.remove())
await tab('Business')
await p.screenshot({ path: 'submission/shots/business.png' })
await tab('More')
await p.locator('.more-item', { hasText: 'Share' }).click()
await p.waitForTimeout(1500)
await p.screenshot({ path: 'submission/shots/share.png' })
await b.close()
console.log('shots done')
