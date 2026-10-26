import { useEffect, useRef, useState } from 'react'
import Wizard from '../components/Wizard.jsx'
import Compose from '../components/Compose.jsx'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n.jsx'
import Map from '../components/Map.jsx'
import { REPORT_TYPES } from '../data.js'
import { CITIES, around, findSuburb } from '../../shared/suburbs.js'
import PinPicker from '../components/PinPicker.jsx'
import AreaPicker from '../components/AreaPicker.jsx'
import { fmtSlot, slotsToIcs, timeAgo, waLink, waterStatus, WATER, CONFIRM_THRESHOLD } from '../lib.js'

const SUGGEST = {
  power: ['Transformer humming or sparking', 'Whole street is dark', 'Cable down', 'Lights flickering'],
  water: ['No water since this morning', 'Very low pressure', 'Burst pipe', 'Water is brown'],
  road: ['Road is flooded', 'Big pothole', 'Robot not working', 'Taxi rank blocked'],
  other: ['Rubbish not collected', 'Streetlight is out', 'Someone needs help'],
}

export default function Alerts({ suburb, stage, isLive, live, cityStage, slots, official, schedule, chosenArea, setArea, reports, actions, setSuburbId, draft, setDraft }) {
  const t = useT()
  const [form, setForm] = useState({ type: 'power', text: '' })
  const [pin, setPin] = useState(null)
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
  const areaMarkers = around(suburb, reports.map((r) => r.suburb)).map((s) => {
    const w = WATER[waterStatus(reports, s.id)]
    return { id: s.id, lat: s.lat, lng: s.lng, color: w.color, label: `${s.name}: ${t(w.label)}`, selected: s.id === suburb.id }
  })
  // Reports that carry an exact pin show on the map at that spot.
  const PIN_COLOR = { power: '#f59e0b', water: '#2f80ed', road: '#8b5cf6', other: '#e11d48' }
  const pinMarkers = reports.filter((r) => r.lat != null && (r.suburb === suburb.id || areaMarkers.some((m) => m.id === r.suburb))).map((r) => ({
    id: 'p' + r.id, lat: r.lat, lng: r.lng, color: PIN_COLOR[r.type] || '#e11d48', label: `${t(REPORT_TYPES[r.type].label)}: ${r.text}`, pin: true,
  }))
  const markers = [...areaMarkers, ...pinMarkers]

  const downloadCalendar = () => {
    const ics = slotsToIcs(slots, { area: schedule.area?.name || suburb.name, official, stage })
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kasi-grid-loadshedding.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const [wk, setWk] = useState(0)
  const submit = async () => {
    if (!form.text.trim() || busy) return
    setBusy(true)
    try {
      await actions.addReport({ suburb: suburb.id, type: form.type, text: form.text, ...(pin ? { lat: pin.lat, lng: pin.lng, acc: pin.acc } : {}) })
      setForm({ ...form, text: '' })
      setPin(null)
      setErr('')
      setWk((n) => n + 1)
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }

  return (
    <>
      <section className="grid2">
        <div className={`card status ${offNow ? 'bad' : 'good'}`}>
          <h2><Icon name="zap" /> {t('Electricity in {name}', { name: suburb.name })}</h2>
          {stage === 0 ? (
            <p className="big">{isLive && live.status !== 'ok' ? t('Status unavailable') : t('No loadshedding right now')}</p>
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
          {stage === 0 && <p className="muted small">{t('Your power can still be off without loadshedding: load reduction, cable theft or a fault. Report it below so neighbours can confirm it.')}</p>}
          {slots.length > 0 && <button type="button" className="ghost" onClick={downloadCalendar}><Icon name="calendar" /> {t('Add outages to my calendar')}</button>}
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

        <div className="card status" style={{ borderColor: WATER[water].css }}>
          <h2><Icon name="droplet" /> {t('Water in {name}', { name: suburb.name })}</h2>
          <p className="big" style={{ color: WATER[water].css }}>{t(WATER[water].label)}</p>
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
        <div ref={formRef}>
          <Wizard
            key={wk}
            finishLabel={t('Send report')}
            busy={busy}
            error={err}
            onFinish={submit}
            steps={[
              {
                id: 'type', title: t('What kind of problem?'), valid: true,
                content: (
                  <div className="chips">
                    {Object.entries(REPORT_TYPES).map(([k, v]) => (
                      <button type="button" key={k} aria-pressed={form.type === k} className={form.type === k ? 'chip on' : 'chip'} onClick={() => setForm({ ...form, type: k })}>
                        <Icon name={v.icon} /> {t(v.label)}
                      </button>
                    ))}
                  </div>
                ),
              },
              {
                id: 'what', title: t('What did you see?'), hint: t('Say where it is: a street or landmark helps neighbours confirm it.'), valid: !!form.text.trim(),
                content: <Compose max={280} rows={3} placeholder={t('What did you see? Where? (street or landmark)')} value={form.text} onChange={(text) => setForm({ ...form, text })} suggestions={(SUGGEST[form.type] || []).map((x) => t(x))} />,
              },
              {
                id: 'where', title: t('Pin the exact spot (optional)'), hint: t('A pin shows neighbours and the municipality exactly where to look.'), valid: true,
                content: <PinPicker suburb={suburb} value={pin} onChange={setPin} />,
              },
            ]}
          />
        </div>
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
                <ReportRow key={r.id} r={r} actions={actions} run={run} area={findSuburb(r.suburb)?.name} />
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
          <strong><Icon name={REPORT_TYPES[r.type].icon} /> {area ? area + ': ' : ''}</strong>
          {r.text}
        </p>
        <p className="muted small">
          {r.author && <><strong>{r.mine ? t('You') : r.author}</strong> · </>}{timeAgo(r.ts, t)} · {t('confirmed by {n}', { n: r.confirms })}
          {isConfirmed && <span className="badge ok">{t('Confirmed')}</span>}
          {r.sample && <span className="badge sample">{t('Sample')}</span>}
          {r.confirmedBy?.length > 0 && <span className="muted small"> · {t('Also: {names}', { names: r.confirmedBy.slice(0, 4).join(', ') + (r.confirmedBy.length > 4 ? ' +' + (r.confirmedBy.length - 4) : '') })}</span>}
          {r.lat != null && <span className="badge"><Icon name="pin" /> {t('Pinned')}</span>}
          {' · '}<a href={waLink(`Kasi Grid${area ? ', ' + area : ''}: ${REPORT_TYPES[r.type].label} problem. ${r.text} (${r.confirms} neighbours confirmed) ${window.location.origin}`)} target="_blank" rel="noreferrer">{t('Share')}</a>
          {!r.mine && <> · <button className="link" onClick={() => run(actions.flag('reports', r.id))}>{t('Report')}</button></>}
        </p>
      </div>
      <button className="ghost" disabled={r.confirmedByMe} onClick={() => run(actions.confirmReport(r.id))}>{r.mine ? t('Yours') : r.confirmedByMe ? t('Confirmed') : t('Me too')}</button>
    </li>
  )
}
