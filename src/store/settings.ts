import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Layout = 'mobile' | 'browser'
export type Lang = 'en' | 'ms'

interface SettingsState {
  /** null means "use the role default for the current page". */
  layout: Layout | null
  lang: Lang
  reducedMotion: boolean
  setLayout: (layout: Layout | null) => void
  setLang: (lang: Lang) => void
  setReducedMotion: (on: boolean) => void
}

// The persisted key is also read by the inline script in index.html to avoid a layout flash.
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      layout: null,
      lang: 'en',
      reducedMotion: false,
      setLayout: (layout) => set({ layout }),
      setLang: (lang) => set({ lang }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: 'smartflow-settings', version: 1 },
  ),
)

/** Residents get the mobile shell, operators (/ops) get the browser shell. */
export const defaultLayoutFor = (pathname: string): Layout =>
  pathname.startsWith('/ops') ? 'browser' : 'mobile'

export function useEffectiveLayout(pathname: string): Layout {
  const layout = useSettings((s) => s.layout)
  return layout ?? defaultLayoutFor(pathname)
}

export function usePrefersReducedMotion(): boolean {
  const inApp = useSettings((s) => s.reducedMotion)
  const os = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return inApp || os
}
