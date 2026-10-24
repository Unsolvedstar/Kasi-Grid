import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { useBattery } from '../battery.js'
import { helpMessage, loadContact, locate, mapLink, smsHref, waHref } from '../emergency.js'
import { applyA11y } from '../a11y.js'
import { EMERGENCY } from '../../shared/care.js'

// Mounted once. It holds the screen-reader announcement regions, the safe screen flash (three slow flashes, under 3 a second),
// the large-text caption that every alert also shows, and the full-screen emergency card.
export default function A11yLayer() {
  const t = useT()
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  const [cap, setCap] = useState('')
  const [on, setOn] = useState(0)
  const [card, setCard] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    applyA11y()
    const ann = (e) => {
      const { msg, assertive: a } = e.detail
      // a trailing space makes repeated identical messages announce again
      ;(a ? setAssertive : setPolite)((p) => (p === msg ? msg + ' ' : msg))
    }
    const capt = (e) => { setCap(e.detail.msg); clearTimeout(timer.current); timer.current = setTimeout(() => setCap(''), 12000) }
    const fl = () => setOn((n) => n + 1)
    const open = () => setCard(true)
    window.addEventListener('kg-announce', ann)
    window.addEventListener('kg-caption', capt)
    window.addEventListener('kg-flash', fl)
    window.addEventListener('kg-card', open)
    return () => { window.removeEventListener('kg-announce', ann); window.removeEventListener('kg-caption', capt); window.removeEventListener('kg-flash', fl); window.removeEventListener('kg-card', open); clearTimeout(timer.current) }
  }, [])

  return (
    <>
      <div className="vh" role="status" aria-live="polite">{polite}</div>
      <div className="vh" role="alert" aria-live="assertive">{assertive}</div>
      {on > 0 && <div key={on} className="flash" aria-hidden="true" />}
      {cap && (
        <div className="caption" role="presentation">
          <span>{cap}</span>
          <button type="button" aria-label={t('Dismiss')} onClick={() => setCap('')}><Icon name="close" /></button>
        </div>
      )}
      {card && <EmergencyCard onClose={() => setCard(false)} />}
    </>
  )
}

// Big, plain and always high contrast: to show a neighbour or a responder, or to send by text without speaking.
function EmergencyCard({ onClose }) {
  const t = useT()
  const b = useBattery()
  const [contact, setContact] = useState(loadContact)
  const [pos, setPos] = useState(null)
  const [state, setState] = useState('Finding your location…')
  useEffect(() => {
    let live = true
    locate().then((p) => { if (live) { setPos(p); setState(p ? '' : 'Location is not available. Say where you are.') } })
    const sync = () => setContact(loadContact())
    window.addEventListener('kg-contact', sync)
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => { live = false; window.removeEventListener('kg-contact', sync); window.removeEventListener('keydown', esc) }
  }, [onClose])
  const body = helpMessage({ contact, pos, batteryLeft: b.status?.left ?? null, lifeSupport: !!b.plan.lifeSupport })
  return (
    <div className="ecard" role="dialog" aria-modal="true" aria-label={t('Emergency card')}>
      <button type="button" className="ecard-x" onClick={onClose}><Icon name="close" /> {t('Close')}</button>
      <h2>{t('I NEED HELP')}</h2>
      <p className="ecard-big">{t('I cannot hear or speak on the phone. Please come, or send help.')}</p>
      {b.status && <p className="ecard-line"><Icon name="battery" /> {t('My medical device battery has about {m} minutes left.', { m: Math.max(0, Math.round(b.status.left * 60)) })}</p>}
      {contact.note && <p className="ecard-line">{contact.note}</p>}
      <p className="ecard-line"><Icon name="pin" /> {pos ? <>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} <small>({t('accurate to about {n} m', { n: pos.acc })})</small><br /><a href={mapLink(pos)}>{mapLink(pos)}</a></> : t(state)}</p>
      <div className="ecard-actions">
        {contact.phone ? (
          <>
            <a className="call primary" href={smsHref(contact.phone, body)}>{t('Text {name} my location', { name: contact.name || contact.phone })}</a>
            <a className="call" href={waHref(contact.phone, body)} target="_blank" rel="noreferrer">{t('WhatsApp {name}', { name: contact.name || contact.phone })}</a>
          </>
        ) : <p className="ecard-line">{t('Add an emergency contact on the Deliver tab so this can text them for you.')}</p>}
        <a className="call" href={`tel:${EMERGENCY.ambulance}`}><Icon name="phone" /> {t('Call ambulance {n}', { n: EMERGENCY.ambulance })}</a>
      </div>
    </div>
  )
}
