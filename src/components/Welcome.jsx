import { useT } from '../i18n.jsx'
import { applyProfile } from '../a11y.js'
import { LogoLockup } from './LogoMark.jsx'
import Icon from './Icon.jsx'
import { useLocalStorage } from '../lib.js'

const STEPS = [
  { icon: 'megaphone', title: 'See what is really happening', body: 'Neighbours report power and water problems. When 3 different people agree, it becomes a verified outage on the map.' },
  { icon: 'eye', title: 'Get warned before it hits', body: 'The app learns when outages happen on your street and how long they last, so you can prepare.' },
  { icon: 'health', title: 'Get help when it matters', body: 'Check how long your medical battery lasts, book a carer or equipment, and see what an outage costs your shop.' },
]

// First-run intro: three steps, shown once and never again after it is dismissed.
export default function Welcome({ setTab }) {
  const t = useT()
  const [seen, setSeen] = useLocalStorage('kg2.welcomed', false)
  if (seen) return null
  return (
    <section className="card welcome" aria-label={t('Welcome')}>
      <LogoLockup />
      <h2>{t('Welcome to Kasi Grid')}</h2>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.title}>
            <span aria-hidden="true" className="step-icon"><Icon name={s.icon} /></span>
            <span><strong>{t(s.title)}</strong><span className="muted small block">{t(s.body)}</span></span>
          </li>
        ))}
      </ol>
      <div className="chips" role="group" aria-label={t('Make it work for me')}>
        <button type="button" className="chip" onClick={() => applyProfile('deaf')}>{t('I am deaf or hard of hearing')}</button>
        <button type="button" className="chip" onClick={() => applyProfile('blind')}>{t('I am blind or have low vision')}</button>
      </div>
      <div className="chips">
        <button className="primary" onClick={() => { setSeen(true); setTab('alerts') }}>{t('Report a problem')}</button>
        <button className="ghost" onClick={() => setSeen(true)}>{t('Got it')}</button>
      </div>
    </section>
  )
}
