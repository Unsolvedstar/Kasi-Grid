import { useCallback, useEffect, useMemo, useState } from 'react'
import Dial from '../components/Dial.jsx'
import Icon from '../components/Icon.jsx'
import { api, useForecast } from '../api.js'
import { useT } from '../i18n.jsx'
import { timeAgo, useLocalStorage, zar } from '../lib.js'
import { DAYS } from '../../shared/forecast.js'
import { CHEMISTRY, EMERGENCY, EQUIPMENT, MAX_HOURS, MIN_HOURS, SERVICES, URGENT_FEE, isDelivery, pickupsFor, quote } from '../../shared/care.js'
import { batteryIcs, useBattery } from '../battery.js'
import { loadContact, saveContact } from '../emergency.js'

const STATUS = {
  awaiting_prescription: { label: 'Waiting for prescription approval', tone: 'sample' },
  offered: { label: 'Offered to nearby carers', tone: 'sample' },
  accepted: { label: 'Confirmed', tone: 'ok' },
  done: { label: 'Done', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'sample' },
  unfilled: { label: 'No carer available', tone: 'sample' },
}
const CARE_SERVICES = ['meds', 'oxygen', 'companion', 'postop', 'personal', 'equipment']
const O2_ITEMS = ['swap', 'cyl']
// datetime-local wants local time without a zone.
const localInput = (ms) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}
const fmtStart = (ms) => new Date(ms).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Care({ suburb, incidents = [], care, setCare }) {
  const t = useT()
  const [bookings, setBookings] = useState([])
  const [loadErr, setLoadErr] = useState('')
  const load = useCallback(() => api('/care/bookings').then((d) => { setBookings(d.bookings); setLoadErr('') }).catch((e) => setLoadErr(e.message)), [])
  useEffect(() => {
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [load])

  return (
    <>
      <OutageBanner suburb={suburb} incidents={incidents} onOxygen={() => setCare({ service: 'oxygen', equipment: ['swap'], urgent: true })} />
      <PowerPlan suburb={suburb} incidents={incidents} onGetBackup={() => setCare({ service: 'equipment', equipment: ['bat'] })} />
      <Book suburb={suburb} preset={care} clearPreset={() => setCare(null)} onBooked={load} />
      <section className="card">
        <h2>{t('Your bookings')}</h2>
        {loadErr && <p className="notice" role="alert">{loadErr}</p>}
        {bookings.length === 0 && !loadErr && <p className="muted">{t('No bookings yet.')}</p>}
        <ul className="list">
          {bookings.map((b) => <BookingRow key={b.id} b={b} reload={load} />)}
        </ul>
      </section>
      <p className="muted small">{t('Prices, runners, carers, pickup points and payments in this tab are samples for the demo. Payments are not connected yet, equipment prices must be confirmed with a supplier, and a runner only carries sealed, pharmacy-packed medicine and cylinders handed over by a licensed supplier.')}</p>
    </>
  )
}

// A verified power cut is the moment households on a concentrator need a cylinder, so offer an urgent delivery in one tap.
function OutageBanner({ suburb, incidents, onOxygen }) {
  const t = useT()
  const power = incidents.find((i) => i.suburb === suburb.id && i.type === 'power' && !i.resolved)
  if (!power) return null
  return (
    <section className="card pulse bad" role="status">
      <h2><Icon name="zap" /> {t('Power is out in {name}', { name: suburb.name })}</h2>
      <p>{t('If someone at home uses an oxygen concentrator, switch to a cylinder now. We can send one with a nearby runner.')}</p>
      <button className="primary" onClick={onOxygen}><Icon name="truck" /> {t('Get an oxygen cylinder now')}</button>
    </section>
  )
}

// Biomedical angle: how long a household's medical device keeps running on its battery, counted down live against the
// real time on battery, with alerts and the ambulance one tap away. Everything stays on the phone.
function PowerPlan({ suburb, incidents, onGetBackup }) {
  const t = useT()
  const b = useBattery()
  const { plan, track, status, stage, due } = b
  const f = useForecast(suburb.id, incidents.length)
  const [reading, setReading] = useState('')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const runtime = b.runtime
  const power = incidents.find((i) => i.suburb === suburb.id && i.type === 'power' && !i.resolved)
  const outHours = power ? Math.max(0, (Date.now() - power.since) / 3600000) : 0
  const fp = f?.power
  const dur = f?.duration?.power
  const when = fp?.pattern ? (fp.next?.now ? t('{band} today', { band: t(fp.band) }) : `${t(DAYS[fp.dow])} ${t(fp.band)}`) : null
  const fmt = (h) => (h >= 1 ? `${h.toFixed(1)} ${t('hours')}` : `${Math.max(1, Math.round(h * 60))} min`)
  const set = (k, v) => b.setPlan({ [k]: v })
  const dod = Math.round((CHEMISTRY[plan.chemistry]?.dod ?? 0.85) * 100)
  const eff = plan.inverter === false ? 95 : 85
  const pct = status && b.full > 0 ? Math.max(0, Math.min(100, (status.left / b.full) * 100)) : 0
  const enable = async () => setPerm(await Notification.requestPermission())
  const alarms = () => {
    const url = URL.createObjectURL(new Blob([batteryIcs(Date.now() + status.left * 3600000)], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kasi-grid-battery-alarms.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const sourceText = status && ({
    model: t('Counted from when you switched to battery, using your device and battery numbers.'),
    reading: t('Restarted from your last reading of the battery display.'),
    measured: t('Measured from your readings: the battery is draining about {r}% an hour.', { r: Math.round(status.rate) }),
  })[status.source]

  return (
    <section className={`card ${power || due ? 'pulse bad' : ''}`}>
      <h2><Icon name="health" /> {t('Medical power plan')}</h2>
      <p className="muted small">{t('For a household that depends on power for oxygen, a nebuliser, CPAP or medicine that must stay cold. Find the watts on the device label and the watt-hours on the battery. This stays on your phone and is not medical advice.')}</p>
      <div className="fields">
        <Dial tone="power" label={t('Device power (watts)')} unit="W" value={plan.watts} onChange={(v) => set('watts', v)} min={0} max={500} step={5}
          presets={[{ label: t('CPAP about 40'), value: 40 }, { label: t('Nebuliser about 100'), value: 100 }, { label: t('Concentrator about 300'), value: 300 }]} hint={t('Typical values. The label on your device is more accurate.')} />
        <Dial tone="water" label={t('Battery size (watt-hours)')} unit="Wh" value={plan.wh} onChange={(v) => set('wh', v)} min={0} max={3000} step={50}
          presets={[{ label: '300', value: 300 }, { label: '500', value: 500 }, { label: '1000', value: 1000 }, { label: '2000', value: 2000 }]} />
        <Dial glyph="battery" label={t('Charged to (%)')} unit="%" value={plan.charge} onChange={(v) => set('charge', v)} min={0} max={100} step={1}
          presets={[{ label: '25%', value: 25 }, { label: '50%', value: 50 }, { label: '75%', value: 75 }, { label: '100%', value: 100 }]} />
        <Dial label={t('Battery health (%)')} unit="%" value={plan.health} onChange={(v) => set('health', v)} min={10} max={100} step={1}
          presets={[{ label: t('New 100'), value: 100 }, { label: t('Used 85'), value: 85 }, { label: t('Old 70'), value: 70 }]} />
        <label>{t('Battery type')}
          <select value={plan.chemistry} onChange={(e) => set('chemistry', e.target.value)}>
            {Object.entries(CHEMISTRY).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
          </select>
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={plan.inverter !== false} onChange={(e) => set('inverter', e.target.checked)} /> {t('The device plugs into a plug-in power station or inverter (not straight from the battery)')}</label>
      <label className="check"><input type="checkbox" checked={!!plan.lifeSupport} onChange={(e) => set('lifeSupport', e.target.checked)} /> {t('Someone cannot be without this device (life support). Warn me to call the ambulance earlier.')}</label>

      {runtime > 0 ? (
        <>
          <p className="big">{t('From {c}% your battery runs it for about {h}.', { c: Math.round(Number(plan.charge) || 0), h: fmt(runtime) })}</p>
          <p className="muted small">{t('Counts {h}% battery health, {d}% of the battery usable and {e}% efficiency. Real use can differ, so log the battery display below for a measured figure.', { h: Math.round(Number(plan.health) || 100), d: dod, e: eff })}</p>

          {!track ? (
            <div className="batt-start">
              {power && <button className="primary" onClick={() => b.start(power.since)}>{t('Power went off {h} ago: start counting from then', { h: fmt(outHours) })}</button>}
              <button className={power ? 'ghost' : 'primary'} onClick={() => b.start()}><Icon name="battery" /> {t('Switched to battery now: start counting')}</button>
            </div>
          ) : (
            <div className={`batt-live ${stage}`} role="status">
              <p className="big">{stage === 'empty' ? t('The battery should be empty') : t('About {h} of battery left', { h: fmt(status.left) })}</p>
              <div className="batt-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
              <p className="muted small">{sourceText}</p>
              <form className="form inline" onSubmit={(e) => { e.preventDefault(); if (reading !== '') { b.addReading(reading); setReading('') } }}>
                <input type="number" min="0" max="100" inputMode="numeric" value={reading} onChange={(e) => setReading(e.target.value)} placeholder={t('Battery shows (%)')} aria-label={t('What the battery display shows, in percent')} />
                <button className="ghost" disabled={reading === ''}>{t('Log reading')}</button>
              </form>
              <div className="batt-actions">
                <button className="ghost" onClick={alarms}><Icon name="calendar" /> {t('Add alarms to my calendar')}</button>
                {perm !== 'granted' && typeof Notification !== 'undefined' && <button className="ghost" onClick={enable}><Icon name="bell" /> {t('Allow alerts')}</button>}
                <button className="ghost" onClick={b.stop}><Icon name="check" /> {t('Power is back / battery recharged')}</button>
              </div>
              <p className="muted small">{t('Alerts sound at 2 hours, 1 hour, 30 minutes and when empty. Keep this page open or add the calendar alarms, because a phone can pause web pages in the background.')}</p>
            </div>
          )}

          {power && <p role="status"><strong>{t('Verified power outage here for {h}.', { h: fmt(outHours) })}</strong></p>}
          {when && <p className="muted small">{t('Outages here are most likely {when}. Charge the battery before then.', { when })}</p>}
          {dur ? (
            <p className={runtime >= (dur.p80 ?? dur.median) ? 'muted small' : 'notice'}>
              {dur.p80 != null
                ? t('Past outages here usually last about {m}, and 1 in 5 last {p} or more ({n} outages).', { m: fmt(dur.median), p: fmt(dur.p80), n: dur.n })
                : t('Past outages here usually last about {m} ({n} outages so far).', { m: fmt(dur.median), n: dur.n })}{' '}
              {dur.p80 != null && runtime >= dur.p80 ? t('Your battery covers even a long one.') : runtime >= dur.median ? t(dur.p80 != null ? 'Your battery covers a typical outage but not a long one. Plan a backup.' : 'Your battery covers a typical outage. Keep a backup for a long one.') : t('Your battery is shorter than a typical outage here. Get a bigger battery or a backup.')}
            </p>
          ) : (
            runtime < 8 && <p className="muted small">{t('Many outages last longer than this. A bigger battery or a backup gives you more time.')}</p>
          )}
        </>
      ) : (
        <p className="muted small">{t('Enter the device watts and the battery watt-hours to see how long your battery lasts.')}</p>
      )}

      <EmergencyContact />
      <div className={`emergency ${due ? 'due' : ''}`}>
        <p><strong>{due ? t('Get help now') : t('In an emergency')}</strong></p>
        <div className="batt-actions">
          <a className={`call ${due ? 'primary' : 'ghost'}`} href={`tel:${EMERGENCY.ambulance}`}><Icon name="phone" /> {t('Call ambulance {n}', { n: EMERGENCY.ambulance })}</a>
          <a className="call ghost" href={`tel:${EMERGENCY.mobile}`}>{t('Or {n} from a mobile', { n: EMERGENCY.mobile })}</a>
          <button type="button" className="ghost" onClick={() => window.dispatchEvent(new Event('kg-card'))}>{t('Emergency card (no phone call needed)')}</button>
        </div>
      </div>
      <button className="ghost" onClick={onGetBackup}><Icon name="battery" /> {t('Get a battery backup')}</button>
    </section>
  )
}

// For people who cannot make a voice call: a trusted contact who gets a text with their location.
function EmergencyContact() {
  const t = useT()
  const [c, setC] = useState(loadContact)
  const set = (patch) => { const next = { ...c, ...patch }; setC(next); saveContact(next) }
  return (
    <details className="contact">
      <summary>{t('Emergency contact, for texting help without a call')}</summary>
      <div className="fields">
        <label>{t('Name')}<input value={c.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></label>
        <label>{t('Cell number')}<input type="tel" inputMode="tel" value={c.phone} maxLength={20} onChange={(e) => set({ phone: e.target.value })} autoComplete="off" /></label>
      </div>
      <label>{t('Anything a responder should know (optional)')}<input value={c.note} maxLength={120} onChange={(e) => set({ note: e.target.value })} placeholder={t('For example: I use sign language, oxygen at home')} /></label>
      <p className="muted small">{t('This stays on your phone. The card texts your contact your location only when you tap send.')}</p>
    </details>
  )
}

function Book({ suburb, preset, clearPreset, onBooked }) {
  const t = useT()
  const blank = { service: 'meds', hours: 4, pickup: '', urgent: false, start: localInput(Date.now() + 24 * 3600 * 1000), patient: '', needs: '', landmark: '', equipment: [] }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)
  useEffect(() => {
    if (!preset) return
    setF((x) => ({ ...x, ...preset }))
    setDone(null)
    clearPreset()
  }, [preset, clearPreset])

  const delivery = isDelivery(f.service)
  const pickups = useMemo(() => (delivery ? pickupsFor(f.service, suburb.id) : []), [delivery, f.service, suburb.id])
  const pickup = pickups.some((p) => p.id === f.pickup) ? f.pickup : pickups[0]?.id || ''
  const q = useMemo(() => {
    try {
      return quote({ service: f.service, hours: f.hours, equipment: f.equipment, suburb: suburb.id, pickup, urgent: f.urgent })
    } catch {
      return null
    }
  }, [f.service, f.hours, f.equipment, f.urgent, pickup, suburb.id])
  const needsCarer = f.service !== 'equipment' && !delivery
  const pickService = (k) => setF({ ...f, service: k, equipment: k === 'oxygen' ? ['swap'] : [], urgent: false })
  const toggle = (k) => setF({ ...f, equipment: f.equipment.includes(k) ? f.equipment.filter((x) => x !== k) : [...f.equipment, k] })

  const submit = async (e) => {
    e.preventDefault()
    if (!q || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await api('/care/bookings', { method: 'POST', body: { ...f, pickup, suburb: suburb.id, hours: needsCarer ? Number(f.hours) : 0, start: new Date(f.start).getTime() } })
      setDone(r)
      setF({ ...blank, service: f.service, equipment: f.service === 'oxygen' ? ['swap'] : [] })
      onBooked()
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }

  return (
    <section className="card">
      <h2>{t('Book a delivery, care or equipment in {name}', { name: suburb.name })}</h2>
      <form className="form" onSubmit={submit}>
        <div className="chips">
          {CARE_SERVICES.map((k) => (
            <button type="button" key={k} aria-pressed={f.service === k} className={f.service === k ? 'chip on' : 'chip'} onClick={() => pickService(k)}>
              {t(SERVICES[k].label)}
            </button>
          ))}
        </div>
        <p className="muted small">{t(SERVICES[f.service].note)}{needsCarer ? ` · ${zar(SERVICES[f.service].rate)} ${t('an hour')}` : ''}</p>
        {delivery && (
          <div className="fields">
            <label>{t('Collect from')}
              <select value={pickup} onChange={(e) => setF({ ...f, pickup: e.target.value })}>
                {pickups.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.km.toFixed(1)} km</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="fields">
          {needsCarer && (
            <label>{t('Hours')}
              <input type="number" min={MIN_HOURS} max={MAX_HOURS} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />
            </label>
          )}
          {!(delivery && f.urgent) && <label>{t(needsCarer ? 'Start' : 'Deliver on')}
            <input type="datetime-local" value={f.start} min={localInput(Date.now() + 3600 * 1000)} onChange={(e) => setF({ ...f, start: e.target.value })} required />
          </label>}
          <label>{t('Patient first name')}
            <input maxLength={40} value={f.patient} onChange={(e) => setF({ ...f, patient: e.target.value })} required />
          </label>
          <label>{t('Street or landmark')}
            <input maxLength={120} value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} required />
          </label>
        </div>
        <label className="stackfield">{t('Care needs (optional)')}
          <textarea rows="2" maxLength={280} value={f.needs} onChange={(e) => setF({ ...f, needs: e.target.value })} />
        </label>
        {delivery && (
          <label className="checks"><input type="checkbox" checked={f.urgent} onChange={(e) => setF({ ...f, urgent: e.target.checked })} /> {t('Urgent: send a runner now (adds {amount})', { amount: zar(URGENT_FEE) })}</label>
        )}
        {f.service !== 'meds' && <fieldset className="checks">
          <legend className="muted small">{t(delivery ? 'Cylinder' : 'Equipment')}</legend>
          {Object.entries(EQUIPMENT).filter(([k]) => (f.service === 'oxygen' ? O2_ITEMS.includes(k) : true)).map(([k, v]) => (
            <label key={k}>
              <input type="checkbox" checked={f.equipment.includes(k)} onChange={() => toggle(k)} /> {t(v.label)}
              <span className="muted small"> · {v.price != null ? zar(v.price) : t('price from supplier')}{v.rx ? ` · ${t('needs a prescription')}` : ''}</span>
            </label>
          ))}
        </fieldset>}
        {q && (
          <div className="notice" role="status">
            <strong>{t('Total {amount}', { amount: zar(q.total) })}</strong>
            {needsCarer && <> · {t('carer {amount}', { amount: zar(q.carer) })}</>}
            {delivery && <> · {t('delivery {amount} ({km} km)', { amount: zar(q.fee), km: q.km })}</>}
            {q.equipmentTotal > 0 && <> · {t('equipment {amount}', { amount: zar(q.equipmentTotal) })}</>}
            {q.quotedItems.length > 0 && <> · {t('{n} items priced by the supplier', { n: q.quotedItems.length })}</>}
            {q.needsPrescription && <p className="small">{t(f.service === 'meds' ? 'Medicine needs a valid prescription. The pharmacy checks it and packs it sealed. You pay the pharmacy for the medicine; the runner only carries the sealed pack.' : 'Oxygen needs a prescription. A clinician approves it before anything is sent.')}</p>}
          </div>
        )}
        {!q && f.service === 'equipment' && <p className="muted small">{t('Pick the equipment you need.')}</p>}
        {err && <p className="notice" role="alert">{err}</p>}
        {done && <p className="notice" role="status">{done.status === 'awaiting_prescription' ? t('Booked. We are waiting for the prescription to be approved.') : done.status === 'unfilled' ? t(delivery ? 'No runner is available near you right now. Try again shortly.' : 'No carer is available near you right now. Try another time.') : t(delivery ? 'Booked. The nearest runners have been asked.' : 'Booked. The nearest carers have been asked.')}</p>}
        <button className="primary" disabled={!q || busy}>{busy ? t('Sending…') : t('Book now')}</button>
      </form>
    </section>
  )
}

function BookingRow({ b, reload }) {
  const t = useT()
  const [err, setErr] = useState('')
  const s = STATUS[b.status] || STATUS.offered
  const cancel = () => api(`/care/bookings/${b.id}/cancel`, { method: 'POST' }).then(reload).catch((e) => setErr(e.message))
  const open = ['awaiting_prescription', 'offered', 'accepted', 'unfilled'].includes(b.status)
  return (
    <li className="row">
      <div>
        <p><strong>{t(SERVICES[b.service].label)}{b.hours ? ` · ${b.hours} h` : ''}</strong> <span className={`badge ${s.tone}`}>{t(s.label)}</span></p>
        <p className="muted small">{b.patient} · {fmtStart(b.start)} · {zar(b.total)}{b.quoted.length ? ` + ${t('supplier quote')}` : ''}</p>
        {b.equipment.length > 0 && <p className="muted small">{b.equipment.map((k) => t(EQUIPMENT[k].label)).join(', ')}</p>}
        {b.pickup && <p className="muted small">{t('From {place}', { place: b.pickup })}{b.urgent ? ` · ${t('urgent')}` : ''}</p>}
        {b.status === 'accepted' && b.carer && <p className="small">{t(isDelivery(b.service) ? '{name} is bringing it.' : '{name} is your carer.', { name: b.carer })}</p>}
        {b.status === 'offered' && <p className="muted small">{t('Offered to {n} nearby people, {ago}.', { n: b.offeredTo, ago: timeAgo(b.created, t) })}</p>}
        {err && <p className="notice" role="alert">{err}</p>}
      </div>
      {open && <button className="ghost" onClick={cancel}>{t('Cancel')}</button>}
    </li>
  )
}
