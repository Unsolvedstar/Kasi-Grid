import { useEffect, useRef } from 'react'

// A night street in perspective: a road running to the horizon with a house on each side at every step. Each home has
// its own tolerance, so a 40% risk darkens about 40% of windows: probability you can see. Gold "lanterns" are neighbours
// offering help, with a thread to the nearest dark home; blue motes run down the gutters while water is flowing.
const N = 28
const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

export default function StreetField({ seed, power, water, lanterns, pulse, height = 'min(36vh, 320px)', label }) {
  const ref = useRef(null)
  const live = useRef({})
  live.current = { power, water, lanterns, pulse }

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const rnd = seeded(hash(seed))
    const homes = Array.from({ length: N }, (_, i) => ({ i, tol: rnd(), ph: rnd() * 6.28, lit: 1 }))
    const drops = Array.from({ length: 60 }, () => ({ r: rnd(), v: .15 + rnd() * .25 }))
    const ripples = []
    let w = 0, h = 0, raf = 0, last = -1, lastPulse = live.current.pulse
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // touching the street sends a ripple through it
    let lastTouch = 0
    const touch = (e) => {
      const now = performance.now()
      if (now - lastTouch < 140) return
      lastTouch = now
      const r = cv.getBoundingClientRect()
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, born: now / 1000 })
      if (reduce) requestAnimationFrame(frame)
    }
    cv.addEventListener('pointerdown', touch); cv.addEventListener('pointermove', (e) => e.buttons && touch(e))
    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(cv)
    const HALF = N / 2
    const vy = () => h * .3
    // perspective: z 0 (nearest) .. 1 (far) -> depth factor p (1 near .. ~.17 far)
    const depth = (z) => 1 / (1 + z * 5)
    const rowY = (p) => vy() + (h * .94 - vy()) * p
    const roadHalf = () => w * .16
    const place = (i) => {
      const k = i >> 1, side = i & 1 ? -1 : 1, p = depth(k / HALF), bw = Math.min(w * .13, 78) * p
      const bh = bw * .7, y = rowY(p), x = w / 2 + side * (roadHalf() * p + 10 * p + bw / 2)
      return { x, y, bw, bh, p, side }
    }
    const frame = (ms) => {
      const t = ms / 1000
      const { power, water, lanterns, pulse } = live.current
      if (pulse !== lastPulse) { lastPulse = pulse; ripples.push({ x: w / 2 + (rnd() - .5) * w * .5, y: h * .55 + (rnd() - .5) * h * .3, born: t }) }
      const dt = last < 0 ? .016 : Math.min(.1, t - last); last = t
      const calm = 1 - power
      // sky: deeper and bluer as the street goes dark
      const sky = ctx.createLinearGradient(0, 0, 0, vy() + 10)
      sky.addColorStop(0, `rgb(${14 + 8 * power | 0},${10 + 6 * power | 0},${34 + 8 * power | 0})`)
      sky.addColorStop(1, `rgb(${58 + 30 * calm | 0},${40 + 24 * calm | 0},${84 + 10 * calm | 0})`)
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgb(18,14,34)'; ctx.fillRect(0, vy(), w, h - vy())
      // road
      const rh = roadHalf()
      ctx.fillStyle = 'rgb(34,28,58)'
      ctx.beginPath(); ctx.moveTo(w / 2 - rh, h); ctx.lineTo(w / 2 - 3, vy()); ctx.lineTo(w / 2 + 3, vy()); ctx.lineTo(w / 2 + rh, h); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(190,170,255,.28)'; ctx.lineWidth = 1.5
      for (let k = 0; k < 9; k++) {
        const z0 = ((k + (reduce ? 0 : (t * .25) % 1)) / 9), z1 = z0 + .045
        const p0 = depth(1 - z0 * .95), p1 = depth(1 - Math.min(1, z1) * .95)
        ctx.lineWidth = 3.5 * p0; ctx.beginPath(); ctx.moveTo(w / 2, rowY(p0)); ctx.lineTo(w / 2, rowY(p1)); ctx.stroke()
      }

      ctx.globalCompositeOperation = 'lighter'
      // water: blue motes run down both gutters toward you; fewer and slower as water risk rises
      const flow = Math.round(drops.length * (1 - water * .9))
      for (let k = 0; k < flow; k++) {
        const dr = drops[k]
        dr.r = (dr.r + dt * dr.v * (1 - water * .7) * .6) % 1
        const p = depth(1 - dr.r), side = k % 2 ? -1 : 1
        ctx.fillStyle = `rgba(120,200,255,${.2 + .5 * dr.r})`
        ctx.beginPath(); ctx.arc(w / 2 + side * rh * p * .93, rowY(p), 1 + 2.2 * p, 0, 7); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // homes, far to near so close ones cover distant ones
      const pts = new Array(N)
      for (let i = N - 1; i >= 0; i--) {
        const m = homes[i], g = place(i)
        const target = power > m.tol ? 0 : 1
        m.lit += (target - m.lit) * Math.min(1, dt * 4)
        const { x, y, bw, bh, p } = g
        pts[i] = [x, y - bh * .55]
        // body and roof
        ctx.fillStyle = 'rgb(26,20,48)'; ctx.strokeStyle = 'rgba(150,130,210,.35)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.rect(x - bw / 2, y - bh, bw, bh); ctx.fill(); ctx.stroke()
        ctx.fillStyle = 'rgb(44,34,76)'
        ctx.beginPath(); ctx.moveTo(x - bw * .6, y - bh); ctx.lineTo(x, y - bh - bw * .32); ctx.lineTo(x + bw * .6, y - bh); ctx.closePath(); ctx.fill(); ctx.stroke()
        // two windows
        const on = m.lit > .5, flick = on ? .88 + .12 * Math.sin(t * 2 + m.ph) : 1, ww = bw * .22, wh = bh * .32
        const alpha = (.15 + .85 * m.lit) * flick
        for (const dx of [-.2, .2]) {
          const wx = x + dx * bw - ww / 2, wy = y - bh * .72
          if (m.lit > .3) {
            ctx.globalCompositeOperation = 'lighter'
            const gl = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 0, wx + ww / 2, wy + wh / 2, bw * .7)
            gl.addColorStop(0, `rgba(255,226,150,${alpha * .45})`); gl.addColorStop(1, 'rgba(255,226,150,0)')
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(wx + ww / 2, wy + wh / 2, bw * .7, 0, 7); ctx.fill()
            ctx.globalCompositeOperation = 'source-over'
          }
          ctx.fillStyle = m.lit > .3 ? `rgba(255,238,185,${alpha})` : 'rgba(90,80,130,.5)'
          ctx.fillRect(wx, wy, ww, wh)
        }
        // door
        ctx.fillStyle = 'rgba(60,48,96,.9)'; ctx.fillRect(x - bw * .07, y - bh * .34, bw * .14, bh * .34)
      }

      // Ubuntu threads: each lantern (gold, spread along the street) reaches the nearest dark home
      const dark = homes.filter((m) => m.lit < .3).map((m) => m.i)
      const n = Math.min(lanterns, 12)
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < n; k++) {
        const li = Math.floor(((k + .5) / n) * N)
        const [lx, ly] = pts[li]
        const pulseR = 4 + 2 * Math.sin(t * 2.4 + k)
        ctx.fillStyle = 'rgba(255,190,70,.95)'; ctx.beginPath(); ctx.arc(lx, ly - 18 * place(li).p - 6, 3.4, 0, 7); ctx.fill()
        ctx.strokeStyle = 'rgba(255,190,70,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, ly - 18 * place(li).p - 6, pulseR + 3, 0, 7); ctx.stroke()
        const fy = ly - 18 * place(li).p - 6
        if (dark.length) {
          let best = -1, bd = 1e9
          for (const di of dark) { const dd = (pts[di][0] - lx) ** 2 + (pts[di][1] - fy) ** 2; if (dd < bd) { bd = dd; best = di } }
          const [dx, dy] = pts[best]
          const flowT = (t * .5 + k * .3) % 1
          ctx.strokeStyle = 'rgba(255,190,70,.3)'; ctx.beginPath(); ctx.moveTo(lx, fy)
          ctx.quadraticCurveTo((lx + dx) / 2, Math.min(fy, dy) - 16, dx, dy); ctx.stroke()
          ctx.fillStyle = 'rgba(255,215,120,.95)'
          ctx.beginPath(); ctx.arc(lx + (dx - lx) * flowT, fy + (dy - fy) * flowT - Math.sin(flowT * 3.14) * 12, 2, 0, 7); ctx.fill()
        }
      }
      ctx.globalCompositeOperation = 'source-over'

      // ripples when a neighbour reports or confirms
      for (let k = ripples.length - 1; k >= 0; k--) {
        const rp = ripples[k], age = t - rp.born
        if (age > 3) { ripples.splice(k, 1); continue }
        ctx.strokeStyle = `rgba(190,170,255,${.6 * (1 - age / 3)})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(rp.x, rp.y, age * 70, 0, 7); ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    // with reduced motion the loop runs once per change instead of continuously
    let tick = null
    if (reduce) tick = setInterval(() => requestAnimationFrame(frame), 700)
    return () => { cancelAnimationFrame(raf); clearInterval(tick); ro.disconnect() }
  }, [seed])

  return <canvas ref={ref} className="street" style={{ height }} role="img" aria-label={label} />
}
