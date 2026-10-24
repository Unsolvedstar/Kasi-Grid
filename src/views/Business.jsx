import { BUSINESS_TYPES } from '../data.js'
import Icon from '../components/Icon.jsx'
import { useT } from '../i18n.jsx'
import { businessAnalysis, liveOutageCost, outageHoursPerMonth, timeAgo, useLocalStorage, zar } from '../lib.js'

const DEFAULTS = {
  type: 'spaza',
  dailyRevenue: 1500,
  backup: 'none',
  coldStock: 2000,
  coldBackup: false,
  waterDays: 2,
  tank: false,
}

const BACKUPS = { none: 'None', gas: 'Gas / candles', inverter: 'Inverter + battery', solar: 'Solar system' }

export default function Business({ suburb, stage: liveStage, isLive, incidents = [] }) {
  const t = useT()
  const [b, setB] = useLocalStorage('kg2.business', DEFAULTS)
  const [planStage, setPlanStage] = useLocalStorage('kg2.planStage', 4)
  const stage = planStage
  const set = (k, v) => setB({ ...b, [k]: v })
  const type = BUSINESS_TYPES[b.type]
  const a = businessAnalysis(b, stage, type)
  const tone = a.score >= 70 ? 'good' : a.score >= 40 ? 'warn' : 'bad'

  const open = incidents.filter((i) => i.suburb === suburb.id && !i.resolved)

  return (
    <>
      {open.map((i) => {
        const c = liveOutageCost(b, type, i)
        return (
          <section key={i.type} className="card pulse bad" role="status">
            <h2><Icon name={i.type === 'water' ? 'droplet' : 'zap'} /> {t(i.type === 'water' ? 'Water outage costing you now' : 'Power outage costing you now')}</h2>
            <p className="big">{t('About {amount} lost so far', { amount: zar(c.loss) })}</p>
            <p className="muted small">
              {t('Verified {ago}, {n} neighbours.', { ago: timeAgo(i.since, t), n: i.devices })}{' '}
              {t('Lost sales {sales}', { sales: zar(c.sales) })}{c.stock > 0 ? ` · ${t('Stock at risk {stock}', { stock: zar(c.stock) })}` : ''}
            </p>
            {c.stock > 0 && <p>{t('Keep fridge and freezer doors shut, and move the most valuable stock into a cold box with ice.')}</p>}
          </section>
        )
      })}
      <section className="card">
        <h2>{t('Your business')}</h2>
        <p className="muted">
          {isLive && liveStage === 0
            ? `Eskom has had no loadshedding since May 2025, but shops in ${suburb.name} still lose power to load reduction, cable theft and faults. Pick how many outage hours a month to plan for.`
            : 'Plan for how bad it could get.'}
        </p>
        <div className="fields">
          <label>Plan for outages like loadshedding stage
            <select value={planStage} onChange={(e) => setPlanStage(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Stage {n} (about {Math.round(outageHoursPerMonth(n))} hours a month)</option>)}
            </select>
          </label>
          <label>Type of business
            <select value={b.type} onChange={(e) => set('type', e.target.value)}>
              {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label>Average daily takings (R)
            <input type="number" min="0" value={b.dailyRevenue} onChange={(e) => set('dailyRevenue', Math.max(0, Number(e.target.value)))} />
          </label>
          <label>Backup power today
            <select value={b.backup} onChange={(e) => set('backup', e.target.value)}>
              {Object.entries(BACKUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Water outage days per month
            <input type="number" min="0" max="30" value={b.waterDays} onChange={(e) => set('waterDays', Math.min(30, Math.max(0, Number(e.target.value))))} />
          </label>
          {type.cold && (
            <label>Stock in fridges / freezers (R)
              <input type="number" min="0" value={b.coldStock} onChange={(e) => set('coldStock', Math.max(0, Number(e.target.value)))} />
            </label>
          )}
        </div>
        <div className="checks">
          {type.cold && <label><input type="checkbox" checked={b.coldBackup} onChange={(e) => set('coldBackup', e.target.checked)} /> Fridges are on backup power or cold boxes</label>}
          <label><input type="checkbox" checked={b.tank} onChange={(e) => set('tank', e.target.checked)} /> I have a water tank</label>
        </div>
      </section>

      <section className={`card score ${tone}`}>
        <div className="dial"><span>{a.score}</span><small>/100</small></div>
        <div>
          <h2>{t('Resilience score')}</h2>
          <p>Expect about <strong>{Math.round(a.outHours)} hours</strong> without power a month at stage {stage}.</p>
          <p className="big">Estimated loss: {zar(a.loss)} a month</p>
          <p className="muted small">
            Lost sales from power cuts {zar(a.powerLoss)} · Spoiled stock {zar(a.spoilage)} · Water outages {zar(a.waterLoss)}
          </p>
        </div>
      </section>

      <section className="card">
        <h2>{t('Best fixes, ranked by payback')}</h2>
        {a.fixes.length === 0 && <p className="muted">Nothing worth changing. Your business is well protected for this stage.</p>}
        <ul className="list">
          {a.fixes.map((f) => (
            <li key={f.id} className="row">
              <div>
                <p><strong>{f.title}</strong></p>
                <p className="muted small">Costs about {zar(f.cost)} · saves {zar(f.save)} a month</p>
              </div>
              <div className="amt">
                <strong>{f.payback < 1 ? '< 1' : f.payback.toFixed(1)} months</strong>
                <span className="muted small">payback</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">Costs and losses are rough estimates. Shared equipment (for example a stokvel buying one inverter for a row of spazas) can cut the cost per business.</p>
      </section>
    </>
  )
}
