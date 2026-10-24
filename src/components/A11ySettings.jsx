import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { alertUser, applyProfile, isCustom, saveA11y, useA11y } from '../a11y.js'

const SIZES = [[1, 'Normal'], [1.25, 'Large'], [1.5, 'Larger'], [2, 'Largest']]

// Ways in for people who cannot hear or cannot see the screen. Two quick profiles set sensible defaults; every switch can
// still be changed one by one.
export default function A11ySettings() {
  const t = useT()
  const p = useA11y()
  const sw = (key, label) => (
    <label className="check"><input type="checkbox" checked={!!p[key]} onChange={(e) => saveA11y({ [key]: e.target.checked, profile: null })} /> {t(label)}</label>
  )
  return (
    <fieldset className="a11y">
      <legend><Icon name="eye" /> {t('Accessibility')}</legend>
      <div className="chips" role="group" aria-label={t('Quick setup')}>
        <button type="button" aria-pressed={p.profile === 'deaf'} className={p.profile === 'deaf' ? 'chip on' : 'chip'} onClick={() => applyProfile(p.profile === 'deaf' ? null : 'deaf')}>{t('I am deaf or hard of hearing')}</button>
        <button type="button" aria-pressed={p.profile === 'blind'} className={p.profile === 'blind' ? 'chip on' : 'chip'} onClick={() => applyProfile(p.profile === 'blind' ? null : 'blind')}>{t('I am blind or have low vision')}</button>
      </div>
      <p className="muted small">{t('Text size')}</p>
      <div className="chips" role="group" aria-label={t('Text size')}>
        {SIZES.map(([v, label]) => <button type="button" key={v} aria-pressed={p.scale === v} className={p.scale === v ? 'chip on' : 'chip'} onClick={() => saveA11y({ scale: v })}>{t(label)}</button>)}
      </div>
      {sw('bright', 'Bright theme (always light, even when your phone is in dark mode)')}
      {sw('contrast', 'High contrast')}
      {sw('calm', 'Reduce motion and animations')}
      <p className="muted small">{t('When something important happens, alert me with:')}</p>
      {sw('flash', 'Screen flash (three slow flashes)')}
      {sw('vibrate', 'Vibration')}
      {sw('sound', 'Sound')}
      {sw('speak', 'Spoken words')}
      {isCustom(p) && <button type="button" className="ghost" onClick={() => applyProfile(null)}>{t('Reset everything to normal')}</button>}
      <button type="button" className="ghost" onClick={() => alertUser({ text: t('Test alert. This is how an urgent alert reaches you.'), urgent: true })}>{t('Test an alert')}</button>
    </fieldset>
  )
}
