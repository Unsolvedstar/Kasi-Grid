import { useEffect, useMemo, useRef, useState } from 'react'
import { caption, speak } from '../a11y.js'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n.jsx'
import { useForecast } from '../api.js'
import { advise, mood, riskTimeline } from '../../shared/sense.js'
import { createHum, heartbeat } from '../hum.js'

const ACTIONS = {
  calm: ['leaf', 'Nothing to prepare. Your street is calm for the next two days.'],
  charge: ['battery', 'Charge phones and power banks now. Power is likely to drop within 3 hours.'],
  'cook-now': ['utensils', 'Cook and boil water for flasks while there is power.'],
  'cook-gas': ['flame', 'Cook on gas or a paraffin stove. Keep the fridge and freezer shut.'],
  lantern: ['lantern', 'Neighbours with a gold light are offering help. Ask on the Share tab.'],
  'fridge-shut': ['snowflake', 'A closed freezer keeps food safe about 24 hours.'],
  'use-stored': ['bucket', 'Water is likely off. Use stored water, and save it for drinking and cooking.'],
  'fill-water': ['droplet', 'Water may stop within 3 hours. Fill buckets, pots and bottles now.'],
}
const WHY = {
  loadshedding: 'loadshedding schedule',
  pattern: 'this suburb’s outage pattern',
  verified: 'neighbours confirmed an outage',
  building: 'neighbours are starting to report problems',
}
const hh = (ts) => new Date(ts + 2 * 3600e3).toISOString().slice(11, 16) // South African time

export default function Sense({ suburb, slots, incidents, shares, setTab, setScrub }) {
  const t = useT()
  const mine = useMemo(() => incidents.filter((i) => i.suburb === suburb.id), [incidents, suburb.id])
  const fc = useForecast(suburb.id, incidents.length)
  const medPower = fc?.duration?.power?.median
  const medWater = fc?.duration?.water?.median
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 60000); return () => clearInterval(id) }, [])
  const tl = useMemo(
    () => riskTimeline({ now: tick, slots, fc, incidents: mine, medianHours: { power: medPower, water: medWater } }),
    [tick, slots, fc, mine, medPower, medWater],
  )
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [sound, setSound] = useState(false)
  const hum = useRef(null)
  const h = tl[at]
  const m = mood(tl, at)
  const lanterns = shares.filter((s) => s.suburb === suburb.id && s.kind === 'offer').length
  const acts = advise(tl, at)

  // Drift through the next 48 hours by itself, then return to now.
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setAt((a) => { if (a >= 47) { setPlaying(false); return 0 } return a + 1 }), 260)
    return () => clearInterval(id)
  }, [playing])
  useEffect(() => { hum.current?.set(m) }, [m, sound])
  useEffect(() => () => hum.current?.stop(), [])

  const toggleSound = () => {
    if (sound) { hum.current?.stop(); hum.current = null; setSound(false); return }
    hum.current = createHum()
    if (hum.current) { hum.current.ac.resume(); hum.current.set(m); setSound(true) }
  }
  const speak = () => {
    const words = [
      suburb.name,
      h.power >= .5 ? t('power is likely off') : h.power > 0 ? t('some risk of power cuts') : t('power looks fine'),
      h.water >= .5 ? t('water is likely off') : h.water > 0 ? t('some risk to water') : t('water looks fine'),
      lanterns ? t('{n} neighbours are offering help', { n: lanterns }) : '',
    ].filter(Boolean).join('. ')
    heartbeat(m)
    caption(words)
    speak(words)
  }

  // The street behind the app follows the slider.
  useEffect(() => {
    setScrub?.({ power: h.power, water: h.water })
    return () => setScrub?.(null)
  }, [h.power, h.water, setScrub])
  const when = at === 0 ? t('Now') : t('{t}, {n}h from now', { t: hh(h.t), n: at })
  const tone = m >= .8 ? 'dark' : m >= .3 ? 'dusk' : 'calm'
  const headline = m >= .8 ? t('The lights go out') : m >= .3 ? t('The street flickers') : t('The street glows')
  const why = h.why.map((w) => t(WHY[w])).join(' · ')

  return (
    <>
      <section className={`card sense ${tone}`}>
        <div className="sense-head">
          <div>
            <p className="sense-when">{when}</p>
            <h2>{headline}</h2>
          </div>
          <div className="sense-ctl">
            <button className={`ghost ${sound ? 'on' : ''}`} onClick={toggleSound} aria-pressed={sound}><Icon name={sound ? 'volume' : 'volume-off'} /> {t('Hear it')}</button>
            <button className="ghost" onClick={speak}><Icon name="speak" /> {t('Tell me')}</button>
          </div>
        </div>
        <label className="scrub">
          <span>{t('Drag to see the next 48 hours')}</span>
          <input type="range" min="0" max="47" value={at} onChange={(e) => { setPlaying(false); setAt(Number(e.target.value)) }} aria-valuetext={when} style={{ '--fill': `${(at / 47) * 100}%` }} />
        </label>
        <div className="risk-strip" aria-hidden="true">
          {tl.slice(0, 48).map((x, i) => (
            <i key={i} className={i === at ? 'cur' : ''} onClick={() => { setPlaying(false); setAt(i) }}
              style={{ background: `color-mix(in srgb, var(--bad) ${Math.round(Math.max(x.power, x.water) * 100)}%, var(--good))` }} />
          ))}
        </div>
        <div className="sense-row">
          <button className="primary" onClick={() => { if (!playing) setAt(0); setPlaying(!playing) }}>{playing ? '⏸ ' + t('Pause') : '▶ ' + t('Fast forward the street')}</button>
          {at > 0 && <button className="ghost" onClick={() => { setPlaying(false); setAt(0) }}>{t('Back to now')}</button>}
        </div>
        <div className="sense-legend" aria-hidden="true">
          <span><i className="dot lit" /> {t('power on')}</span>
          <span><i className="dot off" /> {t('power off')}</span>
          <span><i className="dot water" /> {t('water flowing')}</span>
          <span><i className="dot gold" /> {t('neighbour helping')}</span>
        </div>
        <p className="muted small" role="status">
          <Icon name="zap" /> {Math.round(h.power * 100)}% · <Icon name="droplet" /> {Math.round(h.water * 100)}%{why && ` · ${why}`}
        </p>
      </section>

      <section className="card">
        <h2>{at === 0 ? t('What to do now') : t('What to do at {t}', { t: hh(h.t) })}</h2>
        <ul className="list">
          {acts.map((a) => (
            <li key={a} className="row act"><span aria-hidden="true"><Icon name={ACTIONS[a][0]} /></span><span>{t(ACTIONS[a][1])}</span></li>
          ))}
        </ul>
        {lanterns > 0 && acts.includes('lantern') && <button className="primary" onClick={() => setTab('share')}><Icon name="lantern" /> {t('See who is helping')}</button>}
        <p className="muted small">{t('Built from the loadshedding slots, this suburb’s own outage history and what neighbours report. Each dot is an example home, not a real address.')}</p>
      </section>
    </>
  )
}
