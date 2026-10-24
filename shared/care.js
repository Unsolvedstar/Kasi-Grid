import { SUBURBS, findSuburb } from './suburbs.js'

// Home care booking, modelled on the SweepSouth approach: the family books, the server fixes the price,
// the nearest approved carers get the offer, and the first to accept takes the job.
// Every rate, equipment price and carer below is a PLACEHOLDER to replace with real partner data before launch.

export const MIN_HOURS = 2
export const MAX_HOURS = 12
export const OFFER_COUNT = 3
export const OFFER_RADIUS_KM = 15

// Rand per hour.
export const SERVICES = {
  companion: { label: 'Companion care', note: 'Company, meals and light help at home', rate: 90 },
  postop: { label: 'Post-op help', note: 'Support after a hospital stay', rate: 110 },
  personal: { label: 'Personal care assistant', note: 'Washing, dressing and moving about', rate: 120 },
  equipment: { label: 'Equipment only', note: 'Delivered to the home, no carer', rate: 0 },
  // Deliveries: a nearby runner collects a sealed, pharmacy-packed order and brings it to the door. The app never dispenses or sells medicine.
  meds: { label: 'Medicine delivery', note: 'Your sealed chronic medicine from the clinic or pharmacy, brought to your door', rate: 0, delivery: true },
  oxygen: { label: 'Oxygen cylinder delivery', note: 'A full cylinder brought to your door, swapped for the empty one', rate: 0, delivery: true },
}
export const isDelivery = (service) => !!SERVICES[service]?.delivery

// Delivery fee: a base plus a rate per km from the pickup point, rounded to R5. Urgent jobs go out at once and add a surcharge.
export const DELIVERY_BASE = 45
export const DELIVERY_PER_KM = 6
export const URGENT_FEE = 30
export const MAX_DELIVERY_KM = 60

// price: rand, or null when a supplier quotes it. rx: needs a prescription approved before dispatch.
export const EQUIPMENT = {
  o2: { label: 'Oxygen concentrator, 5L', price: 1920, rx: true },
  cyl: { label: 'Oxygen cylinder, 14L (rental)', price: 650, rx: true },
  swap: { label: 'Oxygen cylinder swap, 14L (full for empty)', price: 420, rx: true },
  bat: { label: 'Battery backup for power cuts', price: null, rx: false, note: 'Keeps a concentrator or CPAP running when the power fails' },
  bed: { label: 'Hospital bed', price: null, rx: false },
  wc: { label: 'Wheelchair', price: null, rx: false },
  com: { label: 'Commode', price: null, rx: false },
}

// Sample carers, one or two per launch suburb. They are made up for the demo.
export const CARERS = [
  { id: 'c1', name: 'Nomsa', suburb: 'soweto', rating: 4.9 },
  { id: 'c2', name: 'Thandi', suburb: 'alex', rating: 4.8 },
  { id: 'c3', name: 'Lindiwe', suburb: 'alex', rating: 4.7 },
  { id: 'c4', name: 'Palesa', suburb: 'diepsloot', rating: 4.9 },
  { id: 'c5', name: 'Zanele', suburb: 'orange', rating: 4.6 },
  { id: 'c6', name: 'Busisiwe', suburb: 'tembisa', rating: 4.8 },
  { id: 'c7', name: 'Refilwe', suburb: 'katlehong', rating: 4.7 },
  { id: 'c8', name: 'Naledi', suburb: 'mamelodi', rating: 4.9 },
  { id: 'c9', name: 'Sipho', suburb: 'soshanguve', rating: 4.5 },
  { id: 'c10', name: 'Ayanda', suburb: 'khayelitsha', rating: 4.8 },
  { id: 'c11', name: 'Nokuthula', suburb: 'umlazi', rating: 4.7 },
  { id: 'c12', name: 'Mpho', suburb: 'ivorypark', rating: 4.6 },
]

