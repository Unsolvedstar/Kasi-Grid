import Icon from './Icon.jsx'
import { around, cityOf, findSuburb } from '../../shared/suburbs.js'
import { useT } from '../i18n.jsx'
import { timeAgo } from '../lib.js'
import Map from './Map.jsx'

const KIND = { power: 'power outage', water: 'water outage' }
const RED = '#c0392b'
const GREEN = '#2e9e5b'
const GREY = '#9aa3b2'

// City-wide view of verified outages (3+ different neighbours). Grey dots mean nothing verified, so quiet is visible too.
export default function OutageMap({ suburb, incidents, setSuburbId }) {
  const t = useT()
  const city = cityOf(suburb)
  const here = around(suburb, incidents.map((i) => i.suburb))
  const markers = here.map((s) => {
    const list = incidents.filter((i) => i.suburb === s.id)
    const open = list.filter((i) => !i.resolved)
    const color = open.length ? RED : list.length ? GREEN : GREY
    const label = open.length
      ? `${s.name}: ${open.map((i) => t(KIND[i.type])).join(', ')}`
      : list.length ? `${s.name}: ${t('Back on')}` : `${s.name}: ${t('No verified outage')}`
    return { id: s.id, lat: s.lat, lng: s.lng, color, label, selected: s.id === suburb.id }
  })
  const open = incidents.filter((i) => !i.resolved && here.some((s) => s.id === i.suburb))
  const nameOf = (id) => findSuburb(id)?.name

  return (
    <section className="card">
      <div className="bar">
        <h2>{t('Outage map: {city}', { city: city.name.split(' (')[0] })}</h2>
        <span className="muted small">{open.length === 0 ? t('No verified outages') : t('{n} verified now', { n: open.length })}</span>
      </div>
      <Map markers={markers} onSelect={setSuburbId} height={260} />
      <div className="legend">
        <span><i style={{ background: RED }} /> {t('Verified outage')}</span>
        <span><i style={{ background: GREEN }} /> {t('Back on')}</span>
        <span><i style={{ background: GREY }} /> {t('No verified outage')}</span>
      </div>
      {open.length > 0 && (
        <ul className="list">
          {open.slice(0, 5).map((i) => (
            <li key={i.suburb + i.type} className="row">
              <div>
                <p><strong><Icon name={i.type === 'water' ? 'droplet' : 'zap'} /> {nameOf(i.suburb)}</strong></p>
                <p className="muted small">{t('{n} neighbours report {type}', { n: i.devices, type: t(KIND[i.type]) })} · {timeAgo(i.since, t)}</p>
              </div>
              {i.suburb !== suburb.id && <button className="ghost" onClick={() => setSuburbId(i.suburb)}>{t('View')}</button>}
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{t('A dot turns red only when 3 or more different neighbours report the same problem.')}</p>
    </section>
  )
}
