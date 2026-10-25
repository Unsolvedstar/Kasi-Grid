// Builds the hand-in pack from submission/content.mjs:
//   submission/SUBMISSION.md                 the same words, for copying into the entry form
//   submission/handin/01-Project-Overview.pdf
//   submission/handin/03-SSDLC-Security.pdf
//   submission/handin/04-Lean-Business-Canvas.pdf
//   submission/handin/05-Demo-Guide.pdf
// (02-Pitch-Deck.pdf is exported from the deck: see submission/export-deck.ps1.)  Run: node submission/build.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { APP, HACK, LIVE_URL, REPO, TAGLINE, TEAM, TRACK, VIDEO_URL, canvas, demo, overview, ssdlc } from './content.mjs'

const OUT = 'submission/handin'
fs.mkdirSync(OUT, { recursive: true })
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// every bare web address in the text becomes a link, so nothing is left as plain text in the PDFs
const linkify = (h) => h.replace(/(^|[\s(>])(https?:\/\/[^\s<)]+[^\s<).,;])/g, '$1<a href="$2">$2</a>')
const inline = (s) => linkify(esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>'))
const img = (n) => `data:image/png;base64,${fs.readFileSync(`submission/shots/${n}.png`).toString('base64')}`
const mark = fs.readFileSync('public/brand/logo-mark.svg', 'utf8')

const links = [['Source code', REPO], ...(LIVE_URL ? [['Live app', LIVE_URL]] : []), ...(VIDEO_URL ? [['Demo video', VIDEO_URL]] : [])]

// ---------- HTML ----------
const CSS = `
@page { size: A4; margin: 16mm 15mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.5 'Segoe UI', Calibri, Arial, sans-serif; color: #241f38; }
h1, h2, h3 { font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; }
h1 { font-size: 26pt; letter-spacing: -.01em; }
h2 { font-size: 15pt; color: #4b2fa6; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 2px solid transparent; border-image: linear-gradient(90deg, #8a5fd6, #2a8bf2) 1; break-after: avoid; }
h3 { font-size: 11pt; margin: 12px 0 4px; }
p { margin: 6px 0; }
ul { margin: 6px 0; padding-left: 18px; } li { margin: 4px 0; }
b { color: #1f1a3f; }
code { background: #f0ecfb; padding: 0 4px; border-radius: 4px; font-size: 9.5pt; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9.5pt; break-inside: auto; }
th { background: linear-gradient(90deg, #8a5fd6, #2a8bf2); color: #fff; text-align: left; padding: 6px 8px; }
td { padding: 6px 8px; border-bottom: 1px solid #e3dcf5; vertical-align: top; }
tr { break-inside: avoid; } tr:nth-child(even) td { background: #faf8ff; }
tr:last-child td:first-child { font-weight: 700; }
.note { color: #5a5475; font-size: 9pt; font-style: italic; }
.cover { min-height: 235mm; display: flex; flex-direction: column; justify-content: center; gap: 10px; break-after: page; }
.cover .band { height: 10px; border-radius: 6px; background: linear-gradient(90deg, #8a5fd6, #2a8bf2); margin-bottom: 22px; }
.cover svg { width: 170px; height: auto; }
.cover .tag { font-size: 15pt; color: #4b2fa6; font-style: italic; }
.cover .meta { margin-top: 18px; font-size: 11pt; } .cover .meta div { margin: 3px 0; }
.cover a, a { color: #1b6fb5; word-break: break-all; }
.team { display: inline-block; padding: 3px 12px; border-radius: 99px; color: #fff; font-weight: 700; background: linear-gradient(90deg, #8a5fd6, #2a8bf2); }
.shots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; break-inside: avoid; }
.shots figure { margin: 0; text-align: center; font-size: 8pt; color: #5a5475; } .shots img { width: 100%; border-radius: 10px; border: 1px solid #e3dcf5; display: block; }
section { break-inside: auto; }
.canvas { display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: 1fr 1fr auto; gap: 8px; height: 148mm; }
.canvas .box { border: 1.5px solid #cfc4ee; border-radius: 10px; padding: 8px 10px; background: #fff; overflow: hidden; }
.canvas .box h3 { margin: 0 0 5px; font-size: 10.5pt; color: #4b2fa6; text-transform: uppercase; letter-spacing: .04em; }
.canvas .box ul { margin: 0; padding-left: 15px; font-size: 9.2pt; line-height: 1.35; } .canvas .box li { margin: 2px 0; } .canvas .box p { font-size: 9.2pt; margin: 0; line-height: 1.45; }
.canvas .wide { grid-column: span 5; background: #faf8ff; font-size: 8.6pt; }
.footer { font-size: 8pt; color: #7a7497; }
`
const shell = (title, body, landscape = false) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}${landscape ? '@page { size: A4 landscape; margin: 10mm 12mm; }' : ''}</style></head><body>${body}</body></html>`

const block = (b) => {
  if (b.p) return `<p>${inline(b.p)}</p>`
  if (b.note) return `<p class="note">${inline(b.note)}</p>`
  if (b.h3) return `<h3>${inline(b.h3)}</h3>`
  if (b.ul) return `<ul>${b.ul.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`
  if (b.table) return `<table><thead><tr>${b.table[0].map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${b.table.slice(1).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  return ''
}
const sections = (list, startAt = 1) => list.map((s, i) => `<section><h2>${startAt + i}. ${esc(s.title)}</h2>${s.blocks.map(block).join('')}</section>`).join('')
const cover = (title, sub) => `<div class="cover"><div class="band"></div>${mark.replace('<svg ', '<svg ')}<h1>${esc(title)}</h1><div class="tag">${esc(sub)}</div>
  <div class="meta"><div><span class="team">${esc(TEAM)}</span></div><div><b>${esc(APP)}</b>: ${esc(TAGLINE)}</div><div>${esc(HACK)} &middot; Track: ${esc(TRACK)}</div>
  <div>Tshedza Tshikovhi and Mulanga Munaka</div>${links.map(([l, u]) => `<div>${esc(l)}: <a href="${esc(u)}">${esc(u)}</a></div>`).join('')}</div></div>`

// 01 Project overview: cover, the story, the product, the business
const shots = ['street', 'battery', 'emergency', 'access'].map((n, i) => `<figure><img src="${img(n)}"><figcaption>${['The live satellite street', 'Battery countdown and ambulance', 'Emergency card, no call needed', 'Accessibility settings'][i]}</figcaption></figure>`).join('')
const overviewHtml = shell('01 Project overview', cover('Project overview', 'A community early-warning and support system for power and water outages')
  + sections(overview.slice(0, 3)).replace(/<\/section>$/, `<div class="shots">${shots}</div></section>`) + sections(overview.slice(3), 4)
  + `<h2>Source code</h2><p>The code is not attached to this entry. It is in a public Git repository: <a href="${REPO}">${REPO}</a>. The README explains how to run it, and the repository holds the 111 automated tests.</p>`)

const ssdlcHtml = shell('03 Secure System Development Cycle', cover('Secure System Development Cycle', 'How security was built into Kasi Grid, phase by phase') + sections(ssdlc))

const cb = (t, x, cls = '') => `<div class="box ${cls}"><h3>${t}</h3>${Array.isArray(x) ? `<ul>${x.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>` : `<p>${inline(x)}</p>`}</div>`
const canvasHtml = shell('04 Lean Business Canvas', `<h1 style="font-size:20pt">Lean Business Canvas &middot; ${esc(APP)}</h1><p class="note" style="margin:2px 0 8px">${esc(TEAM)} &middot; ${esc(HACK)}</p>
  <div class="canvas">${cb('Problem', canvas.problem)}${cb('Solution', canvas.solution)}${cb('Unique value proposition', canvas.uvp)}${cb('Unfair advantage', canvas.unfair)}${cb('Customer segments', canvas.segments)}
  ${cb('Key metrics', canvas.metrics)}${cb('Channels', canvas.channels)}${cb('Cost structure', canvas.costs)}${cb('Revenue streams', canvas.revenue)}${cb('Assumptions to validate', canvas.assumptions)}</div>
  <p class="footer">Source code: <a href="${esc(REPO)}">${esc(REPO)}</a>${LIVE_URL ? ` &middot; Live app: <a href="${esc(LIVE_URL)}">${esc(LIVE_URL)}</a>` : ''}${VIDEO_URL ? ` &middot; Demo video: <a href="${esc(VIDEO_URL)}">Watch</a>` : ''}</p>`, true)

const demoHtml = shell('05 Demo guide', cover('Demo guide', 'How to see it working in two minutes') + `<section><h2>1. Try it</h2><ul>${demo.tryit.map((x) => `<li>${inline(x)}</li>`).join('')}</ul><p>${inline(demo.intro)}</p></section>
  <section><h2>2. What is real, and what is sample</h2><p>${inline(demo.sample)}</p></section>
  <section><h2>3. 90-second demo script</h2><table><thead><tr><th>Time</th><th>On screen</th><th>Say</th></tr></thead><tbody>${demo.script.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>
  <div class="shots">${['street', 'today', 'wizard', 'care'].map((n) => `<figure><img src="${img(n)}"><figcaption>${n}</figcaption></figure>`).join('')}</div>`)

// ---------- PDFs ----------
if (process.env.KEEP_HTML) for (const [n, h] of Object.entries({ overview: overviewHtml, ssdlc: ssdlcHtml, canvas: canvasHtml, demo: demoHtml })) fs.writeFileSync(`${process.env.KEEP_HTML}/${n}.html`, h)
const b = await chromium.launch()
const pdf = async (html, file, landscape = false) => {
  const p = await b.newPage()
  await p.setContent(html, { waitUntil: 'load' })
  await p.pdf({
    path: `${OUT}/${file}`, format: 'A4', landscape, printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font:8px Segoe UI,Arial;color:#7a7497;padding:0 15mm;display:flex;justify-content:space-between"><span>${esc(APP)} &middot; ${esc(TEAM)} &middot; ${esc(HACK)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: landscape ? { top: '10mm', bottom: '14mm', left: '12mm', right: '12mm' } : { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
  })
  await p.close()
}
await pdf(overviewHtml, '01-Project-Overview.pdf')
await pdf(ssdlcHtml, '03-SSDLC-Security.pdf')
await pdf(canvasHtml, '04-Lean-Business-Canvas.pdf', true)
await pdf(demoHtml, '05-Demo-Guide.pdf')
await b.close()

// ---------- SUBMISSION.md ----------
const md = (bk) => {
  if (bk.p) return bk.p + '\n'
  if (bk.note) return `_${bk.note}_\n`
  if (bk.h3) return `### ${bk.h3}\n`
  if (bk.ul) return bk.ul.map((x) => `- ${x}`).join('\n') + '\n'
  if (bk.table) return [`| ${bk.table[0].join(' | ')} |`, `|${bk.table[0].map(() => '---').join('|')}|`, ...bk.table.slice(1).map((r) => `| ${r.join(' | ')} |`)].join('\n') + '\n'
  return ''
}
const mdSections = (list, n0 = 1) => list.map((s, i) => `## ${n0 + i}. ${s.title}\n\n${s.blocks.map(md).join('\n')}`).join('\n')
const canvasMd = Object.entries({ Problem: canvas.problem, 'Customer segments': canvas.segments, 'Unique value proposition': canvas.uvp, Solution: canvas.solution, Channels: canvas.channels, 'Revenue streams': canvas.revenue, 'Cost structure': canvas.costs, 'Key metrics': canvas.metrics, 'Unfair advantage': canvas.unfair, Assumptions: canvas.assumptions })
  .map(([k, v]) => `- **${k}:** ${Array.isArray(v) ? v.join('; ') : v}`).join('\n')
fs.writeFileSync('submission/SUBMISSION.md', `# ${APP}: submission (${TEAM})

Generated from \`submission/content.mjs\` by \`node submission/build.mjs\`. Edit the words there, not here.

## Hand-in files, in order (each under 25 MB; no code files)
1. \`submission/handin/01-Project-Overview.pdf\`: the story, problem, solution, what stands out, advantage, segments, metrics, channels, costs and revenue
2. \`submission/handin/02-Pitch-Deck.pdf\`: the pitch deck (export of \`Kasi-Grid-deck.pptx\`)
3. \`submission/handin/03-SSDLC-Security.pdf\`: the secure system development cycle
4. \`submission/handin/04-Lean-Business-Canvas.pdf\`: one page
5. \`submission/handin/05-Demo-Guide.pdf\`: how to try it, what is real, the 90-second script
6. The demo video (90 seconds or less) using the script in the guide

The Git repository is given as a link inside the overview and the deck: ${REPO}
${LIVE_URL ? `Live app: ${LIVE_URL}` : ''}
${VIDEO_URL ? `Demo video: ${VIDEO_URL}` : ''}

## Before you submit
- [ ] Deploy the app (see DEPLOY.md), then set \`LIVE_URL\` in \`submission/content.mjs\` and re-run \`node submission/build.mjs\` and the deck export
- [ ] Record the demo video, add \`VIDEO_URL\`, rebuild
- [ ] Check every PDF page by page; confirm Mulanga's part is described the way she wants
- [ ] The repository is public (checked): anyone can open the link above

## Track
${TRACK}: "How might communities use data and digital services to prepare for disruptions, reduce household costs and improve access to water, energy, transport and food?"

${mdSections(overview)}
${mdSections(ssdlc)}
## Lean Business Canvas
${canvasMd}

## Demo guide
${demo.intro}

**Try it**
${demo.tryit.map((x) => `- ${x}`).join('\n')}

**Real and sample.** ${demo.sample}

| Time | On screen | Say |
|---|---|---|
${demo.script.map((r) => `| ${r.join(' | ')} |`).join('\n')}
`)
console.log('built:', fs.readdirSync(OUT).join(', '))
