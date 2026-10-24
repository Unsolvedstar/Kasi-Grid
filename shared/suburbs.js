// Suburb coordinates are real (checked against OpenStreetMap/Nominatim).
// `group` is a placeholder used only by the simulated planning schedule.

// Ordered by province so the area menu groups neatly.
export const CITIES = {
  joburg: { name: 'Johannesburg', province: 'Gauteng' },
  tshwane: { name: 'Tshwane (Pretoria)', province: 'Gauteng' },
  ekurhuleni: { name: 'Ekurhuleni', province: 'Gauteng' },
  emfuleni: { name: 'Emfuleni (Vereeniging)', province: 'Gauteng' },
  mogale: { name: 'Mogale City (Krugersdorp)', province: 'Gauteng' },
  capetown: { name: 'Cape Town', province: 'Western Cape', ownLoadshedding: true },
  george: { name: 'George', province: 'Western Cape' },
  stellenbosch: { name: 'Stellenbosch', province: 'Western Cape' },
  drakenstein: { name: 'Drakenstein (Paarl)', province: 'Western Cape' },
  ethekwini: { name: 'eThekwini (Durban)', province: 'KwaZulu-Natal' },
  msunduzi: { name: 'Msunduzi (Pietermaritzburg)', province: 'KwaZulu-Natal' },
  newcastle: { name: 'Newcastle', province: 'KwaZulu-Natal' },
  nmb: { name: 'Nelson Mandela Bay (Gqeberha)', province: 'Eastern Cape' },
  buffalocity: { name: 'Buffalo City (East London)', province: 'Eastern Cape' },
  mangaung: { name: 'Mangaung (Bloemfontein)', province: 'Free State' },
  rustenburg: { name: 'Rustenburg', province: 'North West' },
  matlosana: { name: 'Matlosana (Klerksdorp)', province: 'North West' },
  polokwane: { name: 'Polokwane', province: 'Limpopo' },
  thulamela: { name: 'Thulamela (Thohoyandou)', province: 'Limpopo' },
  mbombela: { name: 'Mbombela (Nelspruit)', province: 'Mpumalanga' },
  emalahleni: { name: 'Emalahleni (Witbank)', province: 'Mpumalanga' },
  solplaatje: { name: 'Sol Plaatje (Kimberley)', province: 'Northern Cape' },
}

