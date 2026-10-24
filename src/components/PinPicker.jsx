import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import Icon from './Icon.jsx'
import { useT } from '../i18n.jsx'
import { inSouthAfrica } from '../../shared/suburbs.js'

function Click({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng, acc: null }) })
  return null
}
function Fly({ to }) {
  const map = useMap()
  if (to) map.setView([to.lat, to.lng], Math.max(map.getZoom(), 17))
  return null
}

// Marks the exact spot a report or post is about: the device's GPS, or a tap on satellite imagery of the community.
export default function PinPicker({ suburb, value, onChange }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const gps = () => {
    if (!navigator.geolocation) { setMsg('Location is not available on this device.'); return }
    setMsg('Finding you…')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pin = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }
        if (!inSouthAfrica(pin.lat, pin.lng)) { setMsg('Your location is outside South Africa.'); return }
        onChange(pin)
        setOpen(true)
        setMsg(`Pinned, accurate to about ${pin.acc} m.`)
      },
      () => setMsg('Could not get your location. Tap the map instead.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }
  return (
    <div className="pin-picker">
      <div className="row-btns">
        <button type="button" className="ghost" onClick={gps}><Icon name="pin" /> {t('Pin my exact location')}</button>
        <button type="button" className="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? t('Hide map') : t('Pick on map')}</button>
        {value && <button type="button" className="link" onClick={() => { onChange(null); setMsg('') }}>{t('Remove pin')}</button>}
      </div>
      {msg && <p className="muted small" role="status">{t(msg)}</p>}
      {open && (
        <div className="map pin-map">
          <MapContainer center={value ? [value.lat, value.lng] : [suburb.lat, suburb.lng]} zoom={value ? 17 : suburb.custom ? 16 : 14} maxZoom={19} style={{ height: 240, width: '100%' }}>
            <TileLayer attribution="Imagery &copy; Esri, Maxar" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            <Click onPick={(p) => { onChange(p); setMsg('Pinned. Tap again to move it.') }} />
            <Fly to={value} />
            {value && <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#e11d48', fillOpacity: 1 }} />}
          </MapContainer>
        </div>
      )}
      {value && <p className="muted small">{t('Pin set. Neighbours will see this spot on the map.')}</p>}
    </div>
  )
}
