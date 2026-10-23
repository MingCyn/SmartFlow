import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Route } from 'lucide-react'
import { Mascot, type AnimId, type ExprId } from './mascot/Mascot'
import { useT } from '../i18n'
import { useAsync } from '../lib/useAsync'
import { getZoneGuide, type GuideLevel } from '../services/zoneGuide'
import { useOps } from '../store/ops'
import { useSettings } from '../store/settings'

const LEVEL: Record<GuideLevel, { chip: string; expression: ExprId; anim: AnimId }> = {
  act: { chip: 'border-red-700 bg-red-700 text-white', expression: 'attentive', anim: 'alert' },
  prepare: { chip: 'border-amber-300 bg-amber-50 text-amber-900', expression: 'attentive', anim: 'exclaim' },
  watch: { chip: 'border-green-300 bg-green-50 text-green-900', expression: 'happy', anim: 'wink' },
}

/** Titis briefs the resident on the selected zone: level, then what to do, in order. */
export function ZoneGuide({ cellId }: { cellId: string }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const storm = useOps((s) => s.storm)
  const zone = t('zone', { id: cellId })
  const guide = useAsync(() => getZoneGuide(cellId, lang), [cellId, lang, storm])

  const [play, setPlay] = useState<{ id: AnimId; nonce: number } | null>(null)
  const nonce = useRef(0)
  const level = guide.data ? LEVEL[guide.data.level] : null
  useEffect(() => {
    if (level) setPlay({ id: level.anim, nonce: ++nonce.current })
  }, [level])

  const routeAsk = encodeURIComponent(t('chip.safe'))
  const zoneAsk = encodeURIComponent(t('guide.title', { zone }))

  return (
    <section aria-labelledby="zone-guide-h" className="mb-5 rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
      <div className="flex items-start gap-3">
        <Mascot size={84} label={t('guide.mascot')} expression={level?.expression ?? 'curious'} play={play} busy={!guide.data} className="shrink-0" />
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="zone-guide-h" className="text-xl font-bold text-primary-900">
              {t('guide.title', { zone })}
            </h2>
            {guide.data && (
              <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${LEVEL[guide.data.level].chip}`}>
                {t(`guide.level.${guide.data.level}`)}
              </span>
            )}
          </div>
          {guide.data ? (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-slate-900 marker:font-semibold marker:text-primary-700">
              {guide.data.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-slate-700">{t('guide.loading', { zone })}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/chat?ask=${routeAsk}`}
          viewTransition
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-700 px-4 font-semibold text-white hover:bg-primary-800"
        >
          <Route aria-hidden className="size-4" />
          {t('guide.route')}
        </Link>
        <Link
          to={`/chat?ask=${zoneAsk}`}
          viewTransition
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 font-semibold text-primary-700 hover:border-primary-600 hover:bg-primary-50"
        >
          <MessageCircle aria-hidden className="size-4" />
          {t('guide.ask')}
        </Link>
      </div>
      {guide.data && <p className="mt-2 text-sm text-slate-700">{t(guide.data.ai ? 'guide.ai' : 'guide.rules')}</p>}
    </section>
  )
}
