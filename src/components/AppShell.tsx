import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type MouseEvent, type PointerEvent } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Camera, ClipboardList, LayoutDashboard, LifeBuoy, Settings } from 'lucide-react'
import { useEffectiveLayout, useSettings } from '../store/settings'
import { useWeather } from '../store/weather'
import { HEAVY_RAIN_3H_MM } from '../services/weather'
import { useT, type TKey } from '../i18n'
import { MascotIcon } from './mascot/Mascot'

interface Tab {
  to: string
  label: TKey
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean; strokeWidth?: number }>
  primary?: boolean
}

// Report sits in the middle as the round fast-report button.
const TABS: Tab[] = [
  { to: '/ops', label: 'nav.ops', Icon: LayoutDashboard },
  { to: '/advice', label: 'nav.advice', Icon: LifeBuoy },
  { to: '/report', label: 'nav.report', Icon: Camera, primary: true },
  { to: '/status', label: 'nav.status', Icon: ClipboardList },
  { to: '/chat', label: 'nav.chat', Icon: MascotIcon },
]

/** Light tap feedback on phones that support it. */
const tap = () => navigator.vibrate?.(8)

export function AppShell() {
  const t = useT()
  const { pathname } = useLocation()
  const layout = useEffectiveLayout(pathname)
  const lang = useSettings((s) => s.lang)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const { weather } = useWeather()
  const heavyRain = !!weather && weather.next3hMm >= HEAVY_RAIN_3H_MM
  const [scrolled, setScrolled] = useState(false)

  // Press-and-hold on touch shows the tab name; it lingers briefly after release.
  const [peek, setPeek] = useState<string | null>(null)
  const holdTimer = useRef(0)
  const hideTimer = useRef(0)
  function startPeek(e: PointerEvent, to: string) {
    if (e.pointerType === 'mouse') return
    window.clearTimeout(hideTimer.current)
    holdTimer.current = window.setTimeout(() => {
      setPeek(to)
      navigator.vibrate?.(5)
    }, 350)
  }
  function endPeek() {
    window.clearTimeout(holdTimer.current)
    hideTimer.current = window.setTimeout(() => setPeek(null), 700)
  }

  // The shell switches purely through <html data-layout>, so toggling needs no reload.
  useLayoutEffect(() => {
    const html = document.documentElement
    html.dataset.layout = layout
    html.lang = lang
    if (reducedMotion) html.dataset.motion = 'reduced'
    else delete html.dataset.motion
  }, [layout, lang, reducedMotion])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // New page starts at the top, like a native tab switch.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const activeIndex = TABS.findIndex((tab) => pathname.startsWith(tab.to))
  const pillVisible = activeIndex >= 0 && !TABS[activeIndex].primary

  return (
    <div className="min-h-dvh mobile:bg-slate-300">
      <a
        href="#main"
        className="sr-only z-[1200] rounded bg-white px-4 py-2 font-semibold text-primary-700 focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        {t('app.skip')}
      </a>

      <div className="mx-auto flex min-h-dvh flex-col bg-slate-50 mobile:max-w-[420px] mobile:shadow-xl browser:max-w-[1280px]">
        {/* Floating header: a white bar inset from the edges, so content (and the sky) shows around it. */}
        <header style={{ viewTransitionName: 'app-header' }} className="pointer-events-none sticky top-0 z-[1100] px-3 pt-2 browser:px-4 browser:pt-3">
          <div
            className={`pointer-events-auto flex h-14 items-center gap-3 rounded-2xl border bg-white px-3 transition-[box-shadow,border-color] duration-200 browser:px-5 ${
              scrolled
                ? 'border-slate-200/80 shadow-[0_10px_28px_-14px_rgb(15_23_42/0.4)]'
                : 'border-slate-200/60 shadow-[0_2px_8px_-4px_rgb(15_23_42/0.12)]'
            }`}
          >
            <NavLink to="/report" viewTransition className="flex items-center gap-2 rounded font-bold text-primary-800">
              <img src="/icons/icon.svg" alt="" width={28} height={28} />
              <span className="text-lg leading-tight">
                {t('app.name')}
                <span aria-hidden className="mt-0.5 block h-0.5 w-6 rounded bg-sdp" />
              </span>
            </NavLink>
            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-sm text-slate-700">{t('app.demo')}</span>

            <nav
              aria-label={t('nav.label')}
              style={{ viewTransitionName: 'app-tabs' }}
              className="browser:ml-auto mobile:fixed mobile:bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] mobile:left-1/2 mobile:z-[1100] mobile:w-[calc(100%-1.5rem)] mobile:max-w-[396px] mobile:-translate-x-1/2 mobile:rounded-[1.75rem] mobile:border mobile:border-slate-200/80 mobile:bg-white mobile:shadow-[0_14px_36px_-12px_rgb(15_23_42/0.38)]"
            >
              {/* Sliding pill behind the active tab icon (mobile). Five equal columns, so the offset is the index. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute left-0 top-1/2 flex h-10 w-1/5 justify-center transition-[transform,opacity] duration-300 ease-(--ease-out-quint) browser:hidden ${
                  pillVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transform: `translate(${Math.max(activeIndex, 0) * 100}%, -50%)` }}
              >
                <span className="h-full w-14 rounded-full bg-primary-100" />
              </span>

              <ul className="relative flex items-end mobile:grid mobile:h-16 mobile:grid-cols-5 mobile:items-center browser:items-center browser:gap-1">
                {TABS.map(({ to, label, Icon, primary }) => {
                  // Phone view is icon-only. The name floats above on hover, keyboard focus, or press-and-hold.
                  const tip = (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-semibold text-white opacity-0 shadow-lg transition-[opacity,translate,scale] duration-150 ease-(--ease-out-quart) group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 browser:hidden ${
                        peek === to ? 'translate-y-0 scale-100 opacity-100' : ''
                      }`}
                    >
                      {t(label)}
                    </span>
                  )
                  const holdProps = {
                    onPointerDown: (e: PointerEvent) => startPeek(e, to),
                    onPointerUp: endPeek,
                    onPointerCancel: endPeek,
                    onPointerLeave: endPeek,
                    onContextMenu: (e: MouseEvent) => e.preventDefault(),
                  }
                  return (
                    <li key={to} className="flex justify-center">
                      {primary ? (
                        <NavLink
                          to={to}
                          viewTransition
                          aria-label={t(label)}
                          onClick={tap}
                          {...holdProps}
                          className="group relative flex select-none items-center font-semibold [-webkit-touch-callout:none] browser:mx-1 browser:gap-2 browser:rounded-full browser:bg-primary-700 browser:py-1.5 browser:pl-1.5 browser:pr-4 browser:text-white browser:transition-colors browser:hover:bg-primary-800 mobile:-translate-y-4"
                        >
                          {({ isActive }) => (
                            <>
                              {tip}
                              <span
                                className={`relative flex items-center justify-center rounded-full bg-primary-700 text-white transition-[transform,background-color] duration-150 ease-(--ease-out-quart) group-hover:bg-primary-800 group-active:scale-[0.92] mobile:size-16 mobile:shadow-[0_10px_22px_-8px_rgb(24_63_128/0.65)] mobile:ring-4 browser:size-8 ${
                                  isActive ? 'mobile:ring-primary-100' : 'mobile:ring-white'
                                }`}
                              >
                                {/* Heavy rain on the way: a slow amber halo invites a report. */}
                                {heavyRain && !isActive && (
                                  <span aria-hidden className="absolute inset-0 animate-halo rounded-full bg-amber-400 browser:hidden" />
                                )}
                                <Icon aria-hidden className="relative mobile:size-7 browser:size-5" />
                              </span>
                              <span className="mobile:hidden">{t(label)}</span>
                            </>
                          )}
                        </NavLink>
                      ) : (
                        <NavLink
                          to={to}
                          viewTransition
                          aria-label={t(label)}
                          {...holdProps}
                          className={({ isActive }) =>
                            [
                              'group relative flex select-none items-center justify-center rounded-xl transition-colors duration-200 [-webkit-touch-callout:none]',
                              'mobile:size-14',
                              'browser:gap-2 browser:rounded-full browser:px-3.5 browser:py-2',
                              isActive
                                ? 'font-semibold text-primary-800 browser:bg-primary-50'
                                : 'font-medium text-slate-600 hover:text-slate-900 browser:hover:bg-slate-100',
                            ].join(' ')
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {tip}
                              <span className="flex items-center justify-center transition-transform duration-150 ease-(--ease-out-quart) group-active:scale-90">
                                <Icon aria-hidden strokeWidth={isActive ? 2.4 : 2} className="size-[1.6rem] browser:size-5" />
                              </span>
                              <span className="mobile:hidden">{t(label)}</span>
                            </>
                          )}
                        </NavLink>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>

            <NavLink
              to="/settings"
              viewTransition
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
              className={({ isActive }) =>
                `group flex size-11 items-center justify-center rounded-full transition-colors duration-200 mobile:ml-auto ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Settings aria-hidden className="size-6 transition-transform duration-300 ease-(--ease-out-quint) group-hover:rotate-45 group-active:scale-90" />
            </NavLink>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-5 outline-none mobile:pb-36 browser:px-6 browser:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
