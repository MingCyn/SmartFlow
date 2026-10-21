import { useLayoutEffect, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Camera, ClipboardList, LayoutDashboard, LifeBuoy, Settings } from 'lucide-react'
import { useEffectiveLayout, useSettings } from '../store/settings'
import { useT, type TKey } from '../i18n'
import { MascotIcon } from './mascot/Mascot'

interface Tab {
  to: string
  label: TKey
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
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

export function AppShell() {
  const t = useT()
  const { pathname } = useLocation()
  const layout = useEffectiveLayout(pathname)
  const lang = useSettings((s) => s.lang)
  const reducedMotion = useSettings((s) => s.reducedMotion)

  // The shell switches purely through <html data-layout>, so toggling needs no reload.
  useLayoutEffect(() => {
    const html = document.documentElement
    html.dataset.layout = layout
    html.lang = lang
    if (reducedMotion) html.dataset.motion = 'reduced'
    else delete html.dataset.motion
  }, [layout, lang, reducedMotion])

  return (
    <div className="min-h-dvh mobile:bg-slate-300">
      <a
        href="#main"
        className="sr-only z-[1200] rounded bg-white px-4 py-2 font-semibold text-primary-700 focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        {t('app.skip')}
      </a>

      <div className="mx-auto flex min-h-dvh flex-col bg-slate-50 mobile:max-w-[420px] mobile:shadow-xl browser:max-w-[1280px]">
        <header className="sticky top-0 z-[1100] border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-3 px-4 browser:px-6">
            <NavLink to="/report" className="flex items-center gap-2 rounded font-bold text-primary-800">
              <img src="/icons/icon.svg" alt="" width={28} height={28} />
              <span className="text-lg leading-tight">
                {t('app.name')}
                <span aria-hidden className="mt-0.5 block h-0.5 w-6 rounded bg-sdp" />
              </span>
            </NavLink>
            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-sm text-slate-700">{t('app.demo')}</span>

            <nav
              aria-label={t('nav.label')}
              className="browser:ml-auto mobile:fixed mobile:bottom-0 mobile:left-1/2 mobile:z-[1100] mobile:w-full mobile:max-w-[420px] mobile:-translate-x-1/2 mobile:border-t mobile:border-slate-200 mobile:bg-white mobile:pb-[env(safe-area-inset-bottom)]"
            >
              <ul className="flex items-end mobile:justify-around browser:items-center browser:gap-1">
                {TABS.map(({ to, label, Icon, primary }) => (
                  <li key={to} className="mobile:flex-1">
                    {primary ? (
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          [
                            'group flex items-center font-semibold',
                            'mobile:-mt-7 mobile:flex-col mobile:gap-0.5 mobile:pb-1.5 mobile:text-sm',
                            'browser:mx-1 browser:gap-2 browser:rounded-full browser:bg-primary-700 browser:py-1.5 browser:pl-1.5 browser:pr-4 browser:text-white browser:hover:bg-primary-800',
                            isActive ? 'text-primary-800' : 'text-slate-800',
                          ].join(' ')
                        }
                      >
                        <span className="flex items-center justify-center rounded-full bg-primary-700 text-white shadow-lg transition-transform group-hover:bg-primary-800 group-active:scale-95 mobile:size-16 mobile:ring-4 mobile:ring-white browser:size-8 browser:shadow-none">
                          <Icon aria-hidden className="mobile:size-7 browser:size-5" />
                        </span>
                        <span>{t(label)}</span>
                      </NavLink>
                    ) : (
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          [
                            'flex items-center rounded-lg font-medium transition-colors',
                            'mobile:min-h-16 mobile:flex-col mobile:justify-center mobile:gap-0.5 mobile:px-1 mobile:text-sm',
                            'browser:gap-2 browser:px-3 browser:py-2',
                            isActive ? 'bg-primary-50 font-semibold text-primary-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                          ].join(' ')
                        }
                      >
                        <Icon aria-hidden className="size-6 browser:size-5" />
                        <span>{t(label)}</span>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <NavLink
              to="/settings"
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
              className={({ isActive }) =>
                `flex size-11 items-center justify-center rounded-full mobile:ml-auto ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Settings aria-hidden className="size-6" />
            </NavLink>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-5 outline-none mobile:pb-28 browser:px-6 browser:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
