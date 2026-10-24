// Reaching help without a voice call: a saved emergency contact, the person's location as a map link, and a card to show or
// hand to someone nearby. Stays on the phone until the person taps a send button.
const KEY = 'kg2.emergency'
export const loadContact = () => {
  try { return { name: '', phone: '', note: '', ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) } } catch { return { name: '', phone: '', note: '' } }
}
export const saveContact = (c) => {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('kg-contact'))
}

// South African numbers: 082 123 4567 and +27821234567 both become 27821234567 for links.
export const digits = (phone) => {
  const d = String(phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '')
  return d.startsWith('0') ? '27' + d.slice(1) : d
}

export const locate = () => new Promise((ok) => {
  if (!navigator.geolocation) return ok(null)
  navigator.geolocation.getCurrentPosition(
    (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
    () => ok(null),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  )
})

export const mapLink = (pos) => (pos ? `https://maps.google.com/?q=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}` : '')

export function helpMessage({ contact, pos, batteryLeft, lifeSupport }) {
  const parts = ['HELP. I need help now.']
  if (contact?.note) parts.push(contact.note + '.')
  if (batteryLeft != null) parts.push(`My medical device battery has about ${Math.max(0, Math.round(batteryLeft * 60))} minutes left${lifeSupport ? ' and it keeps someone alive' : ''}.`)
  parts.push(pos ? `My location: ${mapLink(pos)} (accurate to about ${pos.acc} m).` : 'I could not get my location. Please call me.')
  parts.push('Sent from Kasi Grid.')
  return parts.join(' ')
}

export const smsHref = (phone, body) => `sms:${digits(phone)}${/iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(body)}`
export const waHref = (phone, body) => `https://wa.me/${digits(phone)}?text=${encodeURIComponent(body)}`
