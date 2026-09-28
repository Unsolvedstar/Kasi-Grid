import { useCallback, useEffect, useRef, useState } from 'react'

// Anonymous per-device id. It lets the server allow one confirmation per device and lets authors close their own posts.
function deviceId() {
  try {
    let id = localStorage.getItem('kg2.device')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('kg2.device', id)
    }
    return id
  } catch {
    return 'session-' + Math.random().toString(36).slice(2).padEnd(16, '0')
  }
}
const DEVICE = deviceId()

export async function api(path, { method = 'GET', body } = {}) {
  let r
  try {
    r = await fetch('/api' + path, {
      method,
      headers: { 'X-Device-Id': DEVICE, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('No connection. Check your signal and try again.'), { offline: true })
  }
  let data = null
  try {
    data = await r.json()
  } catch {
    /* non-JSON error page */
  }
  if (!r.ok) throw new Error(data?.error || `Request failed (${r.status})`)
  return data
}

// New reports and board posts made without a connection wait here and are sent when the signal returns.
const QUEUE_KEY = 'kg2.queue'
const readQueue = () => {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    return Array.isArray(q) ? q : []
  } catch {
    return []
  }
}
const writeQueue = (q) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch {
    /* storage unavailable: the post is lost, but the user was told it was queued only if this worked */
  }
}

// Shared community data, refreshed every 30 seconds and after every action.
export function useCommunity() {
  const [data, setData] = useState({ reports: [], shares: [], places: [], prices: {} })
  const [status, setStatus] = useState('loading') // loading | ok | error
  const alive = useRef(true)
  const [queued, setQueued] = useState(() => readQueue().length)
  const flushing = useRef(false)

  const refreshAfterFlush = () => {
    if (!readQueue().length) refresh()
  }

  // Send queued posts oldest first. Stop at the first lost connection; drop a post the server refuses for good (invalid input).
  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      let q = readQueue()
      while (q.length) {
        try {
          await api(q[0].path, { method: 'POST', body: q[0].body })
        } catch (e) {
          if (e.offline || /Too many/i.test(e.message)) break
        }
        q = q.slice(1)
        writeQueue(q)
        if (alive.current) setQueued(q.length)
      }
    } finally {
      flushing.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [r, s, p, pr] = await Promise.all([api('/reports'), api('/shares'), api('/places'), api('/prices')])
      const prices = {}
      for (const x of pr.prices) (prices[x.placeId] ||= {})[x.item] = { price: x.price, ts: x.ts }
      if (alive.current) {
        setData({ reports: r.reports, shares: s.shares, places: p.places, prices })
        setStatus('ok')
      }
      if (readQueue().length) flush().then(() => alive.current && refreshAfterFlush())
    } catch {
      if (alive.current) setStatus('error')
    }
  }, [])

  useEffect(() => {
    alive.current = true
    refresh()
    const t = setInterval(refresh, 30000)
    window.addEventListener('online', refresh)
    return () => {
      alive.current = false
      clearInterval(t)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  // Every action posts, then refreshes. Errors propagate so the view can show them.
  const act = (path, body) => api(path, { method: 'POST', body }).then((x) => refresh().then(() => x))
  // Creating a report or post survives a lost connection: it is queued on this phone and sent later.
  const actQueued = (path, body) =>
    act(path, body).catch((e) => {
      if (!e.offline) throw e
      writeQueue([...readQueue(), { path, body, at: Date.now() }])
      setQueued(readQueue().length)
      return { queued: true }
    })
  const actions = {
    addReport: (b) => actQueued('/reports', b),
    confirmReport: (id) => act(`/reports/${id}/confirm`),
    addShare: (b) => actQueued('/shares', b),
    interested: (id) => act(`/shares/${id}/interest`),
    closeShare: (id) => act(`/shares/${id}/done`),
    addPlace: (b) => act('/places', b),
    setPrice: (placeId, item, price) => act('/prices', { placeId, item, price }),
    flag: (kind, id) => act(`/flag/${kind}/${id}`),
  }
  return { ...data, status, queued, actions }
}