// Sample runners (volunteer or part-time couriers with a car or bakkie). Made up for the demo; real ones would be vetted like carers.
export const RUNNERS = [
  { id: 'r1', name: 'Sipho (runner)', suburb: 'soweto', rating: 4.8 },
  { id: 'r2', name: 'Kabelo (runner)', suburb: 'alex', rating: 4.9 },
  { id: 'r3', name: 'Lerato (runner)', suburb: 'alex', rating: 4.7 },
  { id: 'r4', name: 'Thabo (runner)', suburb: 'diepsloot', rating: 4.6 },
  { id: 'r5', name: 'Mandla (runner)', suburb: 'orange', rating: 4.7 },
  { id: 'r6', name: 'Zodwa (runner)', suburb: 'tembisa', rating: 4.8 },
  { id: 'r7', name: 'Tshepo (runner)', suburb: 'katlehong', rating: 4.5 },
  { id: 'r8', name: 'Neo (runner)', suburb: 'mamelodi', rating: 4.9 },
  { id: 'r9', name: 'Vusi (runner)', suburb: 'soshanguve', rating: 4.6 },
  { id: 'r10', name: 'Anele (runner)', suburb: 'khayelitsha', rating: 4.8 },
  { id: 'r11', name: 'Bheki (runner)', suburb: 'umlazi', rating: 4.7 },
  { id: 'r12', name: 'Kopano (runner)', suburb: 'ivorypark', rating: 4.6 },
]
export const poolFor = (service) => (isDelivery(service) ? RUNNERS : CARERS)
export const personName = (id) => [...CARERS, ...RUNNERS].find((c) => c.id === id)?.name || ''

// Pickup points (samples). Every suburb has a clinic pharmacy; oxygen depots are scarce, so only a few hubs have one.
const OXYGEN_HUBS = ['soweto', 'tembisa', 'mamelodi', 'khayelitsha', 'umlazi', 'motherwell']
export const PICKUPS = [
  ...SUBURBS.map((s) => ({ id: `rx-${s.id}`, suburb: s.id, kind: 'meds', label: `${s.name} clinic pharmacy` })),
  ...SUBURBS.filter((s) => OXYGEN_HUBS.includes(s.id)).map((s) => ({ id: `o2-${s.id}`, suburb: s.id, kind: 'oxygen', label: `${s.name} oxygen depot` })),
]
export const pickupsFor = (service, home) => {
  const here = findSuburb(home)
  return PICKUPS.filter((p) => p.kind === service)
    .map((p) => ({ ...p, km: here ? km(here, SUBURBS.find((s) => s.id === p.suburb)) : 0 }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 5)
}

const rad = (d) => (d * Math.PI) / 180
export function km(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}
const suburb = (id) => findSuburb(id)

// The nearest carers within the offer radius, never anyone in `exclude` (carers who declined).
export function nearestCarers(suburbId, exclude = [], limit = OFFER_COUNT, pool = CARERS) {
  const here = suburb(suburbId)
  if (!here) return []
  return pool.filter((c) => !exclude.includes(c.id))
    .map((c) => ({ ...c, km: km(here, suburb(c.suburb)) }))
    .filter((c) => c.km <= OFFER_RADIUS_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
}

// The server calls this to set the price; the app calls it to show the same number before booking.
export function quote({ service, hours = 0, equipment = [], suburb: home, pickup, urgent = false }) {
  const s = SERVICES[service]
  if (!s) throw new Error('Unknown service')
  const delivery = !!s.delivery
  const needsCarer = service !== 'equipment' && !delivery
  const h = needsCarer ? Number(hours) : 0
  if (needsCarer && !(Number.isInteger(h) && h >= MIN_HOURS && h <= MAX_HOURS)) throw new Error(`Hours must be a whole number from ${MIN_HOURS} to ${MAX_HOURS}`)
  const items = [...new Set(equipment)]
  if (items.some((k) => !EQUIPMENT[k])) throw new Error('Unknown equipment')
  if (service === 'equipment' && items.length === 0) throw new Error('Pick the equipment you need')
  if (service === 'oxygen' && !items.some((k) => k === 'cyl' || k === 'swap')) throw new Error('Pick a cylinder swap or rental')
  let fee = 0
  let distance = 0
  if (delivery) {
    const from = PICKUPS.find((p) => p.id === pickup && p.kind === service)
    const to = suburb(home)
    if (!from || !to) throw new Error('Pick where it is collected from')
    distance = km(to, suburb(from.suburb))
    if (distance > MAX_DELIVERY_KM) throw new Error(`That pickup point is more than ${MAX_DELIVERY_KM} km away. Pick a closer one.`)
    fee = Math.round((DELIVERY_BASE + DELIVERY_PER_KM * distance) / 5) * 5 + (urgent ? URGENT_FEE : 0)
  }
  const carer = h * s.rate
  const equipmentTotal = items.reduce((a, k) => a + (EQUIPMENT[k].price ?? 0), 0)
  return {
    hours: h,
    carer,
    fee,
    km: Math.round(distance * 10) / 10,
    equipment: items,
    equipmentTotal,
    total: carer + fee + equipmentTotal,
    quotedItems: items.filter((k) => EQUIPMENT[k].price == null), // priced by the supplier after booking
    needsPrescription: service === 'meds' || items.some((k) => EQUIPMENT[k].rx),
  }
}

// How long a battery runs a device. `watts` is on the device label; the inverter wastes about 15%.
export const runtimeHours = (batteryWh, watts, efficiency = 0.85) => (batteryWh > 0 && watts > 0 ? (batteryWh * efficiency) / watts : 0)

// ---- Medical battery: how long it really lasts, and how long is left right now --------------------------------------
// A label's watt-hours are the battery's full size. What a device can actually draw is less: the battery is rarely full, it
// loses capacity with age, it should not be run flat (lead-acid least of all), and a plug-in device loses about 15% in the inverter.
export const CHEMISTRY = {
  liion: { label: 'Lithium-ion', dod: 0.85 },
  lifepo4: { label: 'LiFePO4 (lithium iron phosphate)', dod: 0.9 },
  lead: { label: 'Lead-acid or AGM', dod: 0.5 },
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v)))

