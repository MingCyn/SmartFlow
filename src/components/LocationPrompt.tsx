import { useState } from 'react'
import { ChevronDown, LocateFixed, MapPinOff } from 'lucide-react'
import { useT } from '../i18n'
import { retryLocation, useGeo } from '../store/location'

/**
 * Inline nudge to turn location on. Hidden once location works.
 * `tone="sky"` inherits the hero's text colour; `tone="plain"` is for normal surfaces.
 */
export function LocationPrompt({ tone = 'plain' }: { tone?: 'sky' | 'plain' }) {
  const t = useT()
  const { status, permission } = useGeo()
  const [open, setOpen] = useState(false)

  if (status === 'ok') return null
  const blocked = permission === 'denied' || status === 'denied'
  const failed = !blocked && status === 'unavailable'
  // The browser's own Allow pop-up is open: point at it rather than adding a second button.
  if (!blocked && !failed && status === 'locating')
    return permission === 'prompt' ? (
      <p className="flex items-start gap-2 font-medium">
        <LocateFixed aria-hidden className="mt-0.5 size-5 shrink-0" />
        {t('loc.waiting')}
      </p>
    ) : null

  const sky = tone === 'sky'
  const button = sky
    ? 'bg-(--sky-ink) text-(--sky-bg) hover:opacity-90'
    : 'bg-primary-700 text-white hover:bg-primary-800'

  return (
    <div className={sky ? '' : 'rounded-2xl border border-slate-200 bg-white p-4'}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex min-w-0 flex-1 items-start gap-2 font-medium">
          {blocked || failed ? <MapPinOff aria-hidden className="mt-0.5 size-5 shrink-0" /> : <LocateFixed aria-hidden className="mt-0.5 size-5 shrink-0" />}
          <span>{t(blocked ? 'loc.blocked' : failed ? 'loc.unavailable' : 'loc.ask')}</span>
        </p>
        {blocked ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="loc-help"
            className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 font-semibold transition-opacity ${button}`}
          >
            {t('loc.howFix')}
            <ChevronDown aria-hidden className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <button type="button" onClick={retryLocation} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-opacity ${button}`}>
            <LocateFixed aria-hidden className="size-4" />
            {t(failed ? 'loc.retry' : 'loc.turnOn')}
          </button>
        )}
      </div>

      {blocked && open && (
        <ol id="loc-help" className={`mt-3 list-decimal space-y-2 rounded-xl p-4 pl-9 text-[0.95rem] leading-snug ${sky ? 'bg-(--sky-ink)/10' : 'bg-slate-50'}`}>
          <li>{t('loc.fixSite')}</li>
          <li>{t('loc.fixChrome')}</li>
          <li>{t('loc.fixWindows')}</li>
          <li>{t('loc.fixPhone')}</li>
          <li className="list-none -ml-5 pt-1">
            <button type="button" onClick={retryLocation} className="font-semibold underline underline-offset-2">
              {t('loc.retry')}
            </button>
          </li>
        </ol>
      )}
    </div>
  )
}
