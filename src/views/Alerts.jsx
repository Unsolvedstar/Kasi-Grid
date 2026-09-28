import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n.jsx'
import Map from '../components/Map.jsx'
import { SUBURBS, REPORT_TYPES } from '../data.js'
import { CITIES } from '../../shared/suburbs.js'
import AreaPicker from '../components/AreaPicker.jsx'
import { fmtSlot, timeAgo, waLink, waterStatus, WATER, CONFIRM_THRESHOLD } from '../lib.js'

export default function Alerts({ suburb, stage, isLive, live, cityStage, slots, official, schedule, chosenArea, setArea, reports, actions, setSuburbId, draft, setDraft }) {
  const t = useT()
  const [form, setForm] = useState({ type: 'power', text: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  // A report started elsewhere (for example "Report a flooded road" on the Today tab) pre-fills the form.
  useEffect(() => {
    if (!draft) return
    setForm({ type: draft.type, text: draft.text })
    setDraft(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [draft, setDraft])
  const run = (p) => p.then(() => setErr('')).catch((e) => setErr(e.message))
  const now = new Date()
  const offNow = slots.find((s) => s.start <= now && s.end > now)
  const next = slots.find((s) => s.start > now)
  const local = reports.filter((r) => r.suburb === suburb.id).sort((a, b) => b.ts - a.ts)
  const others = reports.filter((r) => r.suburb !== suburb.id).sort((a, b) => b.ts - a.ts).slice(0, 4)

  const water = waterStatus(reports, suburb.id)
  const markers = SUBURBS.filter((s) => s.city === suburb.city).map((s) => {
    const w = WATER[waterStatus(reports, s.id)]
    return { id: s.id, lat: s.lat, lng: s.lng, color: w.color, label: `${s.name}: ${t(w.label)}`, selected: s.id === suburb.id }
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.text.trim() || busy) return
    setBusy(true)
    try {
      await actions.addReport({ suburb: suburb.id, type: form.type, text: form.text })
      setForm({ ...form, text: '' })
      setErr('')
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }

  return (
    <>
      <section className="grid2">
        <div className={`card status ${offNow ? 'bad' : 'good'}`}>
          <h2>⚡ {t('Electricity in {name}', { name: suburb.name })}</h2>
          {stage === 0 ? (
            <p className="big">{isLive && live.status !== 'ok' ? 'Live status unavailable' : t('No loadshedding right now')}</p>
          ) : offNow ? (
            <>
              <p className="big">Power should be off until {String(offNow.end.getHours() % 24).padStart(2, '0')}:00</p>
              <p className="muted">Charge phones and fill water containers before the next slot.</p>
            </>
          ) : (
            <p className="big">Power should be on{next ? `. ${fmtSlot(next, t)}` : ''}</p>
          )}
          {slots.length > 0 && (
            <ul className="slots">
              {slots.slice(0, 6).map((s, i) => (
                <li key={i}>{fmtSlot(s, t)}</li>
              ))}
            </ul>
          )}
          <p className="muted small">
            {isLive
              ? live.status === 'ok' ? (live.city ? `Live stage from ${live.city}.` : 'Live stage from Eskom.') : 'Could not reach Eskom, showing no loadshedding.'
              : `Simulated stage ${stage}.`}{' '}
            {stage > 0 && (official
              ? `Official time slots for ${schedule.area?.name || suburb.name} from EskomSePush${schedule.stale ? ' (may be out of date)' : ''}. Parts of a township can be on different blocks, so check your exact area in the EskomSePush app.`
              : 'The time slots are an illustrative pattern for planning, not your official schedule.')}{' '}
            {CITIES[suburb.city]?.ownLoadshedding && !live.city && "Cape Town sets its own loadshedding stage, which can differ from Eskom's. Check the City of Cape Town announcements. "}
            Get your real schedule at <a href="https://loadshedding.eskom.co.za" target="_blank" rel="noreferrer">loadshedding.eskom.co.za</a> or from your municipality.
          </p>
          <AreaPicker suburb={suburb} schedule={schedule} chosen={chosenArea} setArea={setArea} />
        </div>

        <div className="card status" style={{ borderTopColor: WATER[water].color }}>
          <h2>💧 {t('Water in {name}', { name: suburb.name })}</h2>
          <p className="big" style={{ color: WATER[water].color }}>{t(WATER[water].label)}</p>
          <p className="muted">There is no official public water-outage feed. This comes from reports by neighbours in the last 24 hours.</p>
          {water !== 'ok' && <p>Store drinking water now and avoid washing until supply returns.</p>}
          <p className="muted small">
            Report to the City: 0860 562 874 (Joburg Call Centre) or fault@jwater.co.za. Unofficial tracker:{' '}
            <a href="https://www.ourpower.co.za/water-outages/jhb-water" target="_blank" rel="noreferrer">OurPower</a>.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>{t('Water reports across the area')}</h2>
        <Map markers={markers} focus={suburb} onSelect={setSuburbId} />
        <div className="legend">
          {Object.values(WATER).map((w) => (
            <span key={w.label}><i style={{ background: w.color }} /> {t(w.label)}</span>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t('Report a problem in {name}', { name: suburb.name })}</h2>
        <form onSubmit={submit} className="form" ref={formRef}>
          <div className="chips">
            {Object.entries(REPORT_TYPES).map(([k, v]) => (
              <button type="button" key={k} className={form.type === k ? 'chip on' : 'chip'} onClick={() => setForm({ ...form, type: k })}>
                {v.icon} {t(v.label)}
              </button>
            ))}
          </div>
          <textarea rows="2" maxLength={280} placeholder={t('What did you see? Where? (street or landmark)')} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          {err && <p className="notice" role="alert">{err}</p>}
          <button className="primary" disabled={!form.text.trim() || busy}>{busy ? t('Sending…') : t('Send report')}</button>
        </form>
        <p className="muted small">When {CONFIRM_THRESHOLD}+ neighbours confirm, a report is marked Confirmed and can be escalated to the municipality.</p>
      </section>

      <section className="card">
        <h2>{t('Reports in {name}', { name: suburb.name })}</h2>
        {local.length === 0 && <p className="muted">No reports. All quiet.</p>}
        <ul className="list">
          {local.map((r) => <ReportRow key={r.id} r={r} actions={actions} run={run} />)}
        </ul>
        {others.length > 0 && (
          <>
            <h3>{t('Elsewhere')}</h3>
            <ul className="list">
              {others.map((r) => (
                <ReportRow key={r.id} r={r} actions={actions} run={run} area={SUBURBS.find((s) => s.id === r.suburb)?.name} />
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}

function ReportRow({ r, actions, run, area }) {
  const t = useT()
  const isConfirmed = r.confirms >= CONFIRM_THRESHOLD
  return (
    <li className="row">
      <div>
        <p>
          <strong>{REPORT_TYPES[r.type].icon} {area ? area + ': ' : ''}</strong>
          {r.text}
        </p>
        <p className="muted small">
          {timeAgo(r.ts, t)} · {t('confirmed by {n}', { n: r.confirms })}
          {isConfirmed && <span className="badge ok">{t('Confirmed')}</span>}
          {r.sample && <span className="badge sample">{t('Sample')}</span>}
          {' · '}<a href={waLink(`Kasi Grid${area ? ', ' + area : ''}: ${REPORT_TYPES[r.type].label} problem. ${r.text} (${r.confirms} neighbours confirmed) ${window.location.origin}`)} target="_blank" rel="noreferrer">{t('Share')}</a>
          {!r.mine && <> · <button className="link" onClick={() => run(actions.flag('reports', r.id))}>{t('Report')}</button></>}
        </p>
      </div>
      <button className="ghost" disabled={r.confirmedByMe} onClick={() => run(actions.confirmReport(r.id))}>{r.mine ? t('Yours') : r.confirmedByMe ? t('Confirmed') : t('Me too')}</button>
    </li>
  )
}
