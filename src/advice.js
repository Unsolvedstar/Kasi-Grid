// Practical advice for the weather alerts on the Today tab. Strings are translation keys (English text).
// `action` opens the report form on the Alerts tab pre-filled, so residents can warn neighbours in one tap.

const ADVICE = {
  rain: {
    icon: 'rain',
    title: 'Heavy rain expected',
    tips: [
      'Never walk or drive through moving water. It takes only 15 cm to knock an adult over.',
      'Move electronics, food and papers off the floor, and clear drains and gutters around your home.',
      'Charge phones and power banks now. Storms often cut power.',
    ],
    action: { label: 'Report a flooded road or bridge', reportType: 'road', text: 'Flooding at ' },
  },
  heat: {
    icon: 'thermometer',
    title: 'Extreme heat expected',
    tips: [
      'Drink water regularly and store about 10 litres per person in case of a water cut.',
      'Check on elderly neighbours and small children. Never leave anyone in a parked car.',
      'Keep the fridge shut. Food spoils fastest during outages in hot weather.',
    ],
  },
  cold: {
    icon: 'snowflake',
    title: 'Frost or very cold weather expected',
    tips: [
      'Never burn coal, wood or gas inside a closed room to keep warm. Carbon monoxide kills.',
      'Layer clothing and check on elderly neighbours and babies.',
      'Wrap outside taps and exposed pipes so frost does not burst them.',
    ],
  },
  wind: {
    icon: 'wind',
    title: 'Strong wind expected',
    tips: [
      'Tie down roofing sheets and anything loose that can fly.',
      'Stay away from fallen trees and power lines, and tell your municipality about them.',
      'Charge phones and power banks in case the wind brings down power lines.',
    ],
    action: { label: 'Report a fallen tree or power line', reportType: 'power', text: 'Fallen tree or power line at ' },
  },
}

// One advice card per alert type, most severe first. `alerts` come from the server (see server/weather.js).
export function adviceFor(alerts) {
  const seen = new Map()
  for (const a of alerts) {
    const prev = seen.get(a.type)
    if (!prev || (a.level === 'warning' && prev.level !== 'warning')) seen.set(a.type, a)
  }
  return [...seen.values()]
    .sort((a, b) => (a.level === b.level ? 0 : a.level === 'warning' ? -1 : 1))
    .map((a) => ({ type: a.type, level: a.level, date: a.date, ...ADVICE[a.type] }))
}

// Every string the advice can show, so tests can check the translations cover them.
export const ADVICE_STRINGS = Object.values(ADVICE).flatMap((x) => [x.title, ...x.tips, ...(x.action ? [x.action.label] : [])])
