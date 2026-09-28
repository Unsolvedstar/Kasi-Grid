import { useEffect, useState } from 'react'
import { api } from './api.js'
import { NAMC, STAPLES } from '../shared/namc.js'
import { CITIES } from '../shared/suburbs.js'

// Loadshedding stage from Eskom, via our server.
export function useLiveStage() {
  const [state, setState] = useState({ status: 'loading', stage: null, at: null })
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { stage } = await api('/eskom-status')
        if (alive) setState({ status: 'ok', stage, at: Date.now() })
      } catch {
        if (alive) setState((s) => ({ ...s, status: 'error' }))
      }
    }
    load()
    const t = setInterval(load, 10 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return state
}

// Real shops, markets and food services around a suburb, from OpenStreetMap via our server.
export function useOutlets(suburb) {
  const [state, setState] = useState({ status: 'loading', outlets: [], error: '' })
  useEffect(() => {
    let alive = true
    setState({ status: 'loading', outlets: [], error: '' })
    api('/outlets?suburb=' + encodeURIComponent(suburb.id))
      .then(({ outlets }) => alive && setState({ status: 'ok', outlets, error: '' }))
      .catch((e) => alive && setState({ status: 'error', outlets: [], error: e.message }))
    return () => {
      alive = false
    }
  }, [suburb.id])
  return state
}

// 5-day forecast and simple heat/frost/rain/wind alerts for a suburb (Open-Meteo, via our server).
export function useWeather(suburb) {
  const [state, setState] = useState({ status: 'loading', data: null })
  useEffect(() => {
    let alive = true
    setState((s) => ({ status: 'loading', data: s.data && s.data.suburb === suburb.id ? s.data : null }))
    api('/weather?suburb=' + encodeURIComponent(suburb.id))
      .then((data) => alive && setState({ status: 'ok', data: { ...data, suburb: suburb.id } }))
      .catch(() => alive && setState({ status: 'error', data: null }))
    return () => {
      alive = false
    }
  }, [suburb.id])
  return state
}

// National food prices. Starts with the bundled snapshot, then swaps in the newest one the server has imported.
export function useFoodReference() {
  const [ref, setRef] = useState({ snapshot: NAMC, staples: STAPLES, source: 'bundled' })
  useEffect(() => {
    let alive = true
    api('/food-reference')
      .then((r) => alive && setRef(r))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return ref
}

// Official loadshedding slots for a suburb (EskomSePush via our server). { available: false } when not configured.
export function useSchedule(suburb, areaId) {
  const [state, setState] = useState({ available: false })
  useEffect(() => {
    let alive = true
    setState({ available: false })
    api('/schedule?suburb=' + encodeURIComponent(suburb.id) + (areaId ? '&area=' + encodeURIComponent(areaId) : ''))
      .then((d) => alive && setState(d))
      .catch(() => alive && setState({ available: false, reason: 'error' }))
    return () => {
      alive = false
    }
  }, [suburb.id, areaId])
  return state
}

// The areas people can choose between for a suburb, plus a name search. { available: false } when official schedules are off.
export function useAreaOptions(suburb, enabled) {
  const [state, setState] = useState({ available: false, areas: [], default: null })
  useEffect(() => {
    if (!enabled) return
    let alive = true
    api('/areas?suburb=' + encodeURIComponent(suburb.id))
      .then((d) => alive && setState(d))
      .catch(() => alive && setState({ available: false, areas: [], default: null }))
    return () => {
      alive = false
    }
  }, [suburb.id, enabled])
  return state
}

export const searchAreas = (suburbId, text) => api(`/areas/search?suburb=${encodeURIComponent(suburbId)}&text=${encodeURIComponent(text)}`).then((d) => d.areas)

// The stage set by the city itself, for cities that do not follow Eskom's (Cape Town). { available: false } elsewhere.
export function useCityStage(suburb) {
  const [state, setState] = useState({ available: false })
  const city = CITIES[suburb.city]?.ownLoadshedding ? suburb.city : null
  useEffect(() => {
    setState({ available: false })
    if (!city) return
    let alive = true
    const load = () => api('/city-stage?city=' + city).then((d) => alive && setState(d)).catch(() => alive && setState({ available: false }))
    load()
    const t = setInterval(load, 30 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [city])
  return state
}
