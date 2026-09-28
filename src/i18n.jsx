import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LOCALES } from './locales.js'

// Language names are shown in their own language. Non-English translations are drafts awaiting native review.
export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'zu', label: 'isiZulu (draft)' },
  { id: 'st', label: 'Sesotho (draft)' },
  { id: 'af', label: 'Afrikaans (draft)' },
]

const Ctx = createContext({ t: (s) => s, lang: 'en', setLang: () => {} })

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s)

function initialLang() {
  try {
    const saved = localStorage.getItem('kg2.lang')
    if (saved && LANGS.some((l) => l.id === saved)) return saved
  } catch {
    /* storage unavailable */
  }
  const guess = (navigator.language || 'en').slice(0, 2)
  return LANGS.some((l) => l.id === guess) ? guess : 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  const setLang = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem('kg2.lang', l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const value = useMemo(() => {
    const dict = LOCALES[lang]
    return { lang, setLang, t: (key, vars) => fill((dict && dict[key]) || key, vars) }
  }, [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useT = () => useContext(Ctx).t
export const useLang = () => useContext(Ctx)
