import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip } from 'react-leaflet'
import Icon from './Icon.jsx'
import StreetField from './StreetField.jsx'

// The street on real satellite imagery. Homes are real building outlines from OpenStreetMap (Overpass) near the suburb
// centre, each with its own tolerance, so a 40% risk darkens about 40% of them. Gold markers are neighbours offering help.
// If the buildings cannot be fetched (offline, slow, nothing mapped) the drawn street is shown instead.
const MAX = 110
const seeded = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const key = (id) => `kasi-buildings2:${id}`

// Served by our own API, which fetches Overpass once per suburb and keeps the answer. A copy is kept on the device too.
async function loadBuildings(id, signal) {
  try {
    const hit = JSON.parse(localStorage.getItem(key(id)) || 'null')
    if (hit && Date.now() - hit.at < 30 * 864e5) return hit.pts
  } catch { /* storage can be blocked */ }
  const r = await fetch('/api/buildings?suburb=' + encodeURIComponent(id), { signal })
  if (!r.ok) throw new Error('buildings ' + r.status)
  const { pts } = await r.json()
  try { localStorage.setItem(key(id), JSON.stringify({ at: Date.now(), pts })) } catch { /* ignore */ }
  return pts
}

export default function StreetSat(props) {
  const { seed, power, lanterns, height = 'min(36vh, 320px)', label, ambient, me } = props
  const [pts, setPts] = useState(null) // null loading, [] unavailable
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  useEffect(() => {
    const ac = new AbortController()
    const to = setTimeout(() => ac.abort(), 30000)
    setPts(null)
    loadBuildings(seed, ac.signal).then(setPts, () => setPts([])).finally(() => clearTimeout(to))
    return () => { ac.abort(); clearTimeout(to) }
  }, [seed])

  const homes = useMemo(() => {
    if (!pts) return []
    const rnd = seeded(hash(seed))
    return pts.map(([a, b]) => ({ a, b, tol: rnd() }))
  }, [pts, seed])

  // While the buildings load (the first visit to a place can take a few seconds) or when too few are mapped, the drawn street shows.
  if (!pts || pts.length < 8) {
    return (
      <div className="street-wrap" style={ambient ? { height: '100%' } : undefined}>
        <StreetField {...props} />
        {!ambient && <span className="street-note" role="status">{pts ? 'Satellite view is not available here yet' : 'Loading satellite view…'}</span>}
      </div>
    )
  }

  const near = me && Math.abs(me.lat - homes[0].a) < 0.02 && Math.abs(me.lng - homes[0].b) < 0.02 ? me : null // a recent fix in this community
  const lats = homes.map((m) => m.a).concat(near ? [near.lat] : [])
  const lngs = homes.map((m) => m.b).concat(near ? [near.lng] : [])
  const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]
  const n = Math.min(lanterns, 12)
  const lantern = new Set(Array.from({ length: n }, (_, k) => Math.floor(((k + .5) / n) * homes.length)))
  const map = (full) => <SatMap homes={homes} bounds={bounds} power={power} lantern={lantern} full={full} ambient={!!ambient} me={near} />
  // The stage behind the whole app: the live map, always draggable and zoomable.
  if (ambient) return <div className="street street-sat stage" style={{ height: '100%' }}>{map(true)}</div>
  return (
    <>
      <div className="street street-sat" style={{ height }} role="button" tabIndex={0} aria-label={label + ' Tap to explore the map.'} onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}>
        {map(false)}
        <span className="street-note">Tap to explore</span>
      </div>
      {open && createPortal(
        <div className="street-full" role="dialog" aria-modal="true" aria-label="Satellite map of your street">
          {map(true)}
          <button type="button" className="street-close" onClick={() => setOpen(false)} aria-label="Close map"><Icon name="close" /> Close</button>
        </div>,
        document.body,
      )}
    </>
  )
}

// One map, used small (a picture you tap) and full screen (pan, zoom and tap a home to see its power).
function SatMap({ homes, bounds, power, lantern, full, ambient, me }) {
  const on = !!full
  return (
    <MapContainer bounds={bounds} boundsOptions={{ padding: [14, 14], maxZoom: 19 }} maxZoom={19} dragging={on} touchZoom={on} doubleClickZoom={on} scrollWheelZoom={on} boxZoom={on} keyboard={on && !ambient} zoomControl={on} style={{ height: '100%', width: '100%' }}>
      <TileLayer attribution="Imagery &copy; Esri, Maxar &middot; Buildings &copy; OpenStreetMap contributors" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
      {me && <Circle center={[me.lat, me.lng]} radius={Math.min(me.acc, 400)} interactive={false} className="me-ring" pathOptions={{ color: '#2a8bf2', weight: 1, fillColor: '#2a8bf2', fillOpacity: 0.14 }} />}
      {me && (
        <CircleMarker center={[me.lat, me.lng]} radius={8} interactive={full} className="me-dot" pathOptions={{ color: '#fff', weight: 3, fillColor: '#2a8bf2', fillOpacity: 1 }}>
          {full && <Tooltip>You are here, accurate to about {me.acc} m</Tooltip>}
        </CircleMarker>
      )}
      {homes.map((m, i) => {
        const lit = power <= m.tol
        const gold = lantern.has(i)
        return (
          <CircleMarker
            key={i}
            center={[m.a, m.b]}
            radius={(gold ? 7 : lit ? 5 : 3.5) + (on ? 2 : 0)}
            interactive={on}
            className={gold ? 'sat-home gold' : lit ? 'sat-home lit' : 'sat-home dark'}
            pathOptions={{ stroke: true, color: gold ? '#ff9d00' : lit ? '#ffffff' : '#d9c8ff', weight: gold ? 2.5 : 1.5, fillColor: gold ? '#ffbe46' : lit ? '#ffd23f' : '#5b3fa0', fillOpacity: gold || lit ? 1 : 0.85 }}
          >
            {on && <Tooltip>{gold ? 'A neighbour is offering help here' : lit ? 'Power on' : 'Power likely off'}</Tooltip>}
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
