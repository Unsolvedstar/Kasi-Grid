import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'

// A form split into short steps: one question at a time, a progress pulse along the top, Back and Next, and a last step that
// reviews and sends. The parent keeps the answers; this only walks through them. Enter moves on, and each step change is
// announced to screen readers and takes keyboard focus to the step heading.
//   steps: [{ id, title, hint, valid, content }]   valid decides whether Next is enabled
export default function Wizard({ steps, onFinish, busy = false, finishLabel, error, startAt = 0 }) {
  const t = useT()
  const [i, setI] = useState(Math.min(startAt, steps.length - 1))
  const [reached, setReached] = useState(i)
  const head = useRef(null)
  const first = useRef(true)
  const last = i === steps.length - 1
  const step = steps[i]
  const pct = steps.length > 1 ? (i / (steps.length - 1)) * 100 : 100

  useEffect(() => {
    if (first.current) { first.current = false; return }
    head.current?.focus({ preventScroll: true })
    head.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [i])

  const go = (n) => { setI(n); setReached((r) => Math.max(r, n)) }
  const next = () => { if (step.valid && !last) { navigator.vibrate?.(6); go(i + 1) } }
  const submit = (e) => {
    e.preventDefault()
    if (!last) return next()
    if (step.valid && !busy) onFinish(e)
  }

  return (
    <form className="wizard" onSubmit={submit} noValidate>
      <ol className="wiz-dots" aria-label={t('Steps')}>
        {steps.map((s, n) => (
          <li key={s.id} className={n === i ? 'cur' : n < i ? 'done' : ''}>
            <button type="button" disabled={n > reached} aria-current={n === i ? 'step' : undefined} aria-label={t('Step {n} of {total}: {title}', { n: n + 1, total: steps.length, title: s.title })} onClick={() => go(n)}>
              {n < i ? <Icon name="check" /> : n + 1}
            </button>
          </li>
        ))}
      </ol>
      <div className="wiz-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <p className="vh" role="status">{t('Step {n} of {total}: {title}', { n: i + 1, total: steps.length, title: step.title })}</p>
      <h3 className="wiz-title" tabIndex={-1} ref={head}>
        <small>{t('Step {n} of {total}', { n: i + 1, total: steps.length })}</small>
        {step.title}
      </h3>
      {step.hint && <p className="muted small">{step.hint}</p>}
      <div className="wiz-body" key={step.id}>{step.content}</div>
      {error && <p className="notice" role="alert">{error}</p>}
      {/* separate keys: the click that moves to the last step must not land on a submit button */}
      <div className="wiz-nav">
        {i > 0 && <button type="button" className="ghost" onClick={() => go(i - 1)}>{t('Back')}</button>}
        {last
          ? <button key="finish" className="primary" disabled={!step.valid || busy}>{busy ? t('Sending…') : finishLabel || t('Finish')}</button>
          : <button key="next" type="button" className="primary" disabled={!step.valid} onClick={next}>{t('Next')}</button>}
      </div>
    </form>
  )
}
