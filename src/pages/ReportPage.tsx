import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker } from 'react-leaflet'
import { Camera, CircleCheck, ImagePlus, LocateFixed, LoaderCircle, Sparkles, TriangleAlert, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TownshipMap } from '../components/TownshipMap'
import { DepthPicker, depthLabel } from '../components/DepthPicker'
import { StatusChip } from '../components/StatusChip'
import { AdviceCard, LifeCriticalList } from '../components/AdviceCard'
import { CameraCapture, canUseLiveCamera } from '../components/CameraCapture'
import { useT } from '../i18n'
import { distanceKm } from '../lib/geo'
import { cellForPoint } from '../lib/scoring'
import { suggestDepth, type DepthSuggestion } from '../services/ai'
import { CELL_GEOMETRY, TOWNSHIP_CENTER } from '../services/cells'
import { submitReport } from '../services/reports'
import { retryLocation, useLiveLocation } from '../store/location'
import { useSettings } from '../store/settings'
import type { Depth, Report } from '../types'

type GeoState = 'locating' | 'ok' | 'denied' | 'unavailable' | 'outside'
interface Pin {
  lat: number
  lng: number
  source: 'gps' | 'map'
}

const btn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition-colors disabled:opacity-60'
const btnPrimary = `${btn} bg-primary-700 text-white hover:bg-primary-800`
const btnSecondary = `${btn} border-2 border-primary-700 bg-white text-primary-700 hover:bg-primary-50`

