import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'

// Floating vital signs over the street: how likely the power and water are to fail, and the loadshedding stage.
const tone = (v) => (v >= 0.6 ? 'bad' : v >= 0.3 ? 'warn' : 'good')
const WORD = { good: 'low', warn: 'medium', bad: 'high' }

export default function Vitals({ risk, stage, helpers, go }) {
  const t = useT()
  const p = Math.round((risk?.power ?? 0) * 100)
  const w = Math.round((risk?.water ?? 0) * 100)
  return (
    <div className="vitals" role="group" aria-label={t('Right now')}>
      <p className="vh">{t('Power cut risk {p} percent, {a}. Water cut risk {w} percent, {b}.', { p, a: t(WORD[tone(risk?.power ?? 0)]), w, b: t(WORD[tone(risk?.water ?? 0)]) })}{helpers > 0 ? ' ' + t('{n} neighbours are offering help', { n: helpers }) : ''}</p>
      <button aria-label={`${t('Power cut risk')} ${p}%, ${t(WORD[tone(risk?.power ?? 0)])}`} className={`vital pw ${tone(risk?.power ?? 0)}`} onClick={() => go('alerts')}><Icon name="zap" /> <b>{p}%</b><span>{t('Power cut risk')}</span></button>
      <button aria-label={`${t('Water cut risk')} ${w}%, ${t(WORD[tone(risk?.water ?? 0)])}`} className={`vital wt ${tone(risk?.water ?? 0)}`} onClick={() => go('alerts')}><Icon name="droplet" /> <b>{w}%</b><span>{t('Water cut risk')}</span></button>
      <button className={`vital ${stage > 0 ? 'warn' : 'good'}`} onClick={() => go('today')}><Icon name="bell" /> <b>{stage > 0 ? t('Stage {n}', { n: stage }) : t('No stage')}</b></button>
      {helpers > 0 && <button className="vital gold" onClick={() => go('share')}><Icon name="lantern" /> <b>{helpers}</b><span>{t('helping')}</span></button>}
    </div>
  )
}
