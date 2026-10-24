import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { api } from '../api.js'
import { useT } from '../i18n.jsx'
import { useLocalStorage, zar } from '../lib.js'
import { MAX_QTY, summarize } from '../../shared/restock.js'

const cutoffText = (ms) => new Date(ms).toLocaleString('en-ZA', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

export default function Restock({ suburb }) {
  const t = useT()
  const [pool, setPool] = useState(null)
  const [err, setErr] = useState('')
  const [shop, setShop] = useLocalStorage('kg2.shop', '')
  const [basket, setBasket] = useState(null) // null until the saved basket has loaded
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api('/restock?suburb=' + suburb.id).then((d) => {
    setPool(d)
    setErr('')
    setBasket((b) => b ?? d.mine)
    if (d.shop) setShop((s) => s || d.shop)
  }).catch((e) => setErr(e.message)), [suburb.id, setShop])
  useEffect(() => {
    setBasket(null)
    setPool(null)
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // What the pool would hold with my unsaved changes: replace my saved packs by my draft.
  const totals = useMemo(() => {
    if (!pool || !basket) return {}
    const t2 = { ...pool.totals }
    for (const k of Object.keys(pool.mine)) t2[k] = (t2[k] || 0) - pool.mine[k]
    for (const [k, v] of Object.entries(basket)) t2[k] = (t2[k] || 0) + v
    return t2
  }, [pool, basket])
  const s = useMemo(() => summarize(totals, basket || {}), [totals, basket])
  const mineCount = Object.values(basket || {}).reduce((a, b) => a + b, 0)
  const shopsNow = pool ? pool.shops - (Object.keys(pool.mine).length ? 1 : 0) + (mineCount ? 1 : 0) : 0
  const dirty = pool && basket && JSON.stringify(trim(basket)) !== JSON.stringify(trim(pool.mine))

  const set = (id, q) => {
    setSaved(false)
    setBasket((b) => ({ ...b, [id]: Math.max(0, Math.min(MAX_QTY, q)) }))
  }
  const save = async () => {
    setBusy(true)
    setErr('')
    try {
      await api('/restock', { method: 'POST', body: { suburb: suburb.id, shop, items: trim(basket) } })
      setSaved(true)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const invite = () => {
    const msg = t('Hi, I joined the {suburb} spaza order on Kasi Grid. The more shops order together, the cheaper the stock gets for all of us. Add your order before {cutoff}: {url}', { suburb: suburb.name, cutoff: cutoffText(pool.cutoff), url: window.location.origin })
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener')
  }

  if (!pool || !basket) return <section className="card"><p className="muted" role="status">{err || t('Loading…')}</p></section>

  return (
    <>
      <section className="card pulse ok">
        <h2><Icon name="cart" /> {t('Spaza order this week in {suburb}', { suburb: suburb.name })}</h2>
        <p className="big">{t('{n} shops ordering together', { n: shopsNow })} · {zar(s.poolValue)}</p>
        <p>{s.poolSaving > 0 ? t('Together they are saving {amount} compared with ordering alone.', { amount: zar(s.poolSaving) }) : t('Order together to unlock lower prices. The more packs the pool holds, the cheaper each pack.')}</p>
        <p className="muted small">{t('Orders close {cutoff}. Delivery is planned for the next day to one drop point.', { cutoff: cutoffText(pool.cutoff) })}</p>
        <button className="ghost" onClick={invite}><Icon name="phone" /> {t('Invite another spaza on WhatsApp')}</button>
      </section>

      <section className="card">
        <h2>{t('Your order')}</h2>
        <div className="fields">
          <label>{t('Shop name')}
            <input value={shop} maxLength={30} onChange={(e) => { setShop(e.target.value); setSaved(false) }} placeholder={t('For example Mama Lindi Tuck Shop')} />
          </label>
        </div>
        <ul className="list">
          {pool.catalogue.map((it) => {
            const row = s.rows.find((r) => r.id === it.id)
            const q = basket[it.id] || 0
            const units = row?.units || 0
            const price = row?.price ?? it.ref
            return (
              <li key={it.id} className="row">
                <div>
                  <p><strong>{it.label}</strong>{row?.off > 0 && <span className="badge ok">−{Math.round(row.off * 100)}%</span>}</p>
                  <p className="muted small">
                    {zar(price)} {row?.off > 0 && <s>{zar(it.ref)}</s>} · {t('{n} packs in the pool', { n: units })}
                    {row?.next && units > 0 && ` · ${t('{n} more packs unlocks −{p}%', { n: row.next.more, p: Math.round(row.next.off * 100) })}`}
                  </p>
                </div>
                <div className="amt">
                  <span>
                    <button className="ghost" aria-label={t('Fewer {item}', { item: it.label })} disabled={q === 0} onClick={() => set(it.id, q - 1)}>−</button>
                    <strong aria-live="polite" style={{ display: 'inline-block', minWidth: '2.2em', textAlign: 'center' }}>{q}</strong>
                    <button className="ghost" aria-label={t('More {item}', { item: it.label })} disabled={q >= MAX_QTY} onClick={() => set(it.id, q + 1)}>+</button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <h2>{t('Your saving')}</h2>
        {mineCount === 0 ? <p className="muted">{t('Add packs above to see what you pay and save.')}</p> : (
          <>
            <p className="big">{t('You pay {pay}', { pay: zar(s.pay) })} · <strong>{t('you save {amount}', { amount: zar(s.saving) })}</strong></p>
            <p className="muted small">{t('Ordering alone the same packs would cost {alone}. Every extra shop that joins lowers the price for everyone.', { alone: zar(s.alone) })}</p>
          </>
        )}
        {err && <p className="notice" role="alert">{err}</p>}
        {saved && !dirty && <p role="status"><Icon name="check" /> {t('Your order is in. You can change it until the order closes.')}</p>}
        <button className="chip on" disabled={busy || !shop.trim() || (!mineCount && !Object.keys(pool.mine).length) || !dirty} onClick={save}>
          {busy ? t('Saving…') : t('Join this week’s order')}
        </button>
        {!shop.trim() && <p className="muted small">{t('Enter your shop name first.')}</p>}
      </section>

      <p className="muted small">{t('Sample prices: the base price is the national average pack price (NAMC, July 2026) and the discount steps are placeholders until a wholesaler confirms real ones. No payment or delivery partner is connected yet. You would pay on delivery.')}</p>
    </>
  )
}

const trim = (b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v > 0).sort(([a], [c]) => a.localeCompare(c)))
