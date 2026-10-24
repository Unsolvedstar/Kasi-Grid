import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { flushSync } from 'react-dom'

// Navigation as a single living orb. It breathes at the pace of the street (slow when calm, fast when the lights are out);
// tapping it blooms the sections in an arc, and choosing one opens the new view as a circle growing out of the orb.
export default function Dock({ tabs, current, onPick, mood, t }) {
  const [open, setOpen] = useState(false)
  const orb = useRef(null)
  const cur = tabs.find((x) => x.current) ?? tabs[0]
  // The arc shrinks on narrow screens so the outer sections and their labels are never cut off.
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setVw(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const R = Math.max(96, Math.min(150, (vw / 2 - 38) / 0.966))

  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && (setOpen(false), orb.current?.focus())
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const pick = (id) => {
    setOpen(false)
    if (id === current) return
    const r = orb.current.getBoundingClientRect()
    const root = document.documentElement.style
    root.setProperty('--vx', `${r.left + r.width / 2}px`)
    root.setProperty('--vy', `${r.top + r.height / 2}px`)
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => flushSync(() => onPick(id)))
    } else onPick(id)
  }

  const n = tabs.length
  return (
    <nav className={`dock ${open ? 'open' : ''}`} data-mood={mood} aria-label={t('Sections')}>
      {open && <button className="dock-scrim" aria-label={t('Close menu')} tabIndex={-1} onClick={() => setOpen(false)} />}
      <ul className="dock-fan">
        {tabs.map((tb, i) => {
          const a = (-165 + (i / (n - 1)) * 135) * (Math.PI / 180)
          return (
            <li key={tb.id} style={{ '--x': `${Math.cos(a) * R}px`, '--y': `${Math.sin(a) * R}px`, '--d': `${i * 28}ms` }}>
              <button className={tb.current ? 'on' : ''} tabIndex={open ? 0 : -1} aria-current={tb.current ? 'page' : undefined} onClick={() => pick(tb.id)}>
                <span aria-hidden="true"><Icon name={tb.icon} /></span>
                <b>{t(tb.label)}</b>
              </button>
            </li>
          )
        })}
      </ul>
      <button ref={orb} className="orb" aria-expanded={open} aria-haspopup="true" aria-label={`${t('Sections')}: ${t(cur.label)}`} onClick={() => setOpen(!open)}>
        <i className="orb-core" />
        <span aria-hidden="true"><Icon name={open ? 'close' : cur.icon} /></span>
      </button>
      {!open && <span className="orb-name" aria-hidden="true">{t(cur.label)}</span>}
    </nav>
  )
}
