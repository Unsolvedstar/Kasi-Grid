import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { useForecast } from '../api.js'
import { expectedBack, timeAgo } from '../lib.js'

const TYPE = { power: { icon: 'zap', label: 'Power outage' }, water: { icon: 'droplet', label: 'Water outage' } }
const canNotify = () => typeof Notification !== 'undefined'

// Verified outages in the chosen suburb: three or more different neighbours reporting the same problem.
// Shows a banner, lets people vote "it's back", and sends a phone notification the first time one appears while the app is open.
export default function Pulse({ suburb, incidents, actions }) {
  const t = useT()
  const mine = incidents.filter((i) => i.suburb === suburb.id)
  const f = useForecast(suburb.id, incidents.length)
  const seen = useRef(null)
  const [perm, setPerm] = useState(canNotify() ? Notification.permission : 'denied')
  const [err, setErr] = useState('')

  useEffect(() => {
    const keys = mine.filter((i) => !i.resolved).map((i) => i.suburb + i.type + i.since)
    if (seen.current && perm === 'granted') {
      for (const i of mine) {
        const k = i.suburb + i.type + i.since
        if (!i.resolved && !seen.current.has(k)) {
          try {
            new Notification(t('Verified outage in {name}', { name: suburb.name }), { body: t('{n} neighbours report {type}', { n: i.devices, type: t(TYPE[i.type].label).toLowerCase() }), icon: '/icon-192.png' })
          } catch { /* some mobile browsers only allow notifications from a service worker */ }
        }
      }
    }
    seen.current = new Set(keys)
  }, [incidents, suburb.id, perm])

  const enable = async () => setPerm(await Notification.requestPermission())
  const vote = (i) => actions.restored(i.lastReportId).catch((e) => setErr(e.message))

  return (
    <>
      {mine.map((i) => (
        <section key={i.type} className={`card pulse ${i.resolved ? 'ok' : 'bad'}`} role="status">
          <div className="bar">
            <h2><Icon name={TYPE[i.type].icon} /> {i.resolved ? t('Back on in {name}', { name: suburb.name }) : t('Verified outage in {name}', { name: suburb.name })}</h2>
            <span className="muted small">{timeAgo(i.since, t)}</span>
          </div>
          <p>{t('{n} different neighbours reported {type}.', { n: i.devices, type: t(TYPE[i.type].label).toLowerCase() })}</p>
          {!i.resolved && (
            <>
              {f?.duration?.[i.type] && (
                <p className="muted small">
                  {f.duration[i.type].p80 != null
                    ? t('In {name}, these usually last about {m} hours, and 1 in 5 last {p} or more ({n} past outages).', { name: suburb.name, m: f.duration[i.type].median, p: f.duration[i.type].p80, n: f.duration[i.type].n })
                    : t('In {name}, these usually last about {m} hours ({n} past outages).', { name: suburb.name, m: f.duration[i.type].median, n: f.duration[i.type].n })}
                </p>
              )}
              {f?.duration?.[i.type] && (() => {
                const e = expectedBack(i.since, f.duration[i.type].median)
                return (
                  <p className="big">
                    {e.overdue
                      ? t('Usually back by now. If it is still off, tell neighbours so the estimate improves.')
                      : t('Expected back around {time}', { time: new Date(e.at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) })}
                  </p>
                )
              })()}
              <p className="muted small">{t('{v} of {need} neighbours say it is back.', { v: i.restoredVotes, need: i.restoredNeeded })}</p>
              <button className="primary" disabled={i.restoredByMe} onClick={() => vote(i)}>
                {i.restoredByMe ? t('Thanks, noted') : t('It is back on for me')}
              </button>
            </>
          )}
        </section>
      ))}
      {err && <p className="notice" role="alert">{err}</p>}
      {canNotify() && perm === 'default' && (
        <button className="ghost" onClick={enable}><Icon name="bell" /> {t('Notify me about verified outages')}</button>
      )}
    </>
  )
}
