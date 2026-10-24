// Municipal tariffs for 2026/27 (effective 1 July 2026), only where a figure could be found and checked.
//
// Every figure comes from a secondary source (news or tariff-summary sites), NOT from the municipal
// tariff book itself, so verify before relying on it. Each service carries a `status`:
//   'secondary'    figures from a secondary source, cross-checked where two sources existed
//   'estimated'    the municipality's published 2025/26 bands raised by its announced 2026/27 increase
//   'proposed'     figures published as proposals; the final approved numbers may differ
//   'percent-only' only the percentage increase is known, no rand-per-unit rates
//   'unavailable'  nothing reliable found (sources disagreed or none published)
//
// To add a city's water bands, fill `bands` as [upToKl, randPerKl] pairs, ascending, with `null` as the
// upper limit of the last band, and set status 'secondary'. The calculator then uses them automatically.

export const TARIFFS = {
  joburg: {
    effective: '1 July 2026',
    water: {
      status: 'secondary',
      vatIncluded: false,
      // Residential prepaid bands, rand per kL excluding VAT.
      bands: [[6, 0], [10, 28.91], [15, 29.84], [20, 35.65], [30, 64.53], [40, 69.45], [50, 86.81], [null, 94.92]],
      increase: 12.5,
      note: 'Residential prepaid bands. The first 6 kL a month are free.',
    },
    electricity: {
      status: 'secondary',
      increase: 8.63,
      note: 'City Power prepaid: about R2.88 per kWh for the first 350 kWh, R3.22 for the next 250 and R3.48 above 600 kWh. Check whether VAT is included.',
    },
    sources: [
      { label: 'Johannesburg 2026/27 tariff summary', url: 'https://mosaichomes.co.za/insights/mosaic-insights-article-joburg-2026-tariff-hikes.php' },
      { label: 'EnergyBee tariff update', url: 'https://energybee.co.za/news/eskom-municipal-tariffs-august-2026-update' },
    ],
  },
  tshwane: {
    effective: '1 July 2026',
    water: {
      status: 'estimated',
      vatIncluded: false,
      // 2025/26 residential bands, excl. VAT, from a property-manager summary of the promulgated tariffs (0-9 kL free, then 32.74, 44.30, 51.03, 54.56, 58.42), raised by the announced 10%.
      // The fixed network access charge is not included.
      bands: [[9, 0], [18, 36.01], [30, 48.73], [42, 56.13], [60, 60.02], [null, 64.26]],
      increase: 10,
      note: "An estimate: last year's Tshwane residential rates, as summarised by a property-management firm, raised by the announced 10%. The fixed network access charge is not included.",
    },
    electricity: {
      status: 'secondary',
      increase: 8.8,
      note: 'Prepaid, including VAT: R3.73 per kWh for the first 100 kWh, R4.36 for 101 to 400, R4.75 for 401 to 650 and R5.12 above 650. Basic charge R142.50 a month excluding VAT.',
    },
    sources: [
      { label: 'Tshwane 2026/27 tariffs (MunCalc)', url: 'https://muncalc.co.za/tshwane-tariffs' },
      { label: 'Tshwane 2025/26 tariff summary (Martinique)', url: 'https://www.martinique.co.za/wp-content/uploads/2025/07/250701-City-of-Tshwane-Tariffs.pdf' },
      { label: 'Tshwane electricity tariffs (EnergyBee)', url: 'https://energybee.co.za/news/tshwane-electricity-tariffs-2026' },
    ],
  },
  ekurhuleni: {
    effective: '1 July 2026',
    water: {
      status: 'estimated',
      vatIncluded: false,
      // The city's own 2025/26 household bands (Schedule 3, excl. VAT: 22.71, 37.43, 45.85, 57.06, 70.35) raised by the announced 11%.
      bands: [[6, 25.21], [15, 41.55], [30, 50.89], [45, 63.34], [null, 78.09]],
      increase: 11,
      note: "An estimate: the city's published 2025/26 household rates raised by the announced 11%. The free 6 kL applies to registered indigent households only.",
    },
    electricity: {
      status: 'secondary',
      increase: 9,
      note: 'Residential single-phase: R3.68 per kWh excluding VAT plus a basic charge of R119.67 a month.',
    },
    sources: [
      { label: 'Ekurhuleni 2026/27 tariff summary', url: 'https://mosaichomes.co.za/insights/mosaic-insights-article-ekurhuleni-2026-tariff-hikes.php' },
      { label: 'Ekurhuleni 2025/26 water tariffs (Schedule 3)', url: 'https://www.ekurhuleni.gov.za/wp-content/uploads/2025/06/Schedule-3-Water-Tariffs-2025-2026-15.pdf' },
      { label: 'City of Ekurhuleni tariff notice', url: 'https://www.ekurhuleni.gov.za/press-releases/public-notice/new-ekurhuleni-tariffs-effective-from-1-july-2026/' },
    ],
  },
  capetown: {
    effective: '1 July 2026',
    water: {
      status: 'secondary',
      vatIncluded: true,
      bands: [[6, 25.85], [10.5, 36.76], [35, 61.37], [null, 147.77]],
      increase: 10,
      note: 'Four-step residential tariff, including VAT, read from a site that cites Annexure 6 of the City budget. We could not open the annexure itself, so check your bill.',
    },
    electricity: { status: 'unavailable', note: 'Published sources disagreed on the 2026/27 electricity rates, so none are shown. The official figures are in Annexure 4 of the City budget.' },
    sources: [
      { label: 'City of Cape Town budget 2026/27', url: 'https://www.capetown.gov.za/Family%20and%20home/Meet-the-City/the-city-budget/the-citys-budget-2026-2027' },
      { label: 'Cape Town water tariffs 2026/27 (capetown.cool)', url: 'https://capetown.cool/water' },
    ],
  },
  ethekwini: {
    effective: '1 July 2026',
    water: { status: 'percent-only', increase: 12, note: 'Domestic water increase reported at 12% (cut from a proposed 15%). Rand-per-kL rates could not be verified.' },
    electricity: { status: 'proposed', increase: 10.5, note: 'Electricity increase proposed at 10.5%. Final approval not confirmed.' },
    sources: [{ label: 'eThekwini tariff proposal (IOL)', url: 'https://iol.co.za/thepost/news/2026-03-25-ethekwini-residents-to-face-significant-tariff-increases-for-water-electricity-and-waste-services/' }],
  },
  nmb: {
    effective: '1 July 2026',
    water: {
      status: 'estimated',
      vatIncluded: false,
      // The municipality's own 2025/26 residential steps (per day, excl. VAT: 20.58, 22.32, 31.20, 53.85, 98.48, 131.31) x 30.4 days, raised by 6.5%.
      bands: [[9.1, 21.92], [15.2, 23.77], [24.3, 33.23], [30.4, 57.35], [48.6, 104.88], [null, 139.85]],
      increase: 6.5,
      note: "An estimate: the municipality's published 2025/26 residential steps (set per day, converted to a 30-day month) raised by the reported 6.5%.",
    },
    electricity: {
      status: 'proposed',
      increase: 10.95,
      note: 'Proposed prepaid structure: R3.85 per kWh for the first 250 kWh, R4.58 for the next 250 and R5.07 above 500 kWh. Final figures may differ.',
    },
    sources: [
      { label: 'Nelson Mandela Bay 2025/26 tariff booklet', url: 'https://www.nelsonmandelabay.gov.za/DataRepository/Documents/nmbm-tariff-booklet-2025-202607072025_E3Ap8.pdf' },
      { label: 'Nelson Mandela Bay tariff hikes (Daily Maverick)', url: 'https://www.dailymaverick.co.za/article/2026-06-02-nelson-mandela-bay-residents-face-steep-rate-increases-amid-service-delivery-failures/' },
    ],
  },
}

