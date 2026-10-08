import { chromium } from 'playwright'
const b = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1.5, colorScheme: scheme })
  const p = await ctx.newPage()
  await p.goto('http://localhost:3111'); await p.waitForTimeout(3000)
  await p.screenshot({ path: `submission/ui-${scheme}-today.png` })
  await p.locator('nav.tabs button', { hasText: 'Alerts' }).click(); await p.waitForTimeout(1500)
  await p.screenshot({ path: `submission/ui-${scheme}-alerts.png` })
}
await b.close()
