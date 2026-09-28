import { useState } from 'react'
import { useT } from '../i18n.jsx'
import { searchAreas, useAreaOptions } from '../live.js'

// Lets a person pick the loadshedding area (block) that matches their street. Townships span several blocks, so the
// suburb's default may not be theirs. Shown only when official schedules are switched on.
export default function AreaPicker({ suburb, schedule, chosen, setArea }) {
  const t = useT()
  const enabled = schedule.available || schedule.reason === 'unmapped'
  const [open, setOpen] = useState(false)
  const options = useAreaOptions(suburb, enabled && open)
  const [text, setText] = useState('')
  const [found, setFound] = useState([])
  const [msg, setMsg] = useState('')
  if (!enabled) return null

  const currentId = chosen?.id || options.default || schedule.area?.id || ''
  const pick = (a) => {
    setArea(a.id === options.default ? null : { id: a.id, name: a.name })
    setOpen(false)
  }
  const search = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      const areas = await searchAreas(suburb.id, text)
      setFound(areas)
      if (!areas.length) setMsg('No areas found')
    } catch (x) {
      setFound([])
      setMsg(x.message)
    }
  }
  const list = [...options.areas, ...found.filter((f) => !options.areas.some((a) => a.id === f.id))]

  return (
    <div className="picker">
      {!open ? (
        <button type="button" className="ghost" onClick={() => setOpen(true)}>{t('Not your block? Change area')}</button>
      ) : (
        <div className="stack">
          <label>
            {t('Pick the area closest to your home')}
            <select value={currentId} onChange={(e) => { const a = list.find((x) => x.id === e.target.value); if (a) pick(a) }}>
              {!list.some((a) => a.id === currentId) && <option value={currentId}>{chosen?.name || schedule.area?.name || '…'}</option>}
              {list.map((a) => <option key={a.id} value={a.id}>{a.name}{a.region ? ` (${a.region.split(',')[0]})` : ''}</option>)}
            </select>
          </label>
          <form className="form inline" onSubmit={search}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Or search by name')} aria-label={t('Or search by name')} maxLength={40} />
            <button className="primary" disabled={text.trim().length < 2}>{t('Search')}</button>
          </form>
          {msg && <p className="muted small" role="status">{msg}</p>}
          {chosen && <button type="button" className="ghost" onClick={() => { setArea(null); setOpen(false) }}>{t('Use the suburb default')}</button>}
        </div>
      )}
    </div>
  )
}
