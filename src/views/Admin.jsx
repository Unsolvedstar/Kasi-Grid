import { useCallback, useEffect, useState } from 'react'
import { timeAgo } from '../lib.js'
import { SUBURBS } from '../../shared/suburbs.js'

const KINDS = { reports: 'Reports', shares: 'Board posts', places: 'Places' }
const FILTERS = { attention: 'Needs attention', all: 'All', hidden: 'Hidden' }

async function call(token, path, body) {
  const r = await fetch('/api/admin' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(data?.error || `Request failed (${r.status})`), { status: r.status })
  return data
}

export default function Admin() {
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('kg2.admin') || ''
    } catch {
      return ''
    }
  })
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [kind, setKind] = useState('reports')
  const [filter, setFilter] = useState('attention')

  const load = useCallback(
    async (tk) => {
      try {
        setData(await call(tk, '/overview'))
        setErr('')
      } catch (e) {
        setData(null)
        if (e.status === 401) {
          setToken('')
          try {
            sessionStorage.removeItem('kg2.admin')
          } catch {
            /* ignore */
          }
        }
        setErr(e.status === 404 ? 'Admin is not enabled on this server (ADMIN_TOKEN is not set).' : e.message)
      }
    },
    [],
  )

  useEffect(() => {
    if (token) load(token)
  }, [token, load])

  const signIn = (e) => {
    e.preventDefault()
    const tk = input.trim()
    if (!tk) return
    try {
      sessionStorage.setItem('kg2.admin', tk)
    } catch {
      /* ignore */
    }
    setToken(tk)
    setInput('')
  }

  const act = async (item, action) => {
    if (action === 'delete' && !window.confirm('Delete this permanently? This cannot be undone.')) return
    try {
      await call(token, `/${item.kind}/${item.id}`, { action })
      await load(token)
    } catch (e) {
      setErr(e.message)
    }
  }

  if (!token)
    return (
      <div className="admin">
        <h1>Kasi Grid admin</h1>
        <form className="card form" onSubmit={signIn}>
          <label className="fields">
            <span className="muted">Admin token</span>
            <input type="password" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
          </label>
          {err && <p className="notice" role="alert">{err}</p>}
          <button className="primary" disabled={!input.trim()}>Sign in</button>
        </form>
      </div>
    )

  const items = (data?.items || [])
    .filter((i) => i.kind === kind)
    .filter((i) => (filter === 'all' ? true : filter === 'hidden' ? i.hidden : !i.hidden && i.flags > 0))

  return (
    <div className="admin">
      <div className="bar">
        <h1>Kasi Grid admin</h1>
        <div className="chips">
          <button className="ghost" onClick={() => load(token)}>Refresh</button>
          <button
            className="ghost"
            onClick={() => {
              try {
                sessionStorage.removeItem('kg2.admin')
              } catch {
                /* ignore */
              }
              setToken('')
              setData(null)
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {err && <p className="notice" role="alert">{err}</p>}

      {data && (
        <div className="stats">
          <div className="stat"><span className="muted small">Items</span><strong>{data.stats.total}</strong></div>
          <div className="stat"><span className="muted small">New in 24h</span><strong>{data.stats.last24h}</strong></div>
          <div className="stat"><span className="muted small">Flagged</span><strong>{data.stats.flagged}</strong></div>
          <div className="stat"><span className="muted small">Hidden</span><strong>{data.stats.hidden}</strong></div>
        </div>
      )}

      {data?.namc && <NamcPanel namc={data.namc} token={token} reload={() => load(token)} />}
      <EspPanel token={token} />

      <section className="card">
        <div className="bar">
          <div className="chips">
            {Object.entries(KINDS).map(([k, label]) => (
              <button key={k} className={kind === k ? 'chip on' : 'chip'} onClick={() => setKind(k)}>{label}</button>
            ))}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
            {Object.entries(FILTERS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        {data && items.length === 0 && <p className="muted">Nothing to show here.</p>}
        <ul className="list">
          {items.map((i) => (
            <li key={`${i.kind}-${i.id}`} className={`row ${i.hidden ? 'hiddenrow' : ''}`}>
              <div className={i.flags > 0 ? 'flagged' : ''}>
                <p><strong>{i.title}</strong></p>
                <p className="muted small">{i.detail}</p>
                <p className="muted small">
                  {timeAgo(i.ts)} · from device {i.owner || 'unknown'}
                  {i.flags > 0 && <span className="badge ask" style={{ marginLeft: 6 }}>{i.flags} flag{i.flags === 1 ? '' : 's'}</span>}
                  {i.hidden && <span className="badge sample" style={{ marginLeft: 6 }}>Hidden</span>}
                  {i.sample && <span className="badge sample" style={{ marginLeft: 6 }}>Sample</span>}
                  {i.done && <span className="badge sample" style={{ marginLeft: 6 }}>Closed</span>}
                </p>
              </div>
              <div className="stack">
                {i.hidden ? (
                  <button className="ghost" onClick={() => act(i, 'unhide')}>Restore</button>
                ) : (
                  <button className="ghost" onClick={() => act(i, 'hide')}>Hide</button>
                )}
                <button className="danger" onClick={() => act(i, 'delete')}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function NamcPanel({ namc, token, reload }) {
  const [busy, setBusy] = useState(false)
  const last = namc.lastCheck
  const check = async () => {
    setBusy(true)
    try {
      await call(token, '/refresh-namc', {})
    } catch {
      /* the result is recorded server side and shown after reload */
    }
    setBusy(false)
    reload()
  }
  return (
    <section className="card">
      <div className="bar">
        <h2>National food prices (NAMC)</h2>
        <button className="ghost" onClick={check} disabled={busy}>{busy ? 'Checking…' : 'Check for a new report'}</button>
      </div>
      <p>
        In use: <strong>{namc.current.period}</strong> (issue {namc.current.issueNo}, {namc.current.source === 'live' ? 'imported automatically' : 'bundled with the app'}).
      </p>
      {last ? (
        <p className={last.ok ? 'muted small' : 'notice'}>
          Last check {timeAgo(last.at)}: {last.message}
        </p>
      ) : (
        <p className="muted small">The server checks NAMC once a day. It has not run yet.</p>
      )}
    </section>
  )
}

function EspPanel({ token }) {
  const [info, setInfo] = useState(null)
  const [text, setText] = useState('')
  const [areas, setAreas] = useState([])
  const [pick, setPick] = useState({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      setInfo(await call(token, '/esp'))
    } catch (e) {
      setMsg(e.message)
    }
  }, [token])
  useEffect(() => {
    load()
  }, [load])

  const search = async (e) => {
    e.preventDefault()
    try {
      setAreas((await call(token, '/esp/search?text=' + encodeURIComponent(text))).areas)
      setMsg('')
    } catch (x) {
      setAreas([])
      setMsg(x.message)
    }
  }
  const map = async (area) => {
    const suburb = pick[area.id]
    if (!suburb) return setMsg('Choose a suburb first')
    try {
      await call(token, '/esp/map', { suburb, areaId: area.id, areaName: area.name })
      setMsg(`Linked ${area.name} to ${SUBURBS.find((s) => s.id === suburb).name}`)
      load()
    } catch (x) {
      setMsg(x.message)
    }
  }
  const unmap = async (suburb) => {
    await call(token, '/esp/unmap', { suburb })
    load()
  }
  const autolink = async () => {
    setMsg('Linking suburbs by location…')
    try {
      const { results } = await call(token, '/esp/autolink', {})
      const n = (st) => results.filter((r) => r.status === st).length
      setMsg(`Linked ${n('linked')}, none found ${n('none')}, skipped ${n('skipped')}, errors ${n('error')}${results.find((r) => r.status === 'error') ? ': ' + results.find((r) => r.status === 'error').message : ''}`)
      load()
    } catch (x) {
      setMsg(x.message)
    }
  }
  const test = async () => {
    try {
      setMsg((await call(token, '/esp/test', {})).message)
    } catch (x) {
      setMsg(x.message)
    }
  }

  return (
    <section className="card">
      <div className="bar">
        <h2>Real loadshedding schedules (EskomSePush)</h2>
        {info?.enabled && (
          <div className="chips">
            <button className="ghost" onClick={autolink}>Link suburbs by location</button>
            <button className="ghost" onClick={test}>Test connection</button>
          </div>
        )}
      </div>
      {!info ? (
        <p className="muted">Loading…</p>
      ) : !info.enabled ? (
        <p className="notice">Not enabled. Set <code>ESP_TOKEN</code> on the server (a free key from sepush.co.za) to show official time slots instead of the illustrative pattern.</p>
      ) : (
        <>
          <p className="muted small">API calls made today: {info.callsToday}{info.quota ? `, ${info.quota.remaining} of ${info.quota.limit} credits left` : ''}. Schedules are cached for 12 hours.</p>
          {info.mappings.length > 0 && (
            <ul className="list">
              {info.mappings.map((m) => (
                <li key={m.suburb} className="row">
                  <div><strong>{SUBURBS.find((s) => s.id === m.suburb)?.name || m.suburb}</strong><p className="muted small">{m.areaName} ({m.areaId})</p></div>
                  <button className="ghost" onClick={() => unmap(m.suburb)}>Unlink</button>
                </li>
              ))}
            </ul>
          )}
          <form className="form inline" onSubmit={search}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search an area, e.g. Alexandra" />
            <button className="primary" disabled={text.trim().length < 2}>Search</button>
          </form>
          <ul className="list">
            {areas.map((a) => (
              <li key={a.id} className="row">
                <div><strong>{a.name}</strong><p className="muted small">{a.region}</p></div>
                <div className="stack">
                  <select value={pick[a.id] || ''} onChange={(e) => setPick({ ...pick, [a.id]: e.target.value })} aria-label="Suburb">
                    <option value="">Link to…</option>
                    {SUBURBS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button className="ghost" onClick={() => map(a)}>Link</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && <p className="muted small" role="status">{msg}</p>}
    </section>
  )
}
