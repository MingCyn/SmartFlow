import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Popup } from 'react-leaflet'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CloudRain, RotateCcw, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatusChip } from '../components/StatusChip'
import { TownshipMap } from '../components/TownshipMap'
import { depthLabel } from '../components/DepthPicker'
import { useT, type TKey } from '../i18n'
import { rankCells } from '../lib/scoring'
import { STATUS_META, STATUS_ORDER } from '../lib/status'
import { clockTime, minutesSince } from '../lib/time'
import { useAsync } from '../lib/useAsync'
import { getCells } from '../services/cells'
import { getReports } from '../services/reports'
import { useOps } from '../store/ops'
import { useSettings } from '../store/settings'
import type { DispatchStatus, LatLng, RankedCell, Trend } from '../types'

const REFRESH_MS = 15_000

const TREND: Record<Trend, { label: TKey; Icon: LucideIcon; cls: string }> = {
  rising: { label: 'trend.rising', Icon: ArrowUpRight, cls: 'text-amber-900' },
  steady: { label: 'trend.steady', Icon: ArrowRight, cls: 'text-slate-700' },
  falling: { label: 'trend.falling', Icon: ArrowDownRight, cls: 'text-primary-700' },
}

const DISPATCH: { value: DispatchStatus; label: TKey }[] = [
  { value: 'unassigned', label: 'dispatch.unassigned' },
  { value: 'assigned', label: 'dispatch.assigned' },
  { value: 'on-site', label: 'dispatch.on-site' },
  { value: 'cleared', label: 'dispatch.cleared' },
]

function stormLevel(storm: number): TKey {
  if (storm < 25) return 'ops.level.light'
  if (storm < 50) return 'ops.level.moderate'
  if (storm < 75) return 'ops.level.heavy'
  return 'ops.level.extreme'
}

