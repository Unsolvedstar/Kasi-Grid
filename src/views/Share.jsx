import { useState } from 'react'
import Compose from '../components/Compose.jsx'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n.jsx'
import { SHARE_CATEGORIES } from '../data.js'
import { findSuburb } from '../../shared/suburbs.js'
import PinPicker from '../components/PinPicker.jsx'
import { timeAgo, waLink } from '../lib.js'

const EMPTY = { kind: 'offer', category: 'power', title: '', detail: '', name: '' }

const OFFERS = ['Phone charging', 'Boiled water', 'A lift to the clinic', 'Fridge space for medicine']
const ASKS = ['Need phone charging', 'Need drinking water', 'Need a lift to the clinic', 'Need cold storage for medicine']

export default function Share({ suburb, shares, actions }) {
  const t = useT()
  const [form, setForm] = useState(EMPTY)
  const [pin, setPin] = useState(null)
  const [scope, setScope] = useState('mine')
  const [kind, setKind] = useState('all')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const visible = shares
    .filter((s) => scope === 'all' || s.suburb === suburb.id)
    .filter((s) => kind === 'all' || s.kind === kind)

  const run = (p) => p.then(() => setErr('')).catch((e) => setErr(e.message))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || busy) return
    setBusy(true)
    try {
      await actions.addShare({ ...form, suburb: suburb.id, ...(pin ? { lat: pin.lat, lng: pin.lng, acc: pin.acc } : {}) })
      setForm(EMPTY)
      setPin(null)
      setScope('mine')
      setErr('')
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }

  return (
    <>
      <section className="card">
        <h2>{t('Offer or ask for help in {name}', { name: suburb.name })}</h2>
        <form className="form" onSubmit={submit}>
          <div className="chips">
            <button type="button" aria-pressed={form.kind === 'offer'} className={form.kind === 'offer' ? 'chip on' : 'chip'} onClick={() => setForm({ ...form, kind: 'offer' })}>{t('I can offer')}</button>
            <button type="button" aria-pressed={form.kind === 'request'} className={form.kind === 'request' ? 'chip on' : 'chip'} onClick={() => setForm({ ...form, kind: 'request' })}>{t('I need')}</button>
          </div>
          <div className="fields">
            <label>{t('Category')}
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(SHARE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
              </select>
            </label>
            <label>{t('Your first name')}
              <input value={form.name} maxLength={30} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('Optional')} />
            </label>
          </div>
          <Compose max={100} rows={1} placeholder={form.kind === 'offer' ? 'e.g. Phone charging, 2 hours a day' : 'e.g. Need a lift to the clinic on Friday'} value={form.title} onChange={(title) => setForm({ ...form, title })} suggestions={(form.kind === 'offer' ? OFFERS : ASKS).map((x) => t(x))} />
          <Compose max={400} rows={2} placeholder="Details: where, when, what to bring. Meet in a public place. Phone numbers and links are not allowed, people reply through the board." value={form.detail} onChange={(detail) => setForm({ ...form, detail })} />
          <PinPicker suburb={suburb} value={pin} onChange={setPin} />
          <p className="muted small">{t('Neighbours see your pin only to about 100 metres, so your home is not given away.')}</p>
          {err && <p className="notice" role="alert">{err}</p>}
          <button className="primary" disabled={!form.title.trim() || busy}>{busy ? t('Posting…') : t('Post to the board')}</button>
        </form>
      </section>

      <section className="card">
        <div className="bar">
          <h2>{t('Community board')}</h2>
          <div className="chips">
            <button aria-pressed={scope === 'mine'} className={scope === 'mine' ? 'chip on' : 'chip'} onClick={() => setScope('mine')}>{suburb.name}</button>
            <button aria-pressed={scope === 'all'} className={scope === 'all' ? 'chip on' : 'chip'} onClick={() => setScope('all')}>{t('All areas')}</button>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('Filter by offers or requests')}>
              <option value="all">{t('Offers & requests')}</option>
              <option value="offer">{t('Offers')}</option>
              <option value="request">{t('Requests')}</option>
            </select>
          </div>
        </div>
        {visible.length === 0 && <p className="muted">{t('Nothing here yet. Be the first to post.')}</p>}
        <ul className="list">
          {visible.map((s) => (
            <li key={s.id} className="row">
              <div>
                <p>
                  <span className={`badge ${s.kind === 'offer' ? 'ok' : 'ask'}`}>{s.kind === 'offer' ? t('Offer') : t('Need')}</span>{' '}
                  {s.sample && <><span className="badge sample" style={{ marginLeft: 0 }}>{t('Sample')}</span>{' '}</>}
                  <strong><Icon name={SHARE_CATEGORIES[s.category].icon} /> {s.title}</strong>
                </p>
                {s.detail && <p>{s.detail}</p>}
                <p className="muted small">
                  {s.name} · {findSuburb(s.suburb)?.name} · {timeAgo(s.ts, t)} · {t('{n} interested', { n: s.interested })}
                  {' · '}<a href={waLink(`${s.kind === 'offer' ? 'Offer' : 'Request'} on Kasi Grid (${findSuburb(s.suburb)?.name}): ${s.title}. ${window.location.origin}`)} target="_blank" rel="noreferrer">{t('Share')}</a>
                  {!s.mine && <> · <button className="link" onClick={() => run(actions.flag('shares', s.id))}>{t('Report')}</button></>}
                </p>
              </div>
              <div className="stack">
                <button className="ghost" disabled={s.interestedByMe || s.mine} onClick={() => run(actions.interested(s.id))}>
                  {s.interestedByMe ? t('Noted') : s.kind === 'offer' ? t("I'm interested") : t('I can help')}
                </button>
                {s.mine && <button className="ghost" onClick={() => run(actions.closeShare(s.id))}>{t('Mark done')}</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
