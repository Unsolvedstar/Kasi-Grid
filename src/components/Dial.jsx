// A number you set by feel: drag the glowing track, tap a typical value, or type it. Used where a plain number box makes
// people guess (watts, watt-hours, charge). glyph="battery" draws the level as a battery filling up.
export default function Dial({ label, value, onChange, min = 0, max = 100, step = 1, unit = '', presets = [], tone = '', glyph, hint }) {
  const has = value !== '' && value != null && !Number.isNaN(Number(value))
  const num = has ? Number(value) : ''
  const pct = has ? Math.min(100, Math.max(0, ((num - min) / (max - min)) * 100)) : 0
  const tap = (v) => { navigator.vibrate?.(8); onChange(v) }
  return (
    <div className={`setter ${tone}`}>
      <div className="setter-top">
        <span className="setter-label">{label}</span>
        <span className="setter-read">
          <input type="number" inputMode="numeric" aria-label={label} min={min} value={num} placeholder="0" onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(min, Number(e.target.value)))} />
          {unit && <em>{unit}</em>}
        </span>
      </div>
      {glyph === 'battery' && (
        <div className="setter-batt" aria-hidden="true"><i style={{ width: `${pct}%` }} className={pct < 25 ? 'low' : ''} /></div>
      )}
      <input type="range" aria-label={label} min={min} max={max} step={step} value={has ? Math.min(max, Math.max(min, num)) : min} style={{ '--fill': `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      {presets.length > 0 && (
        <div className="setter-presets">
          {presets.map((p) => <button type="button" key={p.label} className={num === p.value ? 'on' : ''} onClick={() => tap(p.value)}>{p.label}</button>)}
        </div>
      )}
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}