// Hours a battery runs a device from `charge` percent. health is what is left of its original capacity.
export function batteryRuntime({ wh, watts, charge = 100, health = 100, chemistry = 'liion', inverter = true } = {}) {
  if (!(Number(wh) > 0 && Number(watts) > 0)) return 0
  const usable = Number(wh) * (clamp(charge, 0, 100) / 100) * (clamp(health, 10, 100) / 100) * (CHEMISTRY[chemistry]?.dod ?? 0.85)
  return (usable * (inverter ? 0.85 : 0.95)) / Number(watts)
}

// Time left while on battery. `full` is the runtime from 100% (see batteryRuntime with charge 100), `start` when the device
// went onto battery at `startPct`, and `readings` are percentages the person read off the battery's own display.
// One reading restarts the clock from the real level. Two or more, at least 10 minutes apart and falling, give the measured
// drain, and the shorter (safer) of the model and the measurement wins.
export function remainingHours({ full, start, startPct = 100, readings = [], now = Date.now() } = {}) {
  if (!(full > 0) || !start) return null
  const H = 3600000
  const model = full * (clamp(startPct, 0, 100) / 100) - (now - start) / H
  const rs = [...readings].filter((r) => r && r.t >= start && r.t <= now).sort((a, b) => a.t - b.t)
  if (!rs.length) return { left: Math.max(0, model), source: 'model', rate: null }
  const last = rs[rs.length - 1]
  const fromLast = full * (clamp(last.pct, 0, 100) / 100) - (now - last.t) / H
  const first = rs[0]
  const span = (last.t - first.t) / H
  if (rs.length >= 2 && span >= 10 / 60 && first.pct > last.pct) {
    const rate = (first.pct - last.pct) / span // percent per hour
    const measured = last.pct / rate - (now - last.t) / H
    return { left: Math.max(0, Math.min(fromLast, measured)), source: 'measured', rate }
  }
  return { left: Math.max(0, fromLast), source: 'reading', rate: null }
}

// How worried to be. A life-support device gets its ambulance prompt a stage earlier.
export const BATTERY_STAGES = ['ok', 'watch', 'low', 'critical', 'empty']
export function batteryStage(left, lifeSupport = false) {
  if (left == null) return 'ok'
  if (left <= 0) return 'empty'
  if (left <= 0.5) return 'critical'
  if (left <= 1) return 'low'
  if (left <= 2) return 'watch'
  return 'ok'
}
export const ambulanceDue = (stage, lifeSupport = false) => stage === 'empty' || stage === 'critical' || (lifeSupport && stage === 'low')
export const EMERGENCY = { ambulance: '10177', mobile: '112' }
