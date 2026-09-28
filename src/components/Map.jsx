import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'

function Fit({ points, focus }) {
  const map = useMap()
  // Re-frame only when the focus or the set of points changes, not on every render.
  const sig = points.map((p) => p.id).join(',')
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], 12, { animate: true })
    else if (points.length) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 12 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sig, focus?.lat, focus?.lng])
  return null
}

// markers: [{ id, lat, lng, color, label, selected }]
export default function Map({ markers, focus, onSelect, height = 320 }) {
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={[-26.05, 28.05]} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit points={markers} focus={focus} />
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.selected ? 13 : 9}
            pathOptions={{ color: m.selected ? '#111' : '#fff', weight: m.selected ? 3 : 2, fillColor: m.color, fillOpacity: 0.95 }}
            eventHandlers={onSelect ? { click: () => onSelect(m.id) } : undefined}
          >
            <Tooltip>{m.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
