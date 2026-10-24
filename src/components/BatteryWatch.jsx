import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { EMERGENCY } from '../../shared/care.js'
import { alertUser } from '../a11y.js'
import { lastAlerted, markAlerted, notify, stageRank, useBattery } from '../battery.js'

export const fmtLeft = (h, t) => (h >= 1 ? `${Math.floor(h)} ${t('h')} ${Math.round((h % 1) * 60)} ${t('min')}` : `${Math.max(0, Math.round(h * 60))} ${t('min')}`)

// Watches the on-battery tracker from every screen. Each time the battery slips to a worse stage it buzzes, beeps and
// notifies, and once the ambulance is due the banner puts the call button one tap away. The tracker stays put until the
// person says the power is back, so a closed page cannot silence it: the banner is waiting when they return.
export default function BatteryWatch({ goCare, here }) {
  const t = useT()
  const b = useBattery()
  const [hidden, setHidden] = useState(null) // the stage the person dismissed
  const seen = useRef(null)
  const startKey = b.track?.start

  useEffect(() => {
    if (!b.track) { seen.current = null; return }
    const prev = lastAlerted()
    const prevRank = prev && prev.start === startKey ? stageRank(prev.stage) : 0
    if (stageRank(b.stage) > prevRank && b.stage !== 'ok') {
      markAlerted(startKey, b.stage)
      const left = b.status.left
      const urgent = b.stage === 'critical' || b.stage === 'empty'
      const title = b.stage === 'empty' ? t('Battery empty') : t('Battery: about {h} left', { h: fmtLeft(left, t) })
      const body = b.due ? t('Call the ambulance on {n} now if this device keeps someone alive.', { n: EMERGENCY.ambulance }) : t('Switch to your backup and charge the battery.')
      alertUser({ text: title + '. ' + body, urgent })
      notify(title, body)
      setHidden(null)
    }
    seen.current = b.stage
  }, [b.stage, startKey])

  // the plan card on the Deliver tab already shows all of this
  if (!b.track || b.stage === 'ok' || hidden === b.stage || here) return null
  const left = b.status.left
  const tone = b.stage === 'critical' || b.stage === 'empty' ? 'bad' : 'warn'
  return (
    <div className={`batt-banner ${tone}`} role="alert">
      <div className="batt-head">
        <Icon name="battery" />
        <strong>{b.stage === 'empty' ? t('The battery should be empty') : t('About {h} of battery left', { h: fmtLeft(left, t) })}</strong>
        {!b.due && <button className="batt-x" aria-label={t('Dismiss')} onClick={() => setHidden(b.stage)}><Icon name="close" /></button>}
      </div>
      {b.due ? (
        <>
          <p>{b.plan.lifeSupport ? t('This device keeps someone alive. Arrange an ambulance now, before the power fails.') : t('If anyone is at risk when this stops, call the ambulance now.')}</p>
          <div className="batt-actions">
            <a className="call primary" href={`tel:${EMERGENCY.ambulance}`}><Icon name="phone" /> {t('Call ambulance {n}', { n: EMERGENCY.ambulance })}</a>
            <a className="call ghost" href={`tel:${EMERGENCY.mobile}`}>{t('Or {n}', { n: EMERGENCY.mobile })}</a>
            <button className="ghost" onClick={() => window.dispatchEvent(new Event('kg-card'))}>{t('Show emergency card')}</button>
            <button className="ghost" onClick={goCare}>{t('Open battery plan')}</button>
          </div>
        </>
      ) : (
        <div className="batt-actions">
          <p>{t('Switch to your backup and charge the battery.')}</p>
          <button className="ghost" onClick={goCare}>{t('Open battery plan')}</button>
        </div>
      )}
    </div>
  )
}
