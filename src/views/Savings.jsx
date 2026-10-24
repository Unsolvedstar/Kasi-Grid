import { useMemo } from 'react'
import Dial from '../components/Dial.jsx'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n.jsx'
import { SavingsLine, BillBars } from '../components/Charts.jsx'
import { savingsTips, useLocalStorage, zar } from '../lib.js'
import { cityOf } from '../../shared/suburbs.js'
import { NO_TARIFF, STATUS_LABELS, TARIFFS, waterCostFor } from '../../shared/tariffs.js'

const DEFAULTS = {
  bill: 900,
  geyser: 'electric',
  timer: false,
  blanket: false,
  led: false,
  oldFridge: false,
  water: 14,
  waterRate: '', // rand per kL from your own bill, used where we have no verified tariff bands
}

export default function Savings({ suburb }) {
  const t = useT()
  const [p, setP] = useLocalStorage('kg2.household', DEFAULTS)
  const [picked, setPicked] = useLocalStorage('kg2.picked', [])
  const [goal, setGoal] = useLocalStorage('kg2.goal', { label: 'Solar phone charger', amount: 1200 })
  const set = (k, v) => setP({ ...p, [k]: v })
  const city = cityOf(suburb)
  const tariff = TARIFFS[suburb.city] ?? NO_TARIFF
  const hasBands = !!tariff.water.bands
  const rate = Number(p.waterRate) || 0
  // Verified bands where we have them, otherwise the household's own rand-per-kL from their bill.
  const waterFn = useMemo(() => (hasBands ? (kl) => waterCostFor(suburb.city, kl) : (kl) => kl * rate), [hasBands, suburb.city, rate])
  const tips = useMemo(() => savingsTips(p, waterFn), [p, waterFn])
  const chosen = tips.filter((t) => picked.includes(t.id))
  const monthly = chosen.reduce((a, t) => a + t.save, 0)
  const upfront = chosen.reduce((a, t) => a + t.upfront, 0)
  const potential = tips.reduce((a, t) => a + t.save, 0)
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const months = monthly > 0 ? Math.ceil(goal.amount / monthly) : null
  const cut = (kind) => chosen.filter((t) => t.kind === kind).reduce((a, t) => a + t.save, 0)
  const water = waterFn(p.water)
  const bills = [
    { label: t('Electricity'), now: p.bill, plan: Math.max(0, p.bill - cut('power')) },
    { label: t('Water'), now: water, plan: Math.max(0, water - cut('water')) },
  ]

  return (
    <>
      <section className="card">
        <h2>{t('Your household')}</h2>
        <div className="fields">
          <Dial tone="power" label={t('Monthly electricity spend (R)')} unit="R" value={p.bill} onChange={(v) => set('bill', v === '' ? 0 : v)} min={0} max={5000} step={50}
            presets={[{ label: 'R500', value: 500 }, { label: 'R900', value: 900 }, { label: 'R1500', value: 1500 }, { label: 'R2500', value: 2500 }]} />
          <Dial tone="water" label={t('Water used per month (kL)')} unit="kL" value={p.water} onChange={(v) => set('water', v === '' ? 0 : v)} min={0} max={60} step={1}
            presets={[{ label: '6', value: 6 }, { label: '14', value: 14 }, { label: '25', value: 25 }, { label: '40', value: 40 }]} />
          {!hasBands && (
            <label>{t('Your water price per kL (R)')}
              <input type="number" min="0" step="0.5" placeholder={t('from your bill')} value={p.waterRate} onChange={(e) => set('waterRate', e.target.value)} />
            </label>
          )}
          <label>{t('Hot water')}
            <select value={p.geyser} onChange={(e) => set('geyser', e.target.value)}>
              <option value="electric">{t('Electric geyser')}</option>
              <option value="other">{t('Gas / solar / none')}</option>
            </select>
          </label>
        </div>
        {hasBands ? (
          <p className="muted small">
            {t('At {kl} kL a month your {city} water bill is about {amount} including VAT, using the tariff bands below.', { kl: p.water, city: city.name, amount: zar(water) })}
            {tariff.water.status === 'estimated' ? ' ' + t('This is an estimate, so check it against your bill.') : ''}
          </p>
        ) : (
          <p className="notice">
            {t('We do not have verified 2026/27 water tariff bands for {city}, so enter the rand-per-kL rate from your municipal bill. Until you do, water savings show as R0.', { city: city.name })}
          </p>
        )}
        <div className="checks">
          {p.geyser === 'electric' && (
            <>
              <label><input type="checkbox" checked={p.timer} onChange={(e) => set('timer', e.target.checked)} /> {t('Geyser already on a timer')}</label>
              <label><input type="checkbox" checked={p.blanket} onChange={(e) => set('blanket', e.target.checked)} /> {t('Geyser has a blanket')}</label>
            </>
          )}
          <label><input type="checkbox" checked={p.led} onChange={(e) => set('led', e.target.checked)} /> {t('Already using LED bulbs')}</label>
          <label><input type="checkbox" checked={p.oldFridge} onChange={(e) => set('oldFridge', e.target.checked)} /> {t('Fridge is older than 10 years')}</label>
        </div>
      </section>

      <section className="card summary">
        <div>
          <p className="muted">{t('You could save up to')}</p>
          <p className="huge">{zar(potential)}<small>{t('/month')}</small></p>
        </div>
        <div>
          <p className="muted">{t(chosen.length === 1 ? 'Your plan ({n} action)' : 'Your plan ({n} actions)', { n: chosen.length })}</p>
          <p className="huge green">{zar(monthly)}<small>{t('/month')}</small></p>
          <p className="muted small">{t('{a} a year, {u} upfront', { a: zar(monthly * 12), u: zar(upfront) })}</p>
        </div>
      </section>

      <section className="card">
        <h2>{t('Your savings at a glance')}</h2>
        <BillBars rows={bills} />
        <hr className="sep" />
        <SavingsLine monthly={monthly} upfront={upfront} goal={goal.amount} />
      </section>

      <TariffCard cityName={city.name} tariff={tariff} t={t} />

      <Tips title={<><Icon name="zap" /> {t('Electricity')}</>} tips={tips.filter((t) => t.kind === 'power')} picked={picked} toggle={toggle} />
      <Tips title={<><Icon name="droplet" /> {t('Water')}</>} tips={tips.filter((t) => t.kind === 'water')} picked={picked} toggle={toggle} />

      <section className="card">
        <h2>{t('Savings goal')}</h2>
        <div className="fields">
          <label>{t('What are you saving for?')}
            <input value={goal.label} onChange={(e) => setGoal({ ...goal, label: e.target.value })} />
          </label>
          <label>{t('Cost (R)')}
            <input type="number" min="0" value={goal.amount} onChange={(e) => setGoal({ ...goal, amount: Math.max(0, Number(e.target.value)) })} />
          </label>
        </div>
        <p>
          {months
            ? t(months === 1 ? "Putting your plan's {m} a month aside, you reach {goal} in {n} month." : "Putting your plan's {m} a month aside, you reach {goal} in {n} months.", { m: zar(monthly), goal: goal.label || t('your goal'), n: months })
            : t('Pick some actions above to see how quickly your savings add up.')}
        </p>
        <p className="muted small">{t('Estimates use typical household rules of thumb and your own numbers. Your actual savings will vary.')}</p>
      </section>
    </>
  )
}

