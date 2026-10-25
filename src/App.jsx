import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Icon from './components/Icon.jsx'
import LogoMark from './components/LogoMark.jsx'
import { SUBURBS } from './data.js'
import { CITIES, cityOf, findSuburb, placeNames } from '../shared/suburbs.js'
import { communityFor, reverseName, useFillNames } from './places.js'
import { accuracyWords, bestFix } from './geo.js'
import FindPlace from './components/FindPlace.jsx'
import { useCityStage, useLiveStage, useSchedule } from './live.js'
import { useCommunity } from './api.js'
import { LANGS, useLang } from './i18n.jsx'
import { officialSlots, slotsFor, useLocalStorage } from './lib.js'
import Today from './views/Today.jsx'
import Dock from './components/Dock.jsx'
import Sheet from './components/Sheet.jsx'
import Vitals from './components/Vitals.jsx'
import BatteryWatch from './components/BatteryWatch.jsx'
import A11yLayer from './components/A11yLayer.jsx'
import A11ySettings from './components/A11ySettings.jsx'
import { alertUser, announce, isCustom, useA11y } from './a11y.js'
import { mood as moodOf, riskTimeline } from '../shared/sense.js'

// Only the Today tab is needed on first load; the rest download when opened.
const Alerts = lazy(() => import('./views/Alerts.jsx'))
const Savings = lazy(() => import('./views/Savings.jsx'))
const Business = lazy(() => import('./views/Business.jsx'))
const Share = lazy(() => import('./views/Share.jsx'))
const Food = lazy(() => import('./views/Food.jsx'))
const Sense = lazy(() => import('./views/Sense.jsx'))
const Care = lazy(() => import('./views/Care.jsx'))
const Restock = lazy(() => import('./views/Restock.jsx'))
const prefetchViews = () => [import('./views/Alerts.jsx'), import('./views/Savings.jsx'), import('./views/Business.jsx'), import('./views/Share.jsx'), import('./views/Food.jsx'), import('./views/Care.jsx'), import('./views/Restock.jsx'), import('./views/Sense.jsx')]

// Five tabs: the outage story first. Everything else sits under More so a first-time user is not facing seven choices.
// The live satellite stage pulls in the map library, so it loads after the first paint.
const StreetSat = lazy(() => import('./components/StreetSat.jsx'))
const TABS = [
  { id: 'sense', label: 'Street', icon: 'sparkles' },
  { id: 'care', label: 'Deliver', icon: 'truck' },
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'business', label: 'Business', icon: 'store' },
  { id: 'more', label: 'More', icon: 'more' },
]
const MORE = [
  { id: 'restock', label: 'Restock', icon: 'cart', note: 'Spazas order together for lower prices' },
  { id: 'savings', label: 'Save', icon: 'coins', note: 'Cut your electricity and water bills' },
  { id: 'share', label: 'Share', icon: 'users', note: 'Offer or ask for help from neighbours' },
  { id: 'food', label: 'Nearby', icon: 'pin', note: 'Shops, clinics and food prices near you' },
]
const inMore = (tab) => tab === 'more' || MORE.some((m) => m.id === tab)

