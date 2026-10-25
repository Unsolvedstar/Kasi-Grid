// A more accurate "where am I". The first reading a phone gives is often a rough one from Wi-Fi or a cell tower, sometimes
// hundreds of metres out. This asks for GPS, keeps listening, and settles on the best reading it sees: it stops early once
// the reading is good enough, and otherwise after a time limit with the best it has.
export function bestFix({ target = 25, timeout = 15000, onProgress } = {}) {
  return new Promise((done) => {
    if (!navigator.geolocation) return done({ fix: null, error: 'unsupported' })
    let best = null
    let finished = false
    let id = null
    const end = (error) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (id != null) navigator.geolocation.clearWatch(id)
      done(best ? { fix: best, error: null } : { fix: null, error })
    }
    const timer = setTimeout(() => end('timeout'), timeout)
    id = navigator.geolocation.watchPosition(
      (p) => {
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), ts: Date.now() }
        if (!best || fix.acc < best.acc) { best = fix; onProgress?.(best) }
        if (best.acc <= target) end(null)
      },
      (e) => end(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout },
    )
  })
}

// Plain words for how good a fix is.
export const accuracyWords = (acc) => (acc <= 30 ? 'very accurate' : acc <= 100 ? 'accurate' : acc <= 500 ? 'rough' : 'very rough')
