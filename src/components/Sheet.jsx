import { useEffect, useRef, useState } from 'react'

// A pull-up sheet over the live street: drag the grip (or tap it) between peek, half and full. The street stays alive behind it.
const ORDER = ['peek', 'half', 'full']
const PEEK = 360

export default function Sheet({ snap, setSnap, label, bodyRef, children }) {
  const [vh, setVh] = useState(() => window.innerHeight)
  const [drag, setDrag] = useState(null)
  const start = useRef(null)
  useEffect(() => {
    const on = () => setVh(window.innerHeight)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const heights = { peek: Math.min(PEEK, vh * 0.52), half: vh * 0.6, full: vh - 78 }
  const h = drag ? Math.max(heights.peek * 0.75, Math.min(heights.full, drag.h)) : heights[snap]

  const down = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    start.current = { y: e.clientY, h: heights[snap], t: performance.now(), moved: false, v: 0, last: e.clientY, lt: performance.now() }
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const dy = s.y - e.clientY
    if (Math.abs(dy) > 4) s.moved = true
    const now = performance.now()
    s.v = (s.last - e.clientY) / Math.max(1, now - s.lt) // px per ms, up is positive
    s.last = e.clientY
    s.lt = now
    if (s.moved) setDrag({ h: s.h + dy })
  }
  const up = () => {
    const s = start.current
    start.current = null
    if (!s) return
    if (!s.moved) { cycle(); return }
    const target = (drag?.h ?? s.h) + s.v * 220
    const best = ORDER.reduce((a, k) => (Math.abs(heights[k] - target) < Math.abs(heights[a] - target) ? k : a), 'half')
    setDrag(null)
    setSnap(best)
  }
  const cycle = () => setSnap(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length])

  return (
    <section className={`sheet ${snap}`} style={{ height: h, transition: drag ? 'none' : undefined }} aria-label={label}>
      <button
        type="button"
        className="sheet-grip"
        aria-label={`${label}: ${snap}. Drag or press to resize.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { start.current = null; setDrag(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle() } }}
      >
        <i />
      </button>
      <div className="sheet-body" ref={bodyRef} style={{ overflowY: snap === 'peek' && !drag ? 'hidden' : 'auto' }}>{children}</div>
    </section>
  )
}
