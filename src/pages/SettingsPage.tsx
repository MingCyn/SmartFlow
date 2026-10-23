import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LocationPrompt } from '../components/LocationPrompt'
import { useLiveLocation } from '../store/location'
import { useT, type TKey } from '../i18n'
import { useEffectiveLayout, useSettings, type Lang, type Layout } from '../store/settings'

const LAYOUTS: { value: Layout; label: TKey; desc: TKey }[] = [
  { value: 'mobile', label: 'settings.layoutMobile', desc: 'settings.layoutMobileDesc' },
  { value: 'browser', label: 'settings.layoutBrowser', desc: 'settings.layoutBrowserDesc' },
]
const LANGS: Lang[] = ['en', 'ms']

const optionClass =
  'flex cursor-pointer gap-3 rounded-xl border-2 transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] border-slate-200 bg-white p-4 hover:border-slate-400 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600'

export default function SettingsPage() {
  const t = useT()
  const { pathname } = useLocation()
  const { layout, lang, reducedMotion, name, setLayout, setLang, setReducedMotion, setName } = useSettings()
  const geo = useLiveLocation()
  const selected = useEffectiveLayout(pathname)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('settings.title')} subtitle={t('settings.intro')} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <label htmlFor="name" className="text-lg font-semibold">
            {t('settings.name')}
          </label>
          <p id="name-desc" className="text-slate-700">
            {t('settings.nameDesc')}
          </p>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            aria-describedby="name-desc"
            maxLength={40}
            className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 focus:border-primary-600"
          />
        </section>

        <section aria-labelledby="loc-settings-h" className="space-y-2">
          <h2 id="loc-settings-h" className="px-1 text-lg font-semibold">
            {t('settings.location')}
          </h2>
          {geo.status === 'ok' || (geo.status === 'locating' && geo.permission !== 'prompt') ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-800">{t(geo.status === 'ok' ? 'loc.on' : 'report.locating')}</p>
          ) : (
            <LocationPrompt />
          )}
        </section>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-lg font-semibold">{t('settings.layout')}</legend>
          <div className="mt-2 grid gap-3 browser:grid-cols-2">
            {LAYOUTS.map((o) => (
              <label key={o.value} className={optionClass}>
                <input
                  type="radio"
                  name="layout"
                  value={o.value}
                  checked={selected === o.value}
                  onChange={() => setLayout(o.value)}
                  className="mt-1 size-5 shrink-0 accent-primary-700 focus:outline-none"
                />
                <span>
                  <span className="block font-semibold">{t(o.label)}</span>
                  <span className="block text-slate-700">{t(o.desc)}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-slate-700" aria-live="polite">
            {layout === null ? (
              t('settings.layoutAuto')
            ) : (
              <button
                type="button"
                onClick={() => setLayout(null)}
                className="rounded font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
              >
                {t('settings.layoutReset')}
              </button>
            )}
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-lg font-semibold">{t('settings.language')}</legend>
          <div className="mt-2 grid gap-3 browser:grid-cols-2">
            {LANGS.map((l) => (
              <label key={l} className={optionClass}>
                <input
                  type="radio"
                  name="lang"
                  value={l}
                  checked={lang === l}
                  onChange={() => setLang(l)}
                  className="mt-1 size-5 shrink-0 accent-primary-700 focus:outline-none"
                />
                <span className="font-semibold" lang={l}>
                  {t(l === 'en' ? 'lang.en' : 'lang.ms')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <p id="motion-label" className="text-lg font-semibold">
              {t('settings.motion')}
            </p>
            <p id="motion-desc" className="text-slate-700">
              {t('settings.motionDesc')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reducedMotion}
            aria-labelledby="motion-label"
            aria-describedby="motion-desc"
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors ${
              reducedMotion ? 'border-primary-700 bg-primary-700' : 'border-slate-500 bg-slate-200'
            }`}
          >
            <span
              aria-hidden
              className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