export const SUBURBS = [
  { id: 'soweto', name: 'Soweto', city: 'joburg', lat: -26.2485, lng: 27.854, group: 3 },
  { id: 'alex', name: 'Alexandra', city: 'joburg', lat: -26.1026, lng: 28.0985, group: 7 },
  { id: 'diepsloot', name: 'Diepsloot', city: 'joburg', lat: -25.9317, lng: 28.0121, group: 11 },
  { id: 'orange', name: 'Orange Farm', city: 'joburg', lat: -26.4667, lng: 27.85, group: 9 },
  { id: 'tembisa', name: 'Tembisa', city: 'ekurhuleni', lat: -25.9964, lng: 28.2268, group: 5 },
  { id: 'katlehong', name: 'Katlehong', city: 'ekurhuleni', lat: -26.3333, lng: 28.15, group: 2 },
  { id: 'mamelodi', name: 'Mamelodi', city: 'tshwane', lat: -25.7133, lng: 28.39, group: 14 },
  { id: 'soshanguve', name: 'Soshanguve', city: 'tshwane', lat: -25.5, lng: 28.1, group: 13 },
  { id: 'khayelitsha', name: 'Khayelitsha', city: 'capetown', lat: -34.0406, lng: 18.6674, group: 4 },
  { id: 'mitchells', name: 'Mitchells Plain', city: 'capetown', lat: -34.0506, lng: 18.6181, group: 12 },
  { id: 'umlazi', name: 'Umlazi', city: 'ethekwini', lat: -29.9525, lng: 30.9003, group: 6 },
  { id: 'kwamashu', name: 'KwaMashu', city: 'ethekwini', lat: -29.7414, lng: 30.9622, group: 10 },
  { id: 'motherwell', name: 'Motherwell', city: 'nmb', lat: -33.8008, lng: 25.5907, group: 8 },
  { id: 'kwazakhele', name: 'KwaZakhele', city: 'nmb', lat: -33.8764, lng: 25.5764, group: 1 },
  { id: 'ivorypark', name: 'Ivory Park', city: 'joburg', lat: -25.9875, lng: 28.2039, group: 15 },
  { id: 'atteridgeville', name: 'Atteridgeville', city: 'tshwane', lat: -25.7714, lng: 28.0736, group: 16 },
  { id: 'mabopane', name: 'Mabopane', city: 'tshwane', lat: -25.5123, lng: 28.0676, group: 6 },
  { id: 'vosloorus', name: 'Vosloorus', city: 'ekurhuleni', lat: -26.3564, lng: 28.2083, group: 8 },
  { id: 'daveyton', name: 'Daveyton', city: 'ekurhuleni', lat: -26.1388, lng: 28.4249, group: 12 },
  { id: 'gugulethu', name: 'Gugulethu', city: 'capetown', lat: -33.973, lng: 18.5742, group: 2 },
  { id: 'nyanga', name: 'Nyanga', city: 'capetown', lat: -33.9932, lng: 18.56, group: 9 },
  { id: 'mfuleni', name: 'Mfuleni', city: 'capetown', lat: -33.9902, lng: 18.6703, group: 14 },
  { id: 'inanda', name: 'Inanda', city: 'ethekwini', lat: -29.8032, lng: 30.9935, group: 1 },
  { id: 'ntuzuma', name: 'Ntuzuma', city: 'ethekwini', lat: -29.7421, lng: 30.9282, group: 13 },
  { id: 'zwide', name: 'Zwide', city: 'nmb', lat: -33.8741, lng: 25.5706, group: 5 },
  { id: 'sebokeng', name: 'Sebokeng', city: 'emfuleni', lat: -26.5603, lng: 27.8625, group: 3 },
  { id: 'evaton', name: 'Evaton', city: 'emfuleni', lat: -26.5297, lng: 27.8514, group: 10 },
  { id: 'kagiso', name: 'Kagiso', city: 'mogale', lat: -26.1495, lng: 27.769, group: 7 },
  { id: 'thembalethu', name: 'Thembalethu', city: 'george', lat: -34.0047, lng: 22.485, group: 4 },
  { id: 'kayamandi', name: 'Kayamandi', city: 'stellenbosch', lat: -33.9233, lng: 18.8485, group: 11 },
  { id: 'mbekweni', name: 'Mbekweni', city: 'drakenstein', lat: -33.6795, lng: 18.9912, group: 16 },
  { id: 'edendale', name: 'Edendale', city: 'msunduzi', lat: -29.6202, lng: 30.3702, group: 2 },
  { id: 'madadeni', name: 'Madadeni', city: 'newcastle', lat: -27.745, lng: 30.0386, group: 9 },
  { id: 'mdantsane', name: 'Mdantsane', city: 'buffalocity', lat: -32.974, lng: 27.8177, group: 5 },
  { id: 'duncanvillage', name: 'Duncan Village', city: 'buffalocity', lat: -33.0122, lng: 27.8653, group: 13 },
  { id: 'botshabelo', name: 'Botshabelo', city: 'mangaung', lat: -29.2324, lng: 26.7333, group: 6 },
  { id: 'batho', name: 'Batho', city: 'mangaung', lat: -29.1369, lng: 26.2297, group: 14 },
  { id: 'thabanchu', name: 'Thaba Nchu', city: 'mangaung', lat: -29.1979, lng: 26.8322, group: 1 },
  { id: 'tlhabane', name: 'Tlhabane', city: 'rustenburg', lat: -25.6403, lng: 27.2175, group: 8 },
  { id: 'boitekong', name: 'Boitekong', city: 'rustenburg', lat: -25.6431, lng: 27.286, group: 12 },
  { id: 'jouberton', name: 'Jouberton', city: 'matlosana', lat: -26.8933, lng: 26.605, group: 15 },
  { id: 'kanana', name: 'Kanana', city: 'matlosana', lat: -26.933, lng: 26.6495, group: 3 },
  { id: 'seshego', name: 'Seshego', city: 'polokwane', lat: -23.8494, lng: 29.3894, group: 7 },
  { id: 'mankweng', name: 'Mankweng', city: 'polokwane', lat: -23.8842, lng: 29.7194, group: 10 },
  { id: 'thohoyandou', name: 'Thohoyandou', city: 'thulamela', lat: -22.9676, lng: 30.4597, group: 4 },
  { id: 'kanyamazane', name: 'KaNyamazane', city: 'mbombela', lat: -25.472, lng: 31.1784, group: 11 },
  { id: 'kabokweni', name: 'Kabokweni', city: 'mbombela', lat: -25.3468, lng: 31.1092, group: 16 },
  { id: 'kwaguqa', name: 'KwaGuqa', city: 'emalahleni', lat: -25.8626, lng: 29.1125, group: 2 },
  { id: 'galeshewe', name: 'Galeshewe', city: 'solplaatje', lat: -28.7237, lng: 24.7474, group: 9 },
  { id: 'roodepan', name: 'Roodepan', city: 'solplaatje', lat: -28.6648, lng: 24.7169, group: 5 },
]

