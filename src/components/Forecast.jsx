import { useT } from '../i18n.jsx'
import { useForecast } from '../api.js'
import { DAYS } from '../../shared/forecast.js'

const TYPE = { power: { icon: '⚡', label: 'Power' }, water: { icon: '💧', label: 'Water' } }

// "Intelligence": what this suburb's own report history says about when outages tend to happen, plus an early warning.
export default function Forecast({ suburb, incidents }) {
  const t = useT()
  const f = useForecast(suburb.id, incidents.length)
  if (!f) return null
  const when = (p) => {
    const day = t(DAYS[p.dow])
    return p.next?.now ? t('{band} today', { band: t(p.band) }) : `${day} ${t(p.band)}`
  }
  const rows = ['power', 'water'].map((type) => ({ type, p: f[type] }))
  return (
    <section className="card">
      <div className="bar">
        <h2>{t('Outage forecast')}</h2>
        <span className="muted small">{t('From neighbours’ reports')}</span>
      </div>
      {f.building.map((b) => (
        <p key={b.type} className="notice" role="status">
          {TYPE[b.type].icon} {t('Early warning: 2 neighbours just reported {type} problems. One more confirms a verified outage.', { type: t(TYPE[b.type].label).toLowerCase() })}
        </p>
      ))}
      <ul className="list">
        {rows.map(({ type, p }) => (
          <li key={type} className="row">
            <div>
              <p><strong>{TYPE[type].icon} {t(TYPE[type].label)}</strong></p>
              {p.pattern ? (
                <>
                  <p>{t('Most likely {when}.', { when: when(p) })} {p.next?.now ? t('That window is open now, so prepare.') : t('Prepare the evening before.')}</p>
                  <p className="muted small">{t('{share}% of {n} reports in this window. Confidence: {c}.', { share: p.share, n: p.events, c: t(p.confidence) })}</p>
                </>
              ) : (
                <p className="muted small">
                  {p.enough ? t('No clear pattern yet.') : t('Not enough reports to forecast yet ({n} of 4). Every report helps your neighbours.', { n: p.events })}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