export default function ReportPage() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const [cameraOpen, setCameraOpen] = useState(false)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const [aiError, setAiError] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ai, setAi] = useState<DepthSuggestion | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [depth, setDepth] = useState<Depth | null>(null)
  const depthChosenByUser = useRef(false)
  const photoToken = useRef(0)

  const [pin, setPin] = useState<Pin | null>(null)
  const live = useLiveLocation()
  const liveInside = !!live.position && distanceKm(live.position, TOWNSHIP_CENTER) <= 5
  // Real GPS will usually be outside the fictional demo township.
  const geo: GeoState =
    live.status === 'ok' ? (liveInside ? 'ok' : 'outside') : live.status === 'idle' ? 'locating' : live.status
  const [note, setNote] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Report | null>(null)

  const errorRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)

  const cell = useMemo(() => (pin ? cellForPoint(CELL_GEOMETRY, pin.lat, pin.lng) : null), [pin])

  // Follow the live GPS fix until the user places the pin by hand.
  useEffect(() => {
    if (!live.position || !liveInside) return
    setPin((p) => (p?.source === 'map' ? p : { lat: live.position![0], lng: live.position![1], source: 'gps' }))
  }, [live.position, liveInside])

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) acceptPhoto(file)
  }

  function acceptPhoto(file: File) {
    setCameraOpen(false)
    setPhoto(file)
    setAi(null)
    setAiError(false)
    setAiBusy(true)
    const token = ++photoToken.current
    suggestDepth(file, lang)
      .then((s) => {
        if (token !== photoToken.current) return
        setAi(s)
        if (s.depth && !depthChosenByUser.current) setDepth(s.depth)
      })
      .catch(() => token === photoToken.current && setAiError(true))
      .finally(() => token === photoToken.current && setAiBusy(false))
  }

  function takePhoto() {
    // Live camera asks for permission; otherwise the phone's own camera app opens.
    if (canUseLiveCamera()) setCameraOpen(true)
    else captureInputRef.current?.click()
  }

  function removePhoto() {
    photoToken.current++
    setPhoto(null)
    setAi(null)
    setAiError(false)
    setAiBusy(false)
  }

  function chooseZone(id: string) {
    const c = CELL_GEOMETRY.find((x) => x.id === id)
    if (c) setPin({ lat: c.center[0], lng: c.center[1], source: 'map' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!pin || !depth) {
      setShowErrors(true)
      requestAnimationFrame(() => errorRef.current?.focus())
      return
    }
    setSubmitting(true)
    try {
      const report = await submitReport({ lat: pin.lat, lng: pin.lng, depth, note, hasPhoto: !!photo, locationSource: pin.source })
      setResult(report)
      requestAnimationFrame(() => doneRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    removePhoto()
    setDepth(null)
    depthChosenByUser.current = false
    setNote('')
    setShowErrors(false)
    setResult(null)
    setPin(liveInside && live.position ? { lat: live.position[0], lng: live.position[1], source: 'gps' } : null)
  }

  if (result) {
    const zone = t('zone', { id: result.cellId })
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title={t('report.title')} />
        <section aria-labelledby="done-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CircleCheck aria-hidden className="size-8 text-primary-700" />
            <h2 id="done-title" ref={doneRef} tabIndex={-1} className="text-xl font-bold outline-none">
              {t('report.doneTitle')}
            </h2>
          </div>
          <p className="mt-4 text-slate-700">{t('report.doneId')}</p>
          <p className="font-mono text-3xl font-bold tracking-wider text-primary-900">{result.id}</p>
          <p className="mt-2 text-slate-800">
            {zone}, {t(depthLabel(result.depth))}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusChip status={result.status} />
          </div>
          <p className="mt-2 text-slate-700">{t('report.doneNext')}</p>
          <div className="mt-5 grid gap-2 browser:grid-cols-3">
            <Link to="/status" className={btnPrimary}>
              {t('report.track')}
            </Link>
            <Link to={`/advice?cell=${result.cellId}`} className={btnSecondary}>
              {t('report.adviceFor', { zone })}
            </Link>
            <button type="button" onClick={reset} className={btnSecondary}>
              {t('report.another')}
            </button>
          </div>
        </section>
        <AdviceCard labelledBy="done-safety">
          <LifeCriticalList headingId="done-safety" heading={t('advice.stay')} />
        </AdviceCard>
      </div>
    )
  }

  const errors = [!pin && t('report.errLocation'), !depth && t('report.errDepth')].filter(Boolean) as string[]
  const geoMessage = {
    locating: t('report.locating'),
    ok: t('report.locOk'),
    denied: t('report.locDenied'),
    unavailable: t('report.locUnavailable'),
    outside: t('report.locOutside'),
  }[geo]

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('report.title')} subtitle={t('report.subtitle')} />
      {cameraOpen && <CameraCapture onCapture={acceptPhoto} onClose={() => setCameraOpen(false)} />}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {showErrors && errors.length > 0 && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-red-900 outline-none">
            <p className="font-semibold">{t('report.errorsTitle')}</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Photo */}
        <section aria-labelledby="photo-h" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 id="photo-h" className="text-lg font-semibold">
            {t('report.photo')}
          </h2>
          <p id="photo-help" className="text-slate-700">
            {t('report.photoHelp')}
          </p>

          {preview ? (
            <div className="relative mt-3">
              <img src={preview} alt={t('report.photoAlt')} className="max-h-72 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                aria-label={t('report.removePhoto')}
                className="absolute right-2 top-2 rounded-full bg-white p-2 text-slate-900 shadow hover:bg-slate-100"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 browser:grid-cols-2">
              <button type="button" onClick={takePhoto} aria-describedby="photo-help" className={btnPrimary}>
                <Camera aria-hidden className="size-5" />
                {t('report.takePhoto')}
              </button>
              <input ref={captureInputRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} tabIndex={-1} aria-hidden className="hidden" />
              <label className={`${btnSecondary} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600`}>
                <ImagePlus aria-hidden className="size-5" />
                {t('report.choosePhoto')}
                <input type="file" accept="image/*" onChange={onPhoto} aria-describedby="photo-help" className="sr-only" />
              </label>
            </div>
          )}

          <div aria-live="polite" className="mt-3">
            {aiBusy && (
              <p className="flex items-center gap-2 text-slate-700">
                <LoaderCircle aria-hidden className="size-5 animate-spin" />
                {t('report.aiChecking')}
              </p>
            )}
            {ai && (
              <p className="flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-primary-900">
                <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0" />
                <span>
                  {ai.depth ? (
                    <>
                      <strong>{t(depthLabel(ai.depth))}.</strong> {t('report.aiSuggested', { pct: Math.round(ai.confidence * 100) })}
                    </>
                  ) : (
                    t('report.aiNone')
                  )}{' '}
                  <span className="text-sm text-primary-800">({t('report.aiLabel')})</span>
                  {ai.summary && <span className="mt-1 block text-sm text-primary-800">{ai.summary}</span>}
                </span>
              </p>
            )}
            {aiError && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-950">
                <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
                {t('report.aiError')}
              </p>
            )}
          </div>
        </section>

        {/* Location */}
        <section aria-labelledby="loc-h" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 id="loc-h" className="text-lg font-semibold">
            {t('report.location')}
          </h2>
          <p id="loc-status" aria-live="polite" className={`mt-1 ${showErrors && !pin ? 'font-semibold text-red-800' : 'text-slate-700'}`}>
            {geo === 'locating' && <LoaderCircle aria-hidden className="mr-1 inline size-4 animate-spin" />}
            {geoMessage}
          </p>
          {geo !== 'ok' && geo !== 'locating' && (
            <button type="button" onClick={retryLocation} className="mt-2 inline-flex items-center gap-2 rounded font-semibold text-primary-700 underline underline-offset-2">
              <LocateFixed aria-hidden className="size-4" />
              {t('report.retryLocation')}
            </button>
          )}

          <TownshipMap
            label={t('report.mapLabel')}
            className="mt-3 h-64"
            onPick={(lat, lng) => setPin({ lat, lng, source: 'map' })}
            highlightCellId={cell?.id}
          >
            {pin && <CircleMarker center={[pin.lat, pin.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#183f80', fillOpacity: 1 }} />}
          </TownshipMap>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-medium">{t('report.chooseZone')}</span>
              <select
                value={cell?.id ?? ''}
                onChange={(e) => chooseZone(e.target.value)}
                aria-describedby="loc-status"
                className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-3"
              >
                <option value="" disabled>
                  {t('report.chooseZonePlaceholder')}
                </option>
                {CELL_GEOMETRY.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t('zone', { id: c.id })}
                  </option>
                ))}
              </select>
            </label>
            {cell && <p className="pb-3 font-semibold text-primary-800">{t('report.pinIn', { zone: t('zone', { id: cell.id }) })}</p>}
          </div>
        </section>

        {/* Depth */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <DepthPicker
            legend={t('report.depth')}
            value={depth}
            invalid={showErrors && !depth}
            onChange={(d) => {
              depthChosenByUser.current = true
              setDepth(d)
            }}
          />
        </section>

        {/* Note */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <label htmlFor="note" className="text-lg font-semibold">
            {t('report.note')}
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder={t('report.notePlaceholder')}
            className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3 placeholder:text-slate-500"
          />
        </section>

        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full text-lg`}>
          {submitting && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
          {submitting ? t('report.sending') : t('report.submit')}
        </button>
      </form>
    </div>
  )
}
