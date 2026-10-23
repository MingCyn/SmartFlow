import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Check, ChevronRight, Droplets, ExternalLink, MapPin, Phone } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { SkyHero } from '../components/SkyHero'
import { AdviceCard, LifeCriticalList } from '../components/AdviceCard'
import { ZoneGuide } from '../components/ZoneGuide'
import { useT } from '../i18n'
import { distanceKm } from '../lib/geo'
import { useAsync } from '../lib/useAsync'
import { CELL_GEOMETRY } from '../services/cells'
import { readLocal, writeLocal } from '../services/client'
import { getSafety } from '../services/safety'
import { useSettings } from '../store/settings'

const CHECKLIST_KEY = 'smartflow-checklist'
const DEFAULT_CELL = 'B2'

export default function AdvicePage() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const [params, setParams] = useSearchParams()
  const cellId = CELL_GEOMETRY.some((c) => c.id === params.get('cell')) ? params.get('cell')! : DEFAULT_CELL
  const cell = CELL_GEOMETRY.find((c) => c.id === cellId)!
  const zone = t('zone', { id: cellId })

  const safety = useAsync(getSafety)

  const [packed, setPacked] = useState<string[]>(() => readLocal(CHECKLIST_KEY, []))
  const toggle = (id: string) =>
    setPacked((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
      writeLocal(CHECKLIST_KEY, next)
      return next
    })

  const nearest = useMemo(() => {
    if (!safety.data) return null
    return safety.data.safePoints
      .map((sp) => ({ sp, km: distanceKm(cell.center, [sp.lat, sp.lng]) }))
      .sort((a, b) => a.km - b.km)[0]
  }, [safety.data, cell])

  const roads = useMemo(
    () => (safety.data ? [...safety.data.roadClosures].sort((a, b) => Number(b.cellId === cellId) - Number(a.cellId === cellId)) : []),
    [safety.data, cellId],
  )

  return (
    <div className="mx-auto max-w-3xl">
      <SkyHero />
      <PageHeader
        title={t('advice.title')}
        subtitle={t('advice.subtitle')}
        actions={
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('advice.zone')}</span>
            <select
              value={cellId}
              onChange={(e) => setParams({ cell: e.target.value }, { replace: true })}
              className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-3"
            >
              {CELL_GEOMETRY.map((c) => (
                <option key={c.id} value={c.id}>
                  {t('zone', { id: c.id })}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <ZoneGuide cellId={cellId} />

      {/* Water supply lives on its own page; one tappable row gets there. */}
      <Link
        to="/outage"
        viewTransition
        className="group mb-5 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.99]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800">
          <Droplets aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900">{lang === 'ms' ? 'Status bekalan air' : 'Water supply status'}</span>
          <span className="block text-[0.95rem] text-slate-700">
            {lang === 'ms' ? 'Tangki komuniti dan jadual bekalan simpanan.' : 'Community tanks and backup supply schedules.'}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-500 transition-transform duration-200 ease-(--ease-out-quart) group-hover:translate-x-0.5" />
      </Link>

      <AdviceCard labelledBy="adv-stay">
        <div className="space-y-8">
          <LifeCriticalList headingId="adv-stay" heading={t('advice.stay')} />

          {!safety.data ? (
            <p className="text-slate-700">{t('common.loading')}</p>
          ) : (
            <div className="grid gap-8 browser:grid-cols-2">
              {/* What to bring */}
              <section aria-labelledby="adv-bring">
                <h2 id="adv-bring" className="text-xl font-bold">
                  {t('advice.bring')}
                </h2>
                <p className="text-slate-700" aria-live="polite">
                  {t('advice.bringProgress', { done: packed.length, total: safety.data.checklist.length })}
                </p>
                <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full origin-left rounded-full bg-primary-600 transition-transform duration-500 ease-(--ease-out-quint)"
                    style={{ transform: `scaleX(${packed.length / safety.data.checklist.length})` }}
                  />
                </div>
                <ul className="mt-2 space-y-0.5">
                  {safety.data.checklist.map((item) => {
                    const on = packed.includes(item.id)
                    return (
                      <li key={item.id}>
                        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-2 transition-colors duration-150 hover:bg-slate-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary-600">
                          <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(item.id)}
                              className="peer size-6 cursor-pointer appearance-none rounded-md border-2 border-slate-400 bg-white transition-[background-color,border-color,transform] duration-150 checked:border-primary-700 checked:bg-primary-700 active:scale-90 focus:outline-none"
                            />
                            {on && (
                              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute size-4 text-white" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="animate-draw [animation-delay:0ms]" />
                              </svg>
                            )}
                          </span>
                          <span className={`transition-colors duration-200 ${on ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-900'}`}>{item[lang]}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                {packed.length === safety.data.checklist.length && (
                  <p className="mt-2 flex animate-rise items-center gap-2 font-semibold text-primary-800">
                    <Check aria-hidden className="size-5" strokeWidth={3} />
                    {t('advice.packed')}
                  </p>
                )}
              </section>

              {/* Roads to avoid */}
              <section aria-labelledby="adv-roads">
                <h2 id="adv-roads" className="text-xl font-bold">
                  {t('advice.roads')}
                </h2>
                <ul className="mt-2 space-y-2">
                  {roads.map((r) => (
                    <li key={r.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.name}</span>
                        <span
                          className={`rounded-full border px-2 text-sm font-semibold ${
                            r.severity === 'closed' ? 'border-slate-800 bg-slate-800 text-white' : 'border-amber-300 bg-amber-50 text-amber-900'
                          }`}
                        >
                          {t(r.severity === 'closed' ? 'advice.closed' : 'advice.avoid')}
                        </span>
                        {r.cellId === cellId && (
                          <span className="rounded-full border border-primary-200 bg-primary-50 px-2 text-sm font-semibold text-primary-800">
                            {t('advice.inZone')}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">
                        {t('zone', { id: r.cellId })}: {r.reason[lang]}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Nearest safe point */}
              {nearest && (
                <section aria-labelledby="adv-safe">
                  <h2 id="adv-safe" className="text-xl font-bold">
                    {t('advice.safePoint')}
                  </h2>
                  <div className="mt-2 rounded-xl border border-slate-200 p-3">
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <MapPin aria-hidden className="size-5 text-primary-700" />
                      {nearest.sp.name[lang]}
                    </p>
                    <p className="text-slate-700">{t('advice.distance', { km: nearest.km.toFixed(1), zone })}</p>
                    <p className="text-slate-700">{nearest.sp.note[lang]}</p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${nearest.sp.lat}&mlon=${nearest.sp.lng}#map=17/${nearest.sp.lat}/${nearest.sp.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded font-semibold text-primary-700 underline underline-offset-2"
                    >
                      {t('advice.openMap')}
                      <ExternalLink aria-hidden className="size-4" />
                      <span className="sr-only">{t('common.newTab')}</span>
                    </a>
                  </div>
                </section>
              )}

              {/* Official contacts */}
              <section aria-labelledby="adv-contacts">
                <h2 id="adv-contacts" className="text-xl font-bold">
                  {t('advice.contacts')}
                </h2>
                <ul className="mt-2 space-y-2">
                  {safety.data.contacts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                      <span className="font-semibold">{c.name[lang]}</span>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          aria-label={t('advice.call', { number: c.phone })}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-white ${
                            c.id === '999' ? 'bg-red-700 hover:bg-red-800' : 'bg-primary-700 hover:bg-primary-800'
                          }`}
                        >
                          <Phone aria-hidden className="size-4" />
                          {c.phone}
                        </a>
                      ) : (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-primary-700 px-3 font-semibold text-primary-700 hover:bg-primary-50"
                        >
                          {t('advice.visit')}
                          <ExternalLink aria-hidden className="size-4" />
                          <span className="sr-only">{t('common.newTab')}</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </AdviceCard>
    </div>
  )
}