// Municipalities whose tariffs we have not added yet. Nothing is guessed: the calculator asks for the household's
// own rate, and the card points to the municipality's website.
const notAdded = (site) => ({
  effective: '1 July 2026',
  water: { status: 'unavailable', note: 'We have not added this municipality\'s water tariffs yet. Enter your rate per kL from your municipal bill.' },
  electricity: { status: 'unavailable', note: 'We have not added this municipality\'s electricity tariffs yet. Check your bill or the municipality\'s website.' },
  sources: [{ label: 'Municipality website (tariffs not added yet)', url: site }],
})

Object.assign(TARIFFS, {
  emfuleni: notAdded('https://www.emfuleni.gov.za/'),
  mogale: notAdded('https://www.mogalecity.gov.za/'),
  george: notAdded('https://www.george.gov.za/'),
  stellenbosch: notAdded('https://www.stellenbosch.gov.za/'),
  drakenstein: notAdded('https://www.drakenstein.gov.za/'),
  msunduzi: notAdded('http://www.msunduzi.gov.za/'),
  newcastle: notAdded('https://www.newcastle.gov.za/'),
  buffalocity: notAdded('https://www.buffalocity.gov.za/'),
  mangaung: notAdded('https://www.mangaung.co.za/'),
  rustenburg: notAdded('https://www.rustenburg.gov.za/'),
  matlosana: notAdded('https://www.matlosana.gov.za/'),
  polokwane: notAdded('https://www.polokwane.gov.za/'),
  thulamela: notAdded('https://www.thulamela.gov.za/'),
  mbombela: notAdded('https://www.mbombela.gov.za/'),
  emalahleni: notAdded('https://emalahleni.gov.za/'),
  solplaatje: notAdded('https://www.solplaatje.org.za/'),
})

export const STATUS_LABELS = {
  secondary: 'From a secondary source, verify',
  proposed: 'Proposed, may have changed',
  'percent-only': 'Only the increase is known',
  estimated: "Estimate from last year's official rates",
  unavailable: 'Not available',
}

const VAT = 1.15

// Water cost for a month's use in kL, including VAT, or null when this city has no verified bands.
export function waterCostFor(cityId, kl) {
  const w = TARIFFS[cityId]?.water
  if (!w?.bands) return null
  let cost = 0
  let from = 0
  for (const [to, rate] of w.bands) {
    const upper = to === null ? Infinity : to
    if (kl > from) cost += (Math.min(kl, upper) - from) * rate
    from = upper
  }
  return w.vatIncluded ? cost : cost * VAT
}

// Used for communities outside the cities above: no verified bands, so households enter their own rate.
export const NO_TARIFF = {
  effective: '',
  water: { status: 'unavailable', note: 'We have no verified water tariff for this municipality yet. Enter the rand-per-kL rate from your bill.' },
  electricity: { status: 'unavailable', note: 'We have no verified electricity tariff for this municipality yet. Check your prepaid or municipal bill.' },
  sources: [],
}
