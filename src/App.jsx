import { useEffect, useState } from 'react'
import { SUBURBS } from './data.js'
import { CITIES } from '../shared/suburbs.js'
import { useCityStage, useLiveStage, useSchedule } from './live.js'
import { useCommunity } from './api.js'
import { LANGS, useLang } from './i18n.jsx'
import { officialSlots, slotsFor, useLocalStorage } from './lib.js'
import Today from './views/Today.jsx'
import Alerts from './views/Alerts.jsx'
import Savings from './views/Savings.jsx'
import Business from './views/Business.jsx'
import Share from './views/Share.jsx'
import Food from './views/Food.jsx'

const TABS = [
  { id: 'today', label: 'Today', icon: '🏠' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'savings', label: 'Save', icon: '💰' },
  { id: 'business', label: 'Business', icon: '🏪' },
  { id: 'share', label: 'Share', icon: '🤝' },
  { id: 'food', label: 'Nearby', icon: '📍' },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [suburbId, setSuburbId] = useLocalStorage('kg2.suburb', 'alex')
  const [stageMode, setStageMode] = useLocalStorage('kg2.stageMode', 'live')
  const community = useCommunity()
  const [draft, setDraft] = useState(null)
  const [settings, setSettings] = useState(false)
  const { t, lang, setLang } = useLang()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  const eskom = useLiveStage()
  const suburb = SUBURBS.find((s) => s.id === suburbId) ?? SUBURBS[0]
  // Cape Town sets its own stage, so its suburbs follow that when it is available, else Eskom's.
  const cityStage = useCityStage(suburb)
  const cityName = CITIES[suburb.city]?.name.split(' (')[0]
  const live = cityStage.available ? { status: 'ok', stage: cityStage.stage, at: cityStage.fetchedAt, city: cityName } : eskom
  const isLive = stageMode === 'live'
  const stage = isLive ? live.stage ?? 0 : Number(stageMode)
  // Real slots when EskomSePush is configured, for the area the person chose or else the suburb's own area.
  const [areas, setAreas] = useLocalStorage('kg2.areas', {})
  const chosen = areas[suburb.id]
  const setArea = (a) => setAreas((all) => {
    const next = { ...all }
    if (a) next[suburb.id] = a
    else delete next[suburb.id]
    return next
  })
  const schedule = useSchedule(suburb, chosen?.id)
  const official = schedule.available
  const slots = official ? officialSlots(schedule.days, stage) : slotsFor(suburb.group, stage)
  const ctx = { suburb, stage, isLive, live, cityStage, slots, official, schedule, chosenArea: chosen, setArea, setTab, draft, setDraft, ...community }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">⚡💧</span>
          <div>
            <h1>Kasi Grid</h1>
            <p>{t('Prepare. Save. Share.')}</p>
          </div>
        </div>
        <label className="area">
          <span>{t('My area')}</span>
          <select value={suburbId} onChange={(e) => setSuburbId(e.target.value)}>
            {Object.entries(CITIES).map(([cid, c]) => (
              <optgroup key={cid} label={`${c.name}, ${c.province}`}>
                {SUBURBS.filter((s) => s.city === cid).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="ghost gear" aria-expanded={settings} aria-label={t('Settings')} onClick={() => setSettings(!settings)}>⚙️ {t('Settings')}</button>
        {settings && <div className="settings">
          <label className="area">
          <span>{t('Loadshedding stage')}</span>
          <select value={stageMode} onChange={(e) => setStageMode(e.target.value)}>
            <option value="live">
              {live.status === 'ok' ? t(live.city ? 'Live from {city}: {v}' : 'Live from Eskom: {v}', { city: live.city, v: live.stage === 0 ? t('none') : t('Stage {n}', { n: live.stage }) }) : live.status === 'loading' ? t('Live: loading…') : t('Live: unavailable')}
            </option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{t('Simulate stage {n}', { n })}</option>
            ))}
          </select>
          </label>
          <label className="area">
          <span>{t('Language')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          </label>
        </div>}
      </header>

      {!online && <div className="notice" role="status">{t('You are offline. Showing the last data saved on this phone. Anything you post is saved and sent when you have signal.')}</div>}
      {community.queued > 0 && <div className="notice" role="status">{t('{n} posts saved on this phone. They will be sent when you are back online.', { n: community.queued })}</div>}
      {online && community.status === 'error' && <div className="notice" role="alert">{t('Cannot reach the Kasi Grid server. Community data may be out of date. Retrying every 30 seconds.')}</div>}
      <p className="demo">{t('Live data: Eskom stage, OpenStreetMap shops, Johannesburg tariffs and neighbour reports. Items marked Sample are made up.')}</p>

      <main>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'alerts' && <Alerts {...ctx} setSuburbId={setSuburbId} />}
        {tab === 'savings' && <Savings suburb={suburb} />}
        {tab === 'business' && <Business {...ctx} />}
        {tab === 'share' && <Share {...ctx} />}
        {tab === 'food' && <Food {...ctx} />}
      </main>

      <nav className="tabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={tab === tb.id ? 'on' : ''} onClick={() => setTab(tb.id)}>
            <span>{tb.icon}</span>
            {t(tb.label)}
          </button>
        ))}
      </nav>
    </div>
  )
}