function Tips({ title, tips, picked, toggle }) {
  const tr = useT()
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="list">
        {tips.map((t) => (
          <li key={t.id} className="row">
            <label className="tip">
              <input type="checkbox" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} />
              <span>
                <strong>{t.title}</strong>
                <span className="muted small block">{t.how}</span>
              </span>
            </label>
            <div className="amt">
              <strong>{zar(t.save)}</strong>
              <span className="muted small">{tr('/month')}{t.upfront ? ` · ${tr('costs {c}', { c: zar(t.upfront) })}` : ` · ${tr('free')}`}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TariffCard({ cityName, tariff, t }) {
  const row = (label, svc) => (
    <li className="row">
      <div>
        <p><strong>{label}</strong> <span className={`badge ${svc.status === 'secondary' ? 'ok' : 'sample'}`}>{STATUS_LABELS[svc.status]}</span></p>
        <p className="muted small">{svc.note}</p>
      </div>
      {svc.increase != null && <div className="amt"><strong>+{svc.increase}%</strong><span className="muted small">{tariff.effective}</span></div>}
    </li>
  )
  return (
    <section className="card">
      <h2>{t('Tariffs in {name}', { name: cityName })}</h2>
      <ul className="list">
        {row(t('Water'), tariff.water)}
        {row(t('Electricity'), tariff.electricity)}
      </ul>
      <p className="muted small">
        {t('Figures come from news and tariff-summary sites, not the municipal tariff book. Check your bill.')}{' '}
        {tariff.sources.map((x, i) => (
          <span key={x.url}>{i ? ' · ' : ''}<a href={x.url} target="_blank" rel="noreferrer">{x.label}</a></span>
        ))}
      </p>
    </section>
  )
}