// Closest covered suburb to a coordinate, or null when nothing is within maxKm.
export function nearestSuburb(lat, lng, maxKm = 80) {
  const rad = Math.PI / 180
  let best = null
  let bestKm = Infinity
  for (const s of SUBURBS) {
    const a = Math.sin(((s.lat - lat) * rad) / 2) ** 2 + Math.cos(lat * rad) * Math.cos(s.lat * rad) * Math.sin(((s.lng - lng) * rad) / 2) ** 2
    const km = 12742 * Math.asin(Math.sqrt(a))
    if (km < bestKm) { best = s; bestKm = km }
  }
  return bestKm <= maxKm ? best : null
}

// ---- Anywhere in South Africa -------------------------------------------------------------------------------------
// Beyond the curated suburbs above, any spot in the country belongs to a community: a grid cell about 2 km across, found
// from coordinates alone. People in the same cell share reports, alerts and help, wherever they live.
export const OTHER_CITY = { name: 'Your community', province: 'South Africa' }
export const cityOf = (s) => CITIES[s.city] ?? OTHER_CITY

const SA = { s: -35.2, n: -21.8, w: 16.3, e: 33.2 }
const CELL = 50 // cells per degree of latitude or longitude
const GRID = /^g(-?\d{1,5})_(-?\d{1,5})$/
export const inSouthAfrica = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= SA.s && lat <= SA.n && lng >= SA.w && lng <= SA.e
export const communityId = (lat, lng) => `g${Math.round(lat * CELL)}_${Math.round(lng * CELL)}`

// Names people give their community (and ones looked up for others), registered by the app so every screen can show them.
export const placeNames = new Map()

export function findSuburb(id) {
  const curated = SUBURBS.find((s) => s.id === id)
  if (curated) return curated
  const m = typeof id === 'string' ? GRID.exec(id) : null
  if (!m) return undefined
  const lat = Number(m[1]) / CELL
  const lng = Number(m[2]) / CELL
  if (!inSouthAfrica(lat, lng)) return undefined
  return {
    id, name: placeNames.get(id) || `Area ${lat.toFixed(2)}, ${lng.toFixed(2)}`, city: 'other', lat, lng,
    group: ((Math.abs(Number(m[1]) * 7 + Number(m[2]) * 13)) % 16) + 1, custom: true,
  }
}
export const isSuburbId = (id) => !!findSuburb(id)

export function distKm(a, b) {
  const rad = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// The communities to show on a map around `suburb`: its city's suburbs, or for a custom community itself plus any
// community within `km` that has something happening (`ids` are the communities that appear in reports or outages).
export function around(suburb, ids = [], km = 25) {
  if (!suburb.custom) return SUBURBS.filter((s) => s.city === suburb.city)
  const out = [suburb]
  for (const id of new Set(ids)) {
    const s = id === suburb.id ? null : findSuburb(id)
    if (s && distKm(s, suburb) <= km) out.push(s)
  }
  return out
}
