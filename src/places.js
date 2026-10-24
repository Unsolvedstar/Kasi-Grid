import { useEffect } from 'react'
import { communityId, findSuburb, inSouthAfrica, nearestSuburb, placeNames } from '../shared/suburbs.js'

// Find any place in South Africa (OpenStreetMap's Nominatim, from the browser) and turn it into a community.
const BASE = 'https://nominatim.openstreetmap.org'
const short = (a, fallback) => a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || a.hamlet || a.city || fallback

export async function searchPlaces(q, signal) {
  const r = await fetch(`${BASE}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=za&q=${encodeURIComponent(q)}`, { signal, headers: { 'Accept-Language': 'en' } })
  if (!r.ok) throw new Error('Search is busy, try again in a moment')
  return (await r.json())
    .map((x) => {
      const a = x.address || {}
      return {
        lat: Number(x.lat),
        lng: Number(x.lon),
        name: short(a, x.name || String(x.display_name).split(',')[0]),
        where: [a.city || a.town || a.county, a.state].filter(Boolean).join(', '),
      }
    })
    .filter((x) => inSouthAfrica(x.lat, x.lng))
}

export async function reverseName(lat, lng, signal) {
  const r = await fetch(`${BASE}/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`, { signal, headers: { 'Accept-Language': 'en' } })
  if (!r.ok) throw new Error('lookup failed')
  const j = await r.json()
  return short(j.address || {}, '') || null
}

// A covered suburb when one is within 3 km, otherwise the grid community for the spot.
export function communityFor(lat, lng) {
  const near = nearestSuburb(lat, lng, 3)
  if (near) return { id: near.id, name: near.name, custom: false }
  return { id: communityId(lat, lng), name: null, custom: true }
}

// Names for communities other people posted from, looked up politely (one a second, a few per visit) and remembered.
export function useFillNames(ids, places, setPlaces) {
  const todo = [...new Set(ids)].filter((id) => !places[id] && !placeNames.has(id) && findSuburb(id)?.custom).slice(0, 3)
  const sig = todo.join(',')
  useEffect(() => {
    if (!todo.length) return
    const ac = new AbortController()
    ;(async () => {
      for (const id of todo) {
        try {
          const s = findSuburb(id)
          const name = await reverseName(s.lat, s.lng, ac.signal)
          if (name) setPlaces((p) => ({ ...p, [id]: name }))
        } catch {
          /* leave the coordinates as the name */
        }
        await new Promise((ok) => setTimeout(ok, 1100))
      }
    })()
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}
