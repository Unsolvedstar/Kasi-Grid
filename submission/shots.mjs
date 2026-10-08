import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto('http://localhost:3111')
await p.waitForTimeout(3500)
await p.screenshot({ path: 'submission/shots/today.png' })
for (const [n, label] of [['alerts','Alerts'],['share','Share'],['food','Nearby'],['savings','Save']]) {
  await p.locator('nav.tabs button', { hasText: label }).click()
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `submission/shots/${n}.png` })
}
await b.close()
