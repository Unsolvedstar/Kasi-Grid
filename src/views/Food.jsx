import { useMemo, useState } from 'react'
import Map from '../components/Map.jsx'
import { OUTLET_GROUPS, OUTLET_TYPES } from '../data.js'
import { useT } from '../i18n.jsx'
import { useFoodReference, useOutlets } from '../live.js'
import { distanceKm, zar } from '../lib.js'

const EMPTY_PLACE = { name: '', type: 'spaza', hours: '', note: '' }
const money = (n) => 'R' + n.toFixed(2)
const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

// "Nearby" tab: food, health, water and transport places, real ones from OpenStreetMap plus community additions.
export default function Food({ suburb, places, prices, actions }) {
  const t = useT()
  const osm = useOutlets(suburb)
  const { snapshot: NAMC, staples: STAPLES } = useFoodReference()
  const [group, setGroup] = useState('food')
  const [selected, setSelected] = useState(null)
  const [edit, setEdit] = useState({ item: 'bread', price: '' })
  const [form, setForm] = useState(EMPTY_PLACE)
  const [showAdd, setShowAdd] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [err, setErr] = useState('')
  const run = (p) => p.then(() => setErr('')).catch((e) => setErr(e.message))

  const all = useMemo(() => [...osm.outlets, ...places], [osm.outlets, places])
  const list = useMemo(
    () =>
      all
        .filter((o) => OUTLET_TYPES[o.type]?.group === group)
        .map((o) => ({ ...o, km: distanceKm(suburb, o) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 60),
    [all, suburb, group],
  )
  const counts = useMemo(() => {
    const c = {}
    for (const o of all) {
      const g = OUTLET_TYPES[o.type]?.group
      if (g) c[g] = (c[g] || 0) + 1
    }
    return c
  }, [all])

  const sel = all.find((o) => o.id === selected)
  const isFood = OUTLET_TYPES[sel?.type]?.group === 'food'
  const selPrices = (sel && prices[sel.id]) || {}
  const markers = list.map((o) => ({ id: o.id, lat: o.lat, lng: o.lng, color: OUTLET_TYPES[o.type].color, label: o.name, selected: o.id === selected }))
  const legendTypes = Object.values(OUTLET_TYPES).filter((x) => x.group === group)

  const savePrice = (e) => {
    e.preventDefault()
    const price = Number(edit.price)
    if (!sel || !price || price <= 0) return
    run(actions.setPrice(sel.id, edit.item, price)).then(() => setEdit((x) => ({ ...x, price: '' })))
  }

  // Cheapest reported price per staple across every place with a report.
  const cheapest = STAPLES.map((s) => {
    let best = null
    for (const o of all) {
      const p = prices[o.id]?.[s.id]
      if (p && (!best || p.price < best.price)) best = { price: p.price, name: o.name }
    }
    return { ...s, best }
  }).filter((s) => s.best)

  const addPlace = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const add = (lat, lng) =>
      actions
        .addPlace({ name: form.name, type: form.type, hours: form.hours, note: form.note, lat, lng })
        .then(() => {
          setForm(EMPTY_PLACE)
          setShowAdd(false)
          setErr('')
        })
        .catch((x) => setErr(x.message))
    // Use the device location if allowed, otherwise the centre of the selected area.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => add(p.coords.latitude, p.coords.longitude), () => add(suburb.lat, suburb.lng), { timeout: 5000 })
    } else add(suburb.lat, suburb.lng)
  }

  const staplesShown = NAMC.items.filter((i) => STAPLES.some((s) => s.id === i.id || (s.id === 'beans' && i.id === 'dried-beans')))

  return (
    <>
      <section className="card">
        <div className="bar">
          <h2>{t('Nearby {name}', { name: suburb.name })}</h2>
        </div>
        <div className="chips" role="tablist">
          {OUTLET_GROUPS.map((g) => (
            <button key={g.id} role="tab" aria-selected={group === g.id} className={group === g.id ? 'chip on' : 'chip'} onClick={() => { setGroup(g.id); setSelected(null) }}>
              {g.icon} {t(g.label)}{counts[g.id] ? ` (${counts[g.id]})` : ''}
            </button>
          ))}
        </div>
        {osm.status === 'loading' && <p className="muted">{t('Loading real places from OpenStreetMap…')}</p>}
        {osm.status === 'error' && <p className="notice">{t('Could not load OpenStreetMap data. Community-added places still work.')} ({osm.error})</p>}
        <Map markers={markers} focus={sel ?? suburb} onSelect={setSelected} height={300} />
        <div className="legend">
          {legendTypes.map((o) => <span key={o.label}><i style={{ background: o.color }} /> {t(o.label)}</span>)}
        </div>
        <p className="muted small">
          {t('Places come from')} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> {t('contributors. Informal spaza shops, food banks and water points are often missing, so add the ones you know.')}
          {group === 'water' && ' ' + t('In OpenStreetMap, public water points are rare in townships. Add boreholes and standpipes you know about.')}
        </p>
      </section>

      <section className="card">
        <div className="bar">
          <h2>{t('{n} places, nearest first', { n: list.length })}</h2>
          <button className="ghost" onClick={() => setShowAdd(!showAdd)}>{showAdd ? t('Cancel') : t('+ Add a place')}</button>
        </div>
        {showAdd && (
          <form className="form" onSubmit={addPlace}>
            <div className="fields">
              <label>{t('Name')}
                <input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mama Lindi's Spaza" />
              </label>
              <label>{t('Type')}
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(OUTLET_TYPES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
                </select>
              </label>
              <label>{t('Opening hours')}
                <input value={form.hours} maxLength={80} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="e.g. Mon–Fri 09:00–13:00" />
              </label>
              <label>{t('Note')}
                <input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Free parcels, bring ID" />
              </label>
            </div>
            {err && <p className="notice" role="alert">{err}</p>}
            <button className="primary" disabled={!form.name.trim()}>{t('Save at my location')}</button>
            <p className="muted small">{t('Uses your device location if you allow it, otherwise the centre of {name}.', { name: suburb.name })}</p>
          </form>
        )}
        {list.length === 0 && osm.status !== 'loading' && <p className="muted">{t('Nothing found in this area yet. Be the first to add a place.')}</p>}
        <ul className="list">
          {list.map((o) => {
            const n = Object.keys(prices[o.id] || {}).length
            const food = OUTLET_TYPES[o.type].group === 'food'
            return (
              <li key={o.id} className={`row click ${o.id === selected ? 'sel' : ''}`} onClick={() => setSelected(o.id)}>
                <div>
                  <p>
                    <i className="dot" style={{ background: OUTLET_TYPES[o.type].color }} />
                    <strong>{o.name}</strong>
                    {o.source === 'community' && <span className="badge ok">{t('Community')}</span>}
                  </p>
                  <p className="muted small">{t(OUTLET_TYPES[o.type].label)} · {o.km.toFixed(1)} km{o.hours ? ` · ${o.hours}` : ''}</p>
                  {o.note && <p className="small">{o.note}</p>}
                  {o.source === 'community' && <p className="small"><button className="link" onClick={(e) => { e.stopPropagation(); run(actions.flag('places', o.id)) }}>{t('Report this place')}</button></p>}
                </div>
                {food && (
                  <div className="amt">
                    {n > 0 ? <span className="muted small">{t('{n} prices reported', { n })}</span> : <span className="muted small">{t('No prices yet')}</span>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {sel && isFood && (
        <section className="card">
          <h2>{sel.name}: {t('prices')}</h2>
          {Object.keys(selPrices).length > 0 && (
            <table>
              <tbody>
                {STAPLES.filter((s) => selPrices[s.id]).map((s) => {
                  const diff = selPrices[s.id].price - s.ref
                  return (
                    <tr key={s.id}>
                      <td>{t(s.label)}</td>
                      <td className="r">
                        {zar(selPrices[s.id].price)} <span className={`small ${diff > 0 ? 'up' : 'down'}`}>{diff > 0 ? '+' : '−'}{money(Math.abs(diff))} {t('vs national average')}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {sel.type !== 'foodbank' && (
            <form className="form inline" onSubmit={savePrice}>
              <select value={edit.item} onChange={(e) => setEdit({ ...edit, item: e.target.value })}>
                {STAPLES.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
              </select>
              <input type="number" min="1" step="0.5" placeholder={t('Price today (R)')} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
              <button className="primary" disabled={!edit.price}>{t('Report price')}</button>
            </form>
          )}
          {err && <p className="notice" role="alert">{err}</p>}
          <p className="muted small">{t('No open dataset has shop-level prices, so these come from people who have just shopped here. Prices older than 30 days are dropped.')}</p>
        </section>
      )}

      {group === 'food' && cheapest.length > 0 && (
        <section className="card">
          <h2>{t('Cheapest reported prices')}</h2>
          <table>
            <tbody>
              {cheapest.map((s) => (
                <tr key={s.id}>
                  <td>{t(s.label)}</td>
                  <td className="r">{zar(s.best.price)} <span className="muted small">{s.best.name}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {group === 'food' && (
        <section className="card">
          <h2>{t('What food costs nationally')}</h2>
          <p className="muted small">
            {t('National urban average prices for {period}, from the NAMC food basket (built on Stats SA data). Use them to spot a good or bad price.', { period: NAMC.period })}
          </p>
          <p>
            <strong>{t('28-item basket: {total}', { total: 'R' + NAMC.basketTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) })}</strong>{' '}
            <span className="muted small">{t('{yoy} compared with a year ago', { yoy: pct(NAMC.basketYoy) })}</span>
          </p>
          <table>
            <thead>
              <tr>
                <th></th>
                <th className="r">{t('Price')}</th>
                <th className="r">{t('vs a year ago')}</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? NAMC.items : staplesShown).map((i) => (
                <tr key={i.id}>
                  <td>{i.label}</td>
                  <td className="r">{money(i.price)}</td>
                  <td className={`r small ${i.yoy > 0 ? 'up' : 'down'}`}>{pct(i.yoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="link" onClick={() => setShowAll(!showAll)}>{showAll ? t('Show fewer items') : t('Show all {n} items', { n: NAMC.items.length })}</button>
          <p className="muted small"><a href={NAMC.url} target="_blank" rel="noreferrer">{NAMC.issue}</a>. {t('Community egg prices are per dozen, so they are compared with the 1.5-dozen national price divided by 1.5.')}</p>
        </section>
      )}
    </>
  )
}
