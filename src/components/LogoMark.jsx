import { useId } from 'react'

// The Kasi Grid mark: two overlapping neighbourhoods, amethyst and azure (the team colours), a heartbeat running through
// them and a bright pulse of power at the centre. Static artwork, so it is injected as markup with unique gradient ids.
const ART = "\n  <defs>\n    <linearGradient id=\"__ID__a\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#c4a3ff\"/><stop offset=\"1\" stop-color=\"#7a45d6\"/></linearGradient>\n    <linearGradient id=\"__ID__b\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6fd0ff\"/><stop offset=\"1\" stop-color=\"#1f7be8\"/></linearGradient>\n    <linearGradient id=\"__ID__p\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#3b1f8f\"/><stop offset=\"1\" stop-color=\"#0b4fb3\"/></linearGradient>\n    <radialGradient id=\"__ID__s\"><stop offset=\"0\" stop-color=\"#fffbe0\"/><stop offset=\".45\" stop-color=\"#ffe066\"/><stop offset=\"1\" stop-color=\"#ffb81f\"/></radialGradient>\n    <radialGradient id=\"__ID__g\"><stop offset=\"0\" stop-color=\"#ffe9a0\" stop-opacity=\".9\"/><stop offset=\"1\" stop-color=\"#ffe9a0\" stop-opacity=\"0\"/></radialGradient>\n  </defs>\n  <circle cx=\"48\" cy=\"66\" r=\"27\" fill=\"url(#__ID__a)\" opacity=\".5\"/>\n  <circle cx=\"192\" cy=\"66\" r=\"27\" fill=\"url(#__ID__b)\" opacity=\".5\"/>\n  <circle cx=\"94\" cy=\"64\" r=\"52\" fill=\"url(#__ID__a)\" opacity=\".72\"/>\n  <circle cx=\"146\" cy=\"64\" r=\"52\" fill=\"url(#__ID__b)\" opacity=\".72\"/>\n  <path d=\"M2 66H58C66 66 68 28 78 28C88 28 90 102 100 102C106 102 108 66 114 66H126C132 66 134 26 144 26C154 26 156 100 164 100C170 100 172 66 180 66H238\" fill=\"none\" stroke=\"url(#__ID__p)\" stroke-width=\"5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <circle cx=\"120\" cy=\"64\" r=\"34\" fill=\"url(#__ID__g)\"/>\n  <polygon points=\"120.0,33.0 122.3,55.3 135.5,37.2 126.4,57.6 146.8,48.5 128.7,61.7 151.0,64.0 128.7,66.3 146.8,79.5 126.4,70.4 135.5,90.8 122.3,72.7 120.0,95.0 117.7,72.7 104.5,90.8 113.6,70.4 93.2,79.5 111.3,66.3 89.0,64.0 111.3,61.7 93.2,48.5 113.6,57.6 104.5,37.2 117.7,55.3\" fill=\"url(#__ID__s)\"/>"

export default function LogoMark({ className = '', title }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={`logo-mark ${className}`.trim()} viewBox="0 0 240 130" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'} dangerouslySetInnerHTML={{ __html: ART.replaceAll('__ID__', id) }} />
  )
}

// Mark plus name and tagline, as in the brand sheet.
export function LogoLockup({ tagline = true }) {
  return (
    <div className="lockup">
      <LogoMark />
      <b className="wm"><span>Kasi</span><span>Grid</span></b>
      {tagline && <small>Know before it goes dark</small>}
    </div>
  )
}
