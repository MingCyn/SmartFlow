import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ExternalLink, MapPin, Phone, Sparkles } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { AdviceCard, LifeCriticalList } from '../components/AdviceCard'
import { useT } from '../i18n'
import { distanceKm } from '../lib/geo'
import { trendOf } from '../lib/scoring'
import { useAsync } from '../lib/useAsync'
import { getAdviceTips } from '../services/ai'
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
  const rising = trendOf(cell.drainLevelCm) === 'rising'

  const safety = useAsync(getSafety)
  const tips = useAsync(() => getAdviceTips({ cellId, rising }, lang), [cellId, lang])

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

      {/* --- ADD THE NAVIGATION LINK HERE --- */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
        <div>
          <p className="font-semibold text-blue-950">
            {lang === 'ms' ? 'Mencari status simpanan & gangguan air?' : 'Looking for water storage & outage data?'}
          </p>
          <p className="text-sm text-blue-900">
            {lang === 'ms' ? 'Pantau tangki komuniti dan jadual takungan.' : 'Monitor community tanks and backup schedules.'}
          </p>
        </div>
        <Link 
          to="/outage" 
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          {lang === 'ms' ? 'Status Air' : 'Water Supply Status'}
        </Link>
      </div>
      {/* ------------------------------------ */}

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
                <ul className="mt-2 space-y-1">
                  {safety.data.checklist.map((item) => (
                    <li key={item.id}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={packed.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          className="mt-1 size-5 shrink-0 accent-primary-700"
                        />
                        <span className={packed.includes(item.id) ? 'text-slate-600 line-through' : ''}>{item[lang]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
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
          


          {/* Mock AI tips: rendered separately from, and after, the fixed safety lines. */}
          <section aria-labelledby="adv-tips" className="rounded-xl bg-slate-50 p-4">
            <h2 id="adv-tips" className="flex items-center gap-2 text-xl font-bold">
              <Sparkles aria-hidden className="size-5 text-primary-700" />
              {t('advice.tips', { zone })}
            </h2>
            <p className="text-sm text-slate-700">{t('advice.tipsNote')}</p>
            {tips.data ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {tips.data.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-slate-700">{t('common.loading')}</p>
            )}
          </section>
        </div>
      </AdviceCard>
    </div>
  )
}
