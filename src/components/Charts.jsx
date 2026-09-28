import { useState } from 'react'
import { zar } from '../lib.js'
import { useT } from '../i18n.jsx'

// Inline SVG charts. Colours come from CSS custom properties on .chart (see styles.css).
const W = 340

function niceStep(range, ticks = 4) {
  const raw = range / ticks || 1
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow
}

function Tip({ tip, h }) {
  if (!tip) return null
  const left = Math.min(Math.max((tip.x / W) * 100, 18), 82)
  return (
    <div className="tip-box" style={{ left: left + '%', top: (tip.y / h) * 100 + '%' }} role="status">
      {tip.lines.map((l, i) => <div key={i} className={i === 0 ? 'tip-title' : ''}>{l}</div>)}
    </div>
  )
}

// Cumulative net savings over 12 months: monthly savings minus what you spend upfront, against a goal.
export function SavingsLine({ monthly, upfront, goal }) {
  const t = useT()
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  const H = 210
  const pad = { l: 46, r: 14, t: 14, b: 26 }
  const months = Array.from({ length: 13 }, (_, m) => ({ m, net: monthly * m - upfront }))
  const top = Math.max(months[12].net, goal, 1)
  const bottom = Math.min(0, -upfront)
  const step = niceStep(top - bottom)
  const yMax = Math.ceil(top / step) * step
  const yMin = Math.floor(bottom / step) * step
  const x = (m) => pad.l + (m / 12) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b)
  const ticks = []
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(v)
  const path = months.map((d, i) => `${i ? 'L' : 'M'}${x(d.m).toFixed(1)},${y(d.net).toFixed(1)}`).join(' ')
  const area = `${path} L${x(12)},${y(0)} L${x(0)},${y(0)} Z`
  const reach = monthly > 0 ? Math.ceil((goal + upfront) / monthly) : null

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const m = Math.min(12, Math.max(0, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * 12)))
    setHover(m)
  }
  const d = hover !== null ? months[hover] : null

  if (table)
    return (
      <div className="chart">
        <table className="data-table">
          <thead><tr><th>Month</th><th className="r">Net savings</th></tr></thead>
          <tbody>{months.map((r) => <tr key={r.m}><td>{r.m}</td><td className="r">{zar(r.net)}</td></tr>)}</tbody>
        </table>
        <button className="link" onClick={() => setTable(false)}>{t('Show chart')}</button>
      </div>
    )

  return (
    <div className="chart">
      <p className="chart-title">{t('Net savings over 12 months')}</p>
      <p className="muted small">{reach && reach <= 12 ? `You pass your goal in month ${reach}.` : reach ? `At this pace your goal takes ${reach} months.` : 'Pick some actions to see your savings grow.'}</p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Net savings grow to ${zar(months[12].net)} after 12 months. Goal ${zar(goal)}.`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
              <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="tick">{zar(v)}</text>
            </g>
          ))}
          {[0, 3, 6, 9, 12].map((m) => (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="tick">{m === 0 ? t('Now') : `${m} mo`}</text>
          ))}
          {goal > 0 && goal <= yMax && (
            <g>
              <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} className="goal" />
              <text x={W - pad.r} y={y(goal) - 5} textAnchor="end" className="label">Goal {zar(goal)}</text>
            </g>
          )}
          <path d={area} className="area s1" />
          <path d={path} className="line s1" />
          <circle cx={x(12)} cy={y(months[12].net)} r="4" className="dot s1" />
          <text x={x(12)} y={y(months[12].net) - 9} textAnchor="end" className="label strong">{zar(months[12].net)}</text>
          {d && (
            <g>
              <line x1={x(d.m)} x2={x(d.m)} y1={pad.t} y2={H - pad.b} className="cross" />
              <circle cx={x(d.m)} cy={y(d.net)} r="5" className="dot s1" />
            </g>
          )}
        </svg>
        <Tip tip={d && { x: x(d.m), y: y(d.net) - 8, lines: [d.m === 0 ? 'Now' : `Month ${d.m}`, `Net ${zar(d.net)}`] }} h={H} />
      </div>
      <p className="muted small">Net means savings so far minus what you spend upfront on the actions you ticked.</p>
      <button className="link" onClick={() => setTable(true)}>{t('Show as table')}</button>
    </div>
  )
}

// Monthly bills now versus with your plan, for electricity and water.
export function BillBars({ rows }) {
  const t = useT()
  const [hover, setHover] = useState(null)
  const [table, setTable] = useState(false)
  const H = 190
  const pad = { l: 46, r: 10, t: 24, b: 28 }
  const max = Math.max(...rows.flatMap((r) => [r.now, r.plan]), 1)
  const step = niceStep(max)
  const yMax = Math.ceil(max / step) * step
  const y = (v) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b)
  const ticks = []
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v)
  const slot = (W - pad.l - pad.r) / rows.length
  const bw = 22
  const gap = 2

  // Column with a 4px rounded top and a square baseline.
  const col = (cx, v) => {
    const top = y(v)
    const h = Math.max(0, y(0) - top)
    const r = Math.min(4, h)
    return `M${cx},${y(0)} V${top + r} Q${cx},${top} ${cx + r},${top} H${cx + bw - r} Q${cx + bw},${top} ${cx + bw},${top + r} V${y(0)} Z`
  }

  if (table)
    return (
      <div className="chart">
        <table className="data-table">
          <thead><tr><th></th><th className="r">Now</th><th className="r">With plan</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.label}><td>{r.label}</td><td className="r">{zar(r.now)}</td><td className="r">{zar(r.plan)}</td></tr>)}</tbody>
        </table>
        <button className="link" onClick={() => setTable(false)}>{t('Show chart')}</button>
      </div>
    )

  return (
    <div className="chart">
      <p className="chart-title">{t('Monthly bills, now and with your plan')}</p>
      <div className="legend">
        <span><i style={{ background: 'var(--series-1)' }} /> {t('Now')}</span>
        <span><i style={{ background: 'var(--series-2)' }} /> {t('With plan')}</span>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rows.map((r) => `${r.label}: ${zar(r.now)} now, ${zar(r.plan)} with plan`).join('. ')} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
              <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="tick">{zar(v)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = pad.l + slot * i + slot / 2
            const a = cx - bw - gap / 2
            const b = cx + gap / 2
            return (
              <g key={r.label} onPointerEnter={() => setHover({ i, cx, top: y(Math.max(r.now, r.plan)) })}>
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
                <path d={col(a, r.now)} className="bar s1" />
                <path d={col(b, r.plan)} className="bar s2" />
                <text x={a + bw / 2} y={y(r.now) - 5} textAnchor="middle" className="label">{zar(r.now)}</text>
                <text x={b + bw / 2} y={y(r.plan) - 5} textAnchor="middle" className="label">{zar(r.plan)}</text>
                <text x={cx} y={H - 8} textAnchor="middle" className="tick">{r.label}</text>
              </g>
            )
          })}
        </svg>
        <Tip
          tip={hover && { x: hover.cx, y: hover.top - 22, lines: [rows[hover.i].label, `Now ${zar(rows[hover.i].now)}`, `With plan ${zar(rows[hover.i].plan)}`, `Saves ${zar(rows[hover.i].now - rows[hover.i].plan)} a month`] }}
          h={H}
        />
      </div>
      <button className="link" onClick={() => setTable(true)}>{t('Show as table')}</button>
    </div>
  )
}
