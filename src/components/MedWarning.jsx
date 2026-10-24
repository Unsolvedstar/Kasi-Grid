import { useForecast } from '../api.js'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { useBattery } from '../battery.js'
import { DAYS } from '../../shared/forecast.js'

// Proactive warning for a household that set up the medical power plan: the most likely outage window is within a day.
export default function MedWarning({ suburb, incidents, setTab }) {
  const t = useT()
  const f = useForecast(suburb.id, incidents.length)
  const runtime = useBattery().runtime
  const p = f?.power
  if (!runtime || !p?.pattern || !p.next) return null
  const hoursAway = Math.max(0, (p.next.start - Date.now()) / 3600000)
  if (hoursAway > 24) return null
  const when = p.next.now ? t('{band} today', { band: t(p.band) }) : `${t(DAYS[p.dow])} ${t(p.band)}`
  const dur = f.duration?.power
  const short = dur && runtime < dur.median
  return (
    <section className="card pulse bad" role="status">
      <h2><Icon name="health" /> {t('Higher-risk window coming')}</h2>
      <p>
        {t('Power cuts in {name} are most likely {when}.', { name: suburb.name, when })}{' '}
        {short
          ? t('Your battery runs about {h} hours, shorter than a typical outage here. Charge it now and plan a backup.', { h: runtime.toFixed(1) })
          : t('Your battery runs about {h} hours. Charge it now.', { h: runtime.toFixed(1) })}
      </p>
      <button className="ghost" onClick={() => setTab('care')}>{t('Open medical power plan')}</button>
    </section>
  )
}