export default function OpsPage() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const { storm, setStorm, dispatch, setDispatch, reset } = useOps()
  const cells = useAsync(getCells)
  const reports = useAsync(getReports)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [focus, setFocus] = useState<LatLng | null>(null)
  const nf = useMemo(() => new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-MY'), [lang])

  // "Live" feed: re-read reports so new resident reports and status changes appear.
  const { reload } = reports
  useEffect(() => {
    const id = setInterval(() => {
      reload()
      setUpdatedAt(new Date())
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [reload])

  const ranked = useMemo(
    () => (cells.data && reports.data ? rankCells(cells.data, reports.data, storm) : []),
    [cells.data, reports.data, storm],
  )

  // Track rank movement and announce re-ranking for screen reader users.
  const order = ranked.map((r) => r.cell.id).join(',')
  const prevOrder = useRef('')
  const [moves, setMoves] = useState<Record<string, number>>({})
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    const prev = prevOrder.current.split(',')
    const next = order.split(',')
    if (prevOrder.current && order && prevOrder.current !== order) {
      setMoves(Object.fromEntries(next.map((id, i) => [id, prev.indexOf(id) - i])))
      setAnnouncement(t('ops.rankUpdated', { zone: t('zone', { id: next[0] }) }))
    }
    prevOrder.current = order
  }, [order, t])

  const cellTint = useMemo(() => Object.fromEntries(ranked.map((r) => [r.cell.id, r.score / 100])), [ranked])
  const all = reports.data ?? []
  const onSite = Object.values(dispatch).filter((d) => d === 'on-site').length

  function selectCell(rc: RankedCell) {
    setSelected(rc.cell.id)
    setFocus([rc.cell.center[0], rc.cell.center[1]]) // new array each click so repeat clicks re-pan
  }

  return (
    <div>
      <PageHeader
        title={t('ops.title')}
        subtitle={t('ops.subtitle')}
        actions={
          <p className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-800">
            <span aria-hidden className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-500 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-primary-600" />
            </span>
            <span>
              <span className="font-semibold">{t('ops.live')}</span> {t('ops.updated', { time: clockTime(updatedAt, lang) })}
            </span>
          </p>
        }
      />

      <dl className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: t('ops.statReports'), value: all.length },
          { label: t('ops.statVerified'), value: all.filter((r) => r.status === 'verified').length },
          { label: t('ops.statOnSite'), value: onSite },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <dt className="text-sm leading-snug text-slate-700">{s.label}</dt>
            <dd className="text-2xl font-bold text-slate-900">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-5 browser:grid browser:grid-cols-[minmax(340px,420px)_1fr] browser:grid-rows-[auto_1fr]">
        {/* Storm simulator */}
        <section aria-labelledby="storm-h" className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 browser:col-start-1 browser:row-start-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id="storm-h" className="flex items-center gap-2 text-lg font-semibold">
              <CloudRain aria-hidden className="size-5 text-primary-700" />
              {t('ops.storm')}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-primary-700 hover:bg-primary-50"
            >
              <RotateCcw aria-hidden className="size-4" />
              {t('ops.reset')}
            </button>
          </div>
          <p id="storm-desc" className="text-slate-700">
            {t('ops.stormDemo')}
          </p>
          <label htmlFor="storm" className="mt-3 flex justify-between font-medium">
            <span>{t('ops.intensity')}</span>
            <output htmlFor="storm" className="font-semibold text-primary-800">
              {t(stormLevel(storm))} ({storm}%)
            </output>
          </label>
          <input
            id="storm"
            type="range"
            min={0}
            max={100}
            step={5}
            value={storm}
            onChange={(e) => setStorm(Number(e.target.value))}
            aria-describedby="storm-desc"
            aria-valuetext={`${t(stormLevel(storm))}, ${storm}%`}
            className="mt-1 h-10 w-full accent-primary-700"
          />
        </section>

        {/* Map */}
        <section
          aria-labelledby="map-h"
          className="browser:sticky browser:top-20 browser:col-start-2 browser:row-span-2 browser:row-start-1 browser:self-start"
        >
          <h2 id="map-h" className="sr-only">
            {t('ops.mapHeading')}
          </h2>
          <TownshipMap
            label={t('ops.mapLabel')}
            className="h-80 browser:h-[calc(100dvh-15rem)] browser:min-h-96"
            highlightCellId={selected}
            cellTint={cellTint}
            focus={focus}
          >
            {all.map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.lat, r.lng]}
                radius={7}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: STATUS_META[r.status].marker, fillOpacity: 0.95 }}
              >
                <Popup>
                  <div className="space-y-1 text-base">
                    <p className="font-semibold">{r.id}</p>
                    <StatusChip status={r.status} />
                    <p>
                      {t(depthLabel(r.depth))}, {t('time.minAgo', { n: minutesSince(r.createdAt) })}
                    </p>
                    {r.note && <p className="text-slate-700">{r.note}</p>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </TownshipMap>
          <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t('ops.legend')}>
            <span className="font-medium text-slate-700">{t('ops.legend')}:</span>
            {STATUS_ORDER.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block size-3 rounded-full ring-2 ring-white" style={{ background: STATUS_META[s].marker }} />
                <StatusChip status={s} />
              </span>
            ))}
          </div>
        </section>

        {/* Ranked zones */}
        <section aria-labelledby="rank-h" className="browser:col-start-1 browser:row-start-2">
          <h2 id="rank-h" className="text-lg font-semibold">
            {t('ops.ranking')}
          </h2>
          <p className="text-slate-700">{t('ops.rankingHelp')}</p>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>

          {ranked.length === 0 ? (
            <p className="mt-3 text-slate-700">{t('common.loading')}</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {ranked.map((rc, i) => {
                const zone = t('zone', { id: rc.cell.id })
                const trend = TREND[rc.trend]
                const move = moves[rc.cell.id] ?? 0
                const isSel = selected === rc.cell.id
                return (
                  <li key={rc.cell.id} className={`rounded-xl border-2 bg-white ${isSel ? 'border-primary-600 shadow-md' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => selectCell(rc)}
                      aria-current={isSel || undefined}
                      className="flex w-full gap-3 rounded-t-xl p-3 text-left hover:bg-slate-50"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-700 font-bold text-white">
                        <span className="sr-only">{t('ops.rank')} </span>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-lg font-semibold">
                            {zone}
                            {move !== 0 && (
                              <span className={`ml-2 text-sm font-semibold ${move > 0 ? 'text-amber-900' : 'text-slate-600'}`}>
                                {t(move > 0 ? 'ops.up' : 'ops.down', { n: Math.abs(move) })}
                              </span>
                            )}
                          </span>
                          <span>
                            {t('ops.score')} <strong className="text-xl">{rc.score}</strong>
                          </span>
                        </span>
                        <span aria-hidden className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-200">
                          <span className="block h-full rounded-full bg-primary-600 transition-[width] duration-300" style={{ width: `${rc.score}%` }} />
                        </span>
                        <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <span>{t('ops.reports', { n: rc.reportCount, v: rc.verifiedCount })}</span>
                          <span>{t('ops.people', { n: nf.format(rc.cell.population) })}</span>
                          <span>{t('ops.rain', { v: rc.rainfall[rc.rainfall.length - 1] })}</span>
                          <span className={`inline-flex items-center gap-1 ${trend.cls}`}>
                            {t('ops.drain', { v: rc.drainPct })}
                            <trend.Icon aria-hidden className="size-4" />
                            <span className="font-semibold">{t(trend.label)}</span>
                          </span>
                        </span>
                      </span>
                      <Sparkline values={rc.drain} max={rc.cell.drainCapacityCm} />
                    </button>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2">
                      <label htmlFor={`dispatch-${rc.cell.id}`} className="font-medium">
                        {t('ops.dispatch')}
                      </label>
                      <select
                        id={`dispatch-${rc.cell.id}`}
                        value={dispatch[rc.cell.id] ?? 'unassigned'}
                        onChange={(e) => setDispatch(rc.cell.id, e.target.value as DispatchStatus)}
                        aria-label={t('ops.dispatchFor', { zone })}
                        className="min-h-10 rounded-lg border-2 border-slate-300 bg-white px-2"
                      >
                        {DISPATCH.map((d) => (
                          <option key={d.value} value={d.value}>
                            {t(d.label)}
                          </option>
                        ))}
                      </select>
                      {rc.drainPct >= 90 && (
                        <span className="ml-auto rounded-full border border-amber-300 bg-amber-50 px-2 text-sm font-semibold text-amber-900">
                          {t('ops.nearOverflow')}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

/** Drain level over the last hour, with the capacity line. Decorative: the text carries the data. */
function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = 64
  const h = 36
  const top = max * 1.2
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / top) * h}`).join(' ')
  const capY = h - (max / top) * h
  return (
    <svg aria-hidden viewBox={`0 0 ${w} ${h}`} className="hidden h-9 w-16 shrink-0 self-center browser:block">
      <line x1="0" x2={w} y1={capY} y2={capY} stroke="#94a3b8" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke="#183f80" strokeWidth="2" />
    </svg>
  )
}
