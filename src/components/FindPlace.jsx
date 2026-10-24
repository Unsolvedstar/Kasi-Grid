import { useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { searchPlaces } from '../places.js'

// Search for any town, suburb or street in South Africa and join the community there.
export default function FindPlace({ onPick }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault()
    if (q.trim().length < 3 || busy) return
    setBusy(true)
    setMsg('')
    try {
      const r = await searchPlaces(q.trim())
      setFound(r)
      if (!r.length) setMsg('No place found in South Africa. Try the suburb or town name.')
    } catch (x) {
      setFound([])
      setMsg(x.message)
    }
    setBusy(false)
  }
  if (!open) return <button type="button" className="ghost" onClick={() => setOpen(true)}><Icon name="eye" /> {t('Find any place')}</button>
  return (
    <div className="find-place">
      <form className="form inline" onSubmit={go}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Town, suburb or street')} aria-label={t('Town, suburb or street')} maxLength={80} autoFocus />
        <button className="primary" disabled={q.trim().length < 3 || busy}>{busy ? '…' : t('Search')}</button>
        <button type="button" className="ghost" onClick={() => setOpen(false)} aria-label={t('Close')}><Icon name="close" /></button>
      </form>
      {msg && <p className="muted small" role="status">{t(msg)}</p>}
      <ul className="list">
        {found.map((p, i) => (
          <li key={i} className="row">
            <div><strong>{p.name}</strong><p className="muted small">{p.where}</p></div>
            <button className="ghost" onClick={() => { onPick(p); setOpen(false); setFound([]); setQ('') }}>{t('Join')}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
