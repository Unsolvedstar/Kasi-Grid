// Line icons (24px grid, stroke follows the text colour). Replaces emojis everywhere.
// Closed shapes get a soft tint so the set reads as duotone rather than plain outlines.
const DUO = new Set(['zap', 'droplet', 'bell', 'home', 'store', 'cart', 'coins', 'users', 'pin', 'truck', 'sparkles', 'battery', 'health', 'megaphone', 'eye', 'calendar', 'phone', 'check', 'lantern', 'bucket', 'bus', 'car', 'box', 'shield', 'rain', 'thermometer', 'sun', 'cloud-sun', 'leaf', 'flame'])

const P = {
  // Kasi Grid mark: a township roofline with a power bolt inside and a grid dot either side.
  logo: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><polygon className="bolt" points="13 8.5 9 14 12 14 11 18.5 15 13 12 13 13 8.5" /><circle cx="2.5" cy="19" r=".6" /><circle cx="21.5" cy="19" r=".6" /></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  store: <><path d="m2 7 4.4-4h11.2L22 7" /><path d="M2 7v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7" /><path d="M4 11v10h16V11" /></>,
  cart: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  coins: <><circle cx="12" cy="12" r="9" /><path d="M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.8-2.5 1.8a2.5 2 0 0 1-2.5-1.3" /><path d="M12 6v1.5M12 16.5V18" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  truck: <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>,
  sparkles: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  access: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="7.4" r="1.3" /><path d="M7 10.3c3.2.9 6.8.9 10 0M12 10.6v3M12 13.6l-2.2 4M12 13.6l2.2 4" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  settings: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  battery: <><rect x="2" y="7" width="16" height="10" rx="2" /><path d="M22 11v2M6 12h4" /></>,
  health: <><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /><path d="M3.2 12H8l1.5-3 3 6 1.5-3h4.8" /></>,
  megaphone: <><path d="m3 11 18-5v12L3 14z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  phone: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
  'volume-off': <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="m22 9-6 6M16 9l6 6" /></>,
  speak: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" /><path d="M2 21c0-3 1.9-5.5 6-7" /></>,
  utensils: <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.2-.2-4.1 1-5 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.4 1-3 0 1.4 1.1 2.5 2.5 2.5z" />,
  lantern: <><path d="M9 2h6M10 2v3M14 2v3" /><rect x="6" y="5" width="12" height="14" rx="5" /><path d="M9 22h6M12 19v3" /></>,
  snowflake: <path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7" />,
  bucket: <><path d="M4 8h16l-2 13H6z" /><ellipse cx="12" cy="8" rx="8" ry="2.5" /></>,
  bus: <><rect x="4" y="3" width="16" height="15" rx="2" /><path d="M4 11h16M8 18v3M16 18v3M8 15h.01M16 15h.01" /></>,
  car: <><path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /><path d="M3 12h18" /></>,
  box: <><path d="m7.5 4.3 9 5.2M21 8v8l-9 5-9-5V8l9-5z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  rain: <><path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" /><path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2" /></>,
  thermometer: <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z" />,
  wind: <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  'cloud-sun': <><path d="M12 2v2M4.9 4.9l1.4 1.4M20 12h2M19.1 4.9l-1.4 1.4M15.9 8a4 4 0 0 0-7.2 1.3" /><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z" /></>,
}

export default function Icon({ name, className = '' }) {
  return (
    <svg className={`ico ${className}`.trim()} viewBox="0 0 24 24" fill={DUO.has(name) || name === 'logo' ? 'currentColor' : 'none'} fillOpacity={DUO.has(name) ? 0.18 : 0.25} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || null}
    </svg>
  )
}