export default function App() {
  const [tab, setTab] = useState('sense')
  const [snap, setSnap] = useState('peek')
  const [scrub, setScrub] = useState(null)
  const sheetBody = useRef(null)
  // Fetch the other tabs once the browser is idle, so the service worker has them cached for offline use.
  useEffect(() => {
    const run = () => prefetchViews().forEach((p) => p.catch(() => {}))
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 2000)
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : clearTimeout(id))
  }, [])
  const mainRef = useRef(null)
  const firstRender = useRef(true)
  // Move focus to the content when the tab changes so keyboard and screen-reader users land on the new view.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    mainRef.current?.focus({ preventScroll: true })
    sheetBody.current?.scrollTo({ top: 0 })
  }, [tab])
  // The street is the home screen: it peeks. Every other section rises to half height.
  const a11y = useA11y()
  // Someone using a screen reader gets the whole page, not a peek, so nothing is hidden behind a clipped sheet.
  useEffect(() => { setSnap(a11y.profile === 'blind' ? 'full' : tab === 'sense' ? 'peek' : 'half') }, [tab, a11y.profile])
  const [suburbId, setSuburbId] = useLocalStorage('kg2.suburb', 'alex')
  // Places outside the covered suburbs: any spot in South Africa is a community of about 2 km, named by whoever joined it.
  const [places, setPlaces] = useLocalStorage('kg2.places', {})
  const [me, setMe] = useLocalStorage('kg2.me', null) // the last precise fix, shown as a dot on the map
  for (const [id, name] of Object.entries(places)) placeNames.set(id, name)
  const [locMsg, setLocMsg] = useState('')
  const joinPlace = async (lat, lng, name) => {
    const c = communityFor(lat, lng)
    setSuburbId(c.id)
    if (!c.custom) return c
    const label = name || (await reverseName(lat, lng).catch(() => null))
    if (label) setPlaces((p) => ({ ...p, [c.id]: label }))
    return { ...c, name: label }
  }
  // Pick the covered area nearest to the device. `quiet` is the silent first-visit attempt.
  const locate = async (quiet) => {
    if (!quiet) setLocMsg('Finding you…')
    // The silent first-visit attempt takes a quick good-enough fix. Pressing the button waits for a precise one.
    const { fix, error } = await bestFix({
      target: quiet ? 120 : 20,
      timeout: quiet ? 6000 : 20000,
      onProgress: (f) => { if (!quiet) setLocMsg(`Getting a precise fix… about ${f.acc} m so far`) },
    })
    if (!fix) {
      if (!quiet) setLocMsg(error === 'denied' ? 'Location is blocked for this site. Allow it in your browser settings, or pick your area from the list.' : 'Could not get your location. Move outside or near a window, then try again, or pick your area from the list.')
      return
    }
    setMe(fix)
    const c = await joinPlace(fix.lat, fix.lng)
    if (!quiet) setLocMsg((c.name ? `You are in the ${c.name} community. ` : 'You are now in the community around your location. ') + `Your phone says it is ${accuracyWords(fix.acc)}, about ${fix.acc} m.` + (fix.acc > 300 ? ' For a better fix, switch on GPS (high accuracy) and try outside.' : ''))
  }
  useEffect(() => {
    try { if (localStorage.getItem('kg2.suburb') === null) locate(true) } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [stageMode, setStageMode] = useLocalStorage('kg2.stageMode', 'live')
  const community = useCommunity()
  const [draft, setDraft] = useState(null)
  const [care, setCare] = useState(null) // a booking started elsewhere, such as "Get a battery backup"
  const [settings, setSettings] = useState(false)
  const [a11yOpen, setA11yOpen] = useState(false)
  useEffect(() => {
    if (!a11yOpen && !settings) return
    const esc = (e) => e.key === 'Escape' && (setA11yOpen(false), setSettings(false))
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [a11yOpen, settings])
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
  const suburb = findSuburb(suburbId) ?? SUBURBS[0]
  useFillNames([suburbId, ...(community.incidents || []).map((i) => i.suburb), ...(community.reports || []).map((r) => r.suburb), ...(community.shares || []).map((x) => x.suburb)], places, setPlaces)
  // Cape Town sets its own stage, so its suburbs follow that when it is available, else Eskom's.
  const cityStage = useCityStage(suburb)
  const cityName = cityOf(suburb).name.split(' (')[0]
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
  const ctx = { setScrub, suburb, stage, isLive, live, cityStage, slots, official, schedule, chosenArea: chosen, setArea, setTab, draft, setDraft, ...community }

  // The whole app takes on the mood of the street: warm and calm, amber when risk builds, deep red when the lights are out.
  const mine = community.incidents.filter((i) => i.suburb === suburb.id)
  const tl0 = riskTimeline({ slots, incidents: mine })
  const m0 = moodOf(tl0, 0)
  const risk = scrub ?? tl0[0] ?? { power: 0, water: 0 }
  // A verified outage, or the power coming back, reaches every sense the person has switched on.
  const openOut = mine.filter((i) => !i.resolved).map((i) => i.type).sort().join(',')
  const prevOut = useRef(null)
  useEffect(() => {
    if (prevOut.current !== null && openOut !== prevOut.current) {
      if (openOut) alertUser({ text: t('Verified outage in {name}', { name: suburb.name }) + ': ' + openOut.split(',').map((k) => t(k === 'water' ? 'Water' : 'Power')).join(', '), urgent: false })
      else announce(t('Back on in {name}', { name: suburb.name }))
    }
    prevOut.current = openOut
  }, [openOut])
  const helpers = (community.shares || []).filter((x) => x.suburb === suburb.id && x.kind === 'offer').length
  const ambient = m0 >= 0.8 ? 'dark' : m0 >= 0.3 ? 'dusk' : 'calm'
  useEffect(() => { document.documentElement.dataset.mood = ambient }, [ambient])

  return (
    <div className="app world">
      <A11yLayer />
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }}>{t('Skip to content')}</a>
      <header className="top float">
        <span className="logo"><LogoMark /></span>
        <h1 className="wordmark wm"><span>Kasi</span><span>Grid</span></h1>
        <label className="area">
          <span className="vh">{t('My area')}</span>
          <select value={suburbId} onChange={(e) => setSuburbId(e.target.value)}>
            {(suburb.custom || Object.keys(places).length > 0) && (
              <optgroup label={t('My places')}>
                {suburb.custom && !places[suburbId] && <option value={suburbId}>{suburb.name}</option>}
                {Object.entries(places).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </optgroup>
            )}
            {Object.entries(CITIES).map(([cid, c]) => (
              <optgroup key={cid} label={`${c.name}, ${c.province}`}>
                {SUBURBS.filter((s) => s.city === cid).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="ghost gear a11y-btn" aria-expanded={a11yOpen} aria-label={t('Accessibility') + (isCustom(a11y) ? ' (' + t('custom settings on') + ')' : '')} onClick={() => { setA11yOpen(!a11yOpen); setSettings(false) }}><Icon name="access" />{isCustom(a11y) && <i className="a11y-dot" aria-hidden="true" />}</button>
        <button className="ghost gear" aria-expanded={settings} aria-label={t('Settings')} onClick={() => { setSettings(!settings); setA11yOpen(false) }}><Icon name="settings" /></button>
        {a11yOpen && <div className="settings a11y-panel" role="dialog" aria-label={t('Accessibility')}>
          <A11ySettings />
          <button type="button" className="ghost" onClick={() => setA11yOpen(false)}>{t('Done')}</button>
        </div>}
        {settings && <div className="settings">
          <div className="place-tools">
            <button type="button" className="ghost" onClick={() => locate(false)}><Icon name="pin" /> {t('Use my location')}</button>
            <FindPlace onPick={(p) => { joinPlace(p.lat, p.lng, p.name); setSettings(false) }} />
            {locMsg && <small role="status">{t(locMsg)}</small>}
          </div>
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
          <p className="credit">Built by <b>Amethyst &amp; Azure</b> for the FNB AOTY Hackathon 2026</p>
        </div>}
      </header>
      <div className="stage-layer" aria-hidden="true">
        <Suspense fallback={null}><StreetSat
          ambient
          me={me}
          seed={suburb.id}
          power={risk.power}
          water={risk.water}
          lanterns={helpers}
          pulse={mine.reduce((n, i) => n + i.devices, 0)}
          label={t('Satellite view of {name}: glowing dots are homes with power, dark ones are likely off, gold lights are neighbours offering help.', { name: suburb.name })}
        /></Suspense>
      </div>
      {snap !== 'full' && <Vitals risk={risk} stage={stage} helpers={helpers} go={setTab} />}
      <BatteryWatch goCare={() => setTab('care')} here={tab === 'care'} />
      <Sheet snap={snap} setSnap={setSnap} label={t('Details')} bodyRef={sheetBody}>

      {!online && <div className="notice" role="status">{t('You are offline. Showing the last data saved on this phone. Anything you post is saved and sent when you have signal.')}</div>}
      {community.queued > 0 && <div className="notice" role="status">{t('{n} posts saved on this phone. They will be sent when you are back online.', { n: community.queued })}</div>}
      {online && community.status === 'error' && <div className="notice" role="alert">{t('Cannot reach the Kasi Grid server. Community data may be out of date. Retrying every 30 seconds.')}</div>}
      <p className="demo">{t('Live data: Eskom stage, OpenStreetMap shops, Johannesburg tariffs and neighbour reports. Items marked Sample are made up.')}</p>

      <main id="main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<p className="muted" role="status">{t('Loading…')}</p>}>
        {tab === 'restock' && <Restock suburb={suburb} />}
        {tab === 'today' && <Today {...ctx} setSuburbId={setSuburbId} />}
        {tab === 'alerts' && <Alerts {...ctx} setSuburbId={setSuburbId} />}
        {inMore(tab) && tab !== 'more' && <button className="link back" onClick={() => setTab('more')}>← {t('More')}</button>}
        {tab === 'more' && (
          <section className="card">
            <h2>{t('More')}</h2>
            <ul className="list">
              {MORE.map((m) => (
                <li key={m.id} className="row">
                  <button className="more-item" onClick={() => setTab(m.id)}>
                    <span aria-hidden="true"><Icon name={m.icon} /></span>
                    <span><strong>{t(m.label)}</strong><span className="muted small block">{t(m.note)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tab === 'savings' && <Savings suburb={suburb} />}
        {tab === 'business' && <Business {...ctx} />}
        {tab === 'share' && <Share {...ctx} />}
        {tab === 'food' && <Food {...ctx} />}
        {tab === 'sense' && <Sense {...ctx} />}
        {tab === 'care' && <Care {...ctx} care={care} setCare={setCare} />}
        </Suspense>
      </main>
      </Sheet>

      <Dock t={t} current={tab} onPick={setTab} mood={ambient} tabs={TABS.map((tb) => ({ ...tb, current: tb.id === 'more' ? inMore(tab) : tab === tb.id }))} />
    </div>
  )
}
