import { lazy, Suspense } from 'react'
import Icon from '../components/Icon.jsx'
import { CHECKLIST, CHECKLIST_GROUPS, SHARE_CATEGORIES } from '../data.js'
import { useT } from '../i18n.jsx'
import { useWeather } from '../live.js'
import Forecast from '../components/Forecast.jsx'
import Pulse from '../components/Pulse.jsx'
import Welcome from '../components/Welcome.jsx'
import MedWarning from '../components/MedWarning.jsx'
import { adviceFor } from '../advice.js'
import { daysWithoutLoadshedding, fmtSlot, timeAgo, useLocalStorage, waLink, waterStatus, WATER, CONFIRM_THRESHOLD } from '../lib.js'

const OutageMap = lazy(() => import('../components/OutageMap.jsx'))

const greetingKey = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Today({ suburb, stage, isLive, live, slots, official, reports, shares, incidents, stats, actions, setTab, setDraft, setSuburbId }) {
  const t = useT()
  const wx = useWeather(suburb)
  const [done, setDone] = useLocalStorage('kg2.checklist', [])
  const now = new Date()
  const offNow = slots.find((s) => s.start <= now && s.end > now)
  const next = slots.find((s) => s.start > now)
  const water = waterStatus(reports, suburb.id)
  const w = WATER[water]

  const dayAgo = Date.now() - 24 * 3600 * 1000
  const confirmed = reports.filter((r) => r.suburb === suburb.id && r.confirms >= CONFIRM_THRESHOLD && r.ts > dayAgo)
  const offers = shares.filter((s) => s.suburb === suburb.id && s.kind === 'offer')
  const requests = shares.filter((s) => s.suburb === suburb.id && s.kind === 'request').length

  const power =
    stage === 0
      ? isLive && live.status !== 'ok' ? t('Status unavailable') : t('No loadshedding')
      : offNow
        ? t('Cut until {t}', { t: `${String(offNow.end.getHours() % 24).padStart(2, '0')}:00` })
        : next ? t('Stage {n}, next cut {slot}', { n: stage, slot: fmtSlot(next, t) }) : t('Stage {n}', { n: stage })
  const alert = offNow || water !== 'ok' || confirmed.length > 0

  const toggle = (id) => setDone(done.includes(id) ? done.filter((x) => x !== id) : [...done, id])
  const pct = Math.round((CHECKLIST.filter((c) => done.includes(c.id)).length / CHECKLIST.length) * 100)
  // The WhatsApp message stays in English so it reads the same for everyone it is forwarded to.
  const summary = `Kasi Grid, ${suburb.name}: ${w.label}. ${confirmed.length} confirmed problem${confirmed.length === 1 ? '' : 's'} reported by neighbours today. ${window.location.origin}`

  return (
    <>
      <Welcome setTab={setTab} />
      <Pulse suburb={suburb} incidents={incidents} actions={actions} />
      <MedWarning suburb={suburb} incidents={incidents} setTab={setTab} />
      <section className={`card hero ${alert ? 'alert' : ''}`}>
        <p className="muted">{t(greetingKey())}</p>
        <h2>{t('{name} today', { name: suburb.name })}</h2>
        <div className="tiles">
          <button className="tile" onClick={() => setTab('alerts')}>
            <span><Icon name="zap" /> {t('Power')}</span>
            <strong>{power}</strong>
            {stage > 0 && !official && <small>{t('Simulated pattern')}</small>}
            {stage > 0 && official && <small>{t('Official schedule')}</small>}
          </button>
          <button className="tile" onClick={() => setTab('alerts')}>
            <span><Icon name="droplet" /> {t('Water')}</span>
            <strong style={{ color: w.css }}>{t(w.label)}</strong>
          </button>
          <button className="tile" onClick={() => setTab('alerts')}>
            <span><Icon name="megaphone" /> {t('Confirmed today')}</span>
            <strong>{confirmed.length}</strong>
          </button>
          <button className="tile" onClick={() => setTab('share')}>
            <span><Icon name="users" /> {t('Neighbours offering')}</span>
            <strong>{offers.length}</strong>
          </button>
        </div>
        <a className="wa" href={waLink(summary)} target="_blank" rel="noreferrer">{t('Share this update on WhatsApp')}</a>
      </section>

      <Suspense fallback={null}><OutageMap suburb={suburb} incidents={incidents} setSuburbId={setSuburbId} /></Suspense>

      {stage === 0 && isLive && live.status === 'ok' && (
        <section className="card">
          <h2>{t('Loadshedding has paused. Local outages have not.')}</h2>
          <p>{t('Eskom reports no loadshedding for {n} days, since 16 May 2025. Your power can still go off from load reduction (areas with illegal connections or overloaded transformers), cable theft or faults, and water supply is failing in parts of Johannesburg.', { n: daysWithoutLoadshedding() })}</p>
          <p className="muted small">{t('If it happens on your street, report it so neighbours can see it is real. Three neighbours confirming makes it a verified outage.')}</p>
          <button className="ghost" onClick={() => setTab('alerts')}>{t('Report a problem')}</button>
        </section>
      )}

      <Forecast suburb={suburb} incidents={incidents} />

      {(offNow || water !== 'ok') && (
        <section className="notice" role="status">
          <strong>{t('Heads up.')}</strong>{' '}
          {offNow && t('Power is likely off, so keep phones charged and fridge doors shut.') + ' '}
          {water !== 'ok' && t('Water problems are reported nearby, so store drinking water now.')}
        </section>
      )}

      {stats && stats.devices > 0 && (
        <p className="muted small" role="status">
          {t('This week: {d} neighbours in {s} areas made {r} reports and {o} offers.', { d: stats.devices, s: stats.suburbs, r: stats.reports, o: stats.offers })}
        </p>
      )}

      <Weather wx={wx} t={t} />

      {wx.data && adviceFor(wx.data.alerts).map((a) => (
        <section key={a.type} className={`card advice ${a.level}`}>
          <h2><Icon name={a.icon} /> {t(a.title)}</h2>
          <ul className="advice-list">
            {a.tips.map((tip) => <li key={tip}>{t(tip)}</li>)}
          </ul>
          {a.action && (
            <button className="primary" onClick={() => { setDraft({ type: a.action.reportType, text: a.action.text }); setTab('alerts') }}>
              {t(a.action.label)}
            </button>
          )}
        </section>
      ))}

      <section className="card">
        <div className="bar">
          <h2>{t('Get ready')}</h2>
          <span className="muted small">{t('{n}% done', { n: pct })}</span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} /></div>
        {CHECKLIST_GROUPS.map((g) => (
          <div key={g.id}>
            <h3><Icon name={g.icon} /> {t(g.label)}</h3>
            <ul className="list">
              {CHECKLIST.filter((c) => c.group === g.id).map((c) => (
                <li key={c.id} className="row">
                  <label className="tip">
                    <input type="checkbox" checked={done.includes(c.id)} onChange={() => toggle(c.id)} />
                    <span className={done.includes(c.id) ? 'struck' : ''}>{t(c.text)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {done.length > 0 && <button className="link" onClick={() => setDone([])}>{t('Reset checklist')}</button>}
      </section>

      <section className="card">
        <div className="bar">
          <h2>{t('Help nearby')}</h2>
          <button className="ghost" onClick={() => setTab('share')}>{t('Open board')}</button>
        </div>
        {offers.length === 0 && <p className="muted">{t('No offers in {name} yet. Post one if you can spare charging, water or a lift.', { name: suburb.name })}</p>}
        <ul className="list">
          {offers.slice(0, 3).map((s) => (
            <li key={s.id} className="row">
              <div>
                <p><strong><Icon name={SHARE_CATEGORIES[s.category].icon} /> {s.title}</strong></p>
                <p className="muted small">{s.name} · {timeAgo(s.ts, t)}{s.sample ? ` · ${t('Sample')}` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
        {requests > 0 && <p className="muted small">{requests} {t('Need')}</p>}
      </section>
    </>
  )
}

const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ALERT_ICON = { rain: 'rain', heat: 'thermometer', cold: 'snowflake', wind: 'wind' }
const dayLabel = (iso) => DAYNAMES[new Date(iso + 'T12:00:00').getDay()]
const icon = (d) => (d.rain >= 5 ? 'rain' : d.max >= 30 ? 'sun' : d.rainProb >= 50 ? 'rain' : 'cloud-sun')

function Weather({ wx, t }) {
  if (wx.status === 'error') return null
  if (!wx.data)
    return (
      <section className="card">
        <h2>{t('Weather')}</h2>
        <p className="muted">{t('Loading forecast…')}</p>
      </section>
    )
  const { days, alerts, current } = wx.data
  return (
    <section className="card">
      <div className="bar">
        <h2>{t('Weather')}</h2>
        {current.temp != null && <span className="muted small">{t('Now')} {Math.round(current.temp)}°C</span>}
      </div>
      {alerts.length > 0 && (
        <ul className="wx-alerts">
          {alerts.slice(0, 3).map((a, i) => (
            <li key={i} className={a.level}>
              <strong><Icon name={ALERT_ICON[a.type]} /> {t(a.label)}</strong>{' '}
              {a.level === 'warning' ? t('Warning') : t('Watch')} · {dayLabel(a.date)} · {a.value}{a.unit}
            </li>
          ))}
        </ul>
      )}
      <div className="wx-days">
        {days.map((d) => (
          <div key={d.date} className="wx-day">
            <span className="muted small">{dayLabel(d.date)}</span>
            <span className="wx-icon" aria-hidden="true"><Icon name={icon(d)} /></span>
            <strong>{Math.round(d.max)}°</strong>
            <span className="muted small">{Math.round(d.min)}°</span>
            <span className="muted small">{d.rain >= 0.5 ? `${Math.round(d.rain)}mm` : '–'}</span>
          </div>
        ))}
      </div>
      <p className="muted small">
        {t('Forecast by')} <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>. {t('These alerts use simple thresholds, not official warnings. Check the')}{' '}
        <a href="https://www.weathersa.co.za/home/warnings" target="_blank" rel="noreferrer">{t('South African Weather Service warnings')}</a>.
      </p>
    </section>
  )
}
