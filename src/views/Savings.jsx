import { useMemo } from 'react'
import { useT } from '../i18n.jsx'
import { SavingsLine, BillBars } from '../components/Charts.jsx'
import { savingsTips, useLocalStorage, zar } from '../lib.js'
import { CITIES } from '../../shared/suburbs.js'
import { STATUS_LABELS, TARIFFS, waterCostFor } from '../../shared/tariffs.js'

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
  const city = CITIES[suburb.city]
  const tariff = TARIFFS[suburb.city]
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
          <label>Monthly electricity spend (R)
            <input type="number" min="0" value={p.bill} onChange={(e) => set('bill', Math.max(0, Number(e.target.value)))} />
          </label>
          <label>Water used per month (kL)
            <input type="number" min="0" value={p.water} onChange={(e) => set('water', Math.max(0, Number(e.target.value)))} />
          </label>
          {!hasBands && (
            <label>Your water price per kL (R)
              <input type="number" min="0" step="0.5" placeholder="from your bill" value={p.waterRate} onChange={(e) => set('waterRate', e.target.value)} />
            </label>
          )}
          <label>Hot water
            <select value={p.geyser} onChange={(e) => set('geyser', e.target.value)}>
              <option value="electric">Electric geyser</option>
              <option value="other">Gas / solar / none</option>
            </select>
          </label>
        </div>
        {hasBands ? (
          <p className="muted small">
            At {p.water} kL a month your {city.name} water bill is about <strong>{zar(water)}</strong> including VAT, using the tariff bands below
            {tariff.water.status === 'estimated' ? ' (an estimate, so check it against your bill)' : ''}.
          </p>
        ) : (
          <p className="notice">
            We do not have verified 2026/27 water tariff bands for {city.name}, so enter the rand-per-kL rate from your municipal bill. Until you do, water savings show as R0.
          </p>
        )}
        <div className="checks">
          {p.geyser === 'electric' && (
            <>
              <label><input type="checkbox" checked={p.timer} onChange={(e) => set('timer', e.target.checked)} /> Geyser already on a timer</label>
              <label><input type="checkbox" checked={p.blanket} onChange={(e) => set('blanket', e.target.checked)} /> Geyser has a blanket</label>
            </>
          )}
          <label><input type="checkbox" checked={p.led} onChange={(e) => set('led', e.target.checked)} /> Already using LED bulbs</label>
          <label><input type="checkbox" checked={p.oldFridge} onChange={(e) => set('oldFridge', e.target.checked)} /> Fridge is older than 10 years</label>
        </div>
      </section>

      <section className="card summary">
        <div>
          <p className="muted">You could save up to</p>
          <p className="huge">{zar(potential)}<small>/month</small></p>
        </div>
        <div>
          <p className="muted">Your plan ({chosen.length} action{chosen.length === 1 ? '' : 's'})</p>
          <p className="huge green">{zar(monthly)}<small>/month</small></p>
          <p className="muted small">{zar(monthly * 12)} a year, {zar(upfront)} upfront</p>
        </div>
      </section>

      <section className="card">
        <h2>{t('Your savings at a glance')}</h2>
        <BillBars rows={bills} />
        <hr className="sep" />
        <SavingsLine monthly={monthly} upfront={upfront} goal={goal.amount} />
      </section>

      <TariffCard cityName={city.name} tariff={tariff} t={t} />

      <Tips title="⚡ Electricity" tips={tips.filter((t) => t.kind === 'power')} picked={picked} toggle={toggle} />
      <Tips title="💧 Water" tips={tips.filter((t) => t.kind === 'water')} picked={picked} toggle={toggle} />

      <section className="card">
        <h2>{t('Savings goal')}</h2>
        <div className="fields">
          <label>What are you saving for?
            <input value={goal.label} onChange={(e) => setGoal({ ...goal, label: e.target.value })} />
          </label>
          <label>Cost (R)
            <input type="number" min="0" value={goal.amount} onChange={(e) => setGoal({ ...goal, amount: Math.max(0, Number(e.target.value)) })} />
          </label>
        </div>
        <p>
          {months
            ? <>Putting your plan's <strong>{zar(monthly)}</strong> a month aside, you reach <strong>{goal.label || 'your goal'}</strong> in <strong>{months} month{months === 1 ? '' : 's'}</strong>.</>
            : 'Pick some actions above to see how quickly your savings add up.'}
        </p>
        <p className="muted small">Estimates use typical household rules of thumb and your own numbers. Your actual savings will vary.</p>
      </section>
    </>
  )
}

function Tips({ title, tips, picked, toggle }) {
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
              <span className="muted small">/month{t.upfront ? ` · costs ${zar(t.upfront)}` : ' · free'}</span>
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
