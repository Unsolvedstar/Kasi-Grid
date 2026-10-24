// A writing box that helps: a ring that fills as you type, and tap-to-add phrases for what neighbours usually report.
export default function Compose({ value, onChange, max = 280, rows = 2, placeholder, label, suggestions = [] }) {
  const frac = Math.min(1, value.length / max)
  const R = 11
  const C = 2 * Math.PI * R
  const add = (s) => {
    navigator.vibrate?.(8)
    const base = value.trim().replace(/[.!?]$/, '')
    onChange((base ? `${base}. ${s}` : s).slice(0, max))
  }
  const shared = { maxLength: max, placeholder, value, 'aria-label': label || placeholder, onChange: (e) => onChange(e.target.value) }
  return (
    <div className={`compose ${frac > 0.9 ? 'hot' : ''}`}>
      <div className="compose-box">
        {rows > 1 ? <textarea rows={rows} {...shared} /> : <input {...shared} />}
        <svg className="ring" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r={R} className="ring-bg" />
          <circle cx="14" cy="14" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 14 14)" />
        </svg>
        <span className="vh" role="status">{max - value.length} characters left</span>
      </div>
      {suggestions.length > 0 && (
        <div className="compose-chips">
          {suggestions.map((s) => <button type="button" key={s} onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
    </div>
  )
}
