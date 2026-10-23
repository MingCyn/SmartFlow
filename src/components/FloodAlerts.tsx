import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, TrendingDown, TriangleAlert, Waves } from 'lucide-react'
import { useT } from '../i18n'
import { alertText, useFloods, type FloodAlert } from '../store/floods'
import { useSettings } from '../store/settings'

/** Header bell with the flood alert list. New alerts raise the count; opening the list marks them read. */
export function FloodAlerts() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const { alerts, unread, markRead, clear } = useFloods()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const { pathname, search } = useLocation()

  const unreadSevere = alerts.slice(0, unread).some((a) => a.kind === 'worse' && a.area.level === 'severe')
  const newest = alerts[0]
  const announce = newest ? Object.values(alertText(newest, lang)).join('. ') : ''

  function toggle() {
    setOpen((o) => !o)
    markRead()
  }

  // Close on navigation, outside click and Escape.
  useEffect(() => setOpen(false), [pathname, search])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  // Alerts arriving while the list is open count as read.
  useEffect(() => {
    if (open && unread) markRead()
  }, [open, unread, markRead])

  return (
    // On phones the list spans the header (the sticky <header> is its anchor) so it never runs off screen.
    <div ref={wrapRef} className="mobile:ml-auto browser:relative">
      {/* The bell no longer pops up on its own, so screen readers hear each new alert here. */}
      <p aria-live="polite" className="sr-only">
        {unread > 0 ? announce : ''}
      </p>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? t('flood.bellUnread', { n: unread }) : t('flood.alertsLabel')}
        title={t('flood.alertsLabel')}
        className={`relative flex size-11 items-center justify-center rounded-full transition-colors duration-200 ${
          open ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Bell aria-hidden className={`size-6 ${unread ? 'text-slate-900' : ''}`} />
        {unread > 0 && (
          <span
            key={unread}
            aria-hidden
            className={`absolute right-0.5 top-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full px-1 text-xs font-bold text-white ring-2 ring-white ${
              unreadSevere ? 'bg-red-700' : 'bg-primary-700'
            }`}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          aria-label={t('flood.alertsLabel')}
          className="absolute top-full mt-2 animate-rise overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_36px_-12px_rgb(15_23_42/0.38)] mobile:inset-x-3 browser:right-0 browser:mt-3 browser:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
            <h2 className="font-bold text-slate-900">
              {t('flood.alertsLabel')}{' '}
              <span className="ml-1 rounded-full border border-slate-300 px-1.5 text-xs font-medium text-slate-700">{t('flood.simulated')}</span>
            </h2>
            {alerts.length > 0 && (
              <button type="button" onClick={clear} className="min-h-9 rounded-lg px-2 font-medium text-primary-700 hover:bg-primary-50">
                {t('flood.clearAll')}
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-5 text-slate-700">{t('flood.empty')}</p>
          ) : (
            <ul className="max-h-[min(28rem,60dvh)] divide-y divide-slate-100 overflow-y-auto">
              {alerts.map((a) => (
                <AlertRow key={a.key} alert={a} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function AlertRow({ alert }: { alert: FloodAlert }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const receding = alert.kind === 'receding'
  const severe = !receding && alert.area.level === 'severe'
  const { title, body } = alertText(alert, lang)
  const Icon = receding ? TrendingDown : severe ? TriangleAlert : Waves
  const tone = receding
    ? { badge: 'bg-green-50 text-green-800', title: 'text-green-900' }
    : severe
      ? { badge: 'bg-red-50 text-red-700', title: 'text-red-900' }
      : { badge: 'bg-amber-50 text-amber-800', title: 'text-amber-950' }
  // A cleared fake spot is no longer on the map, so there is nothing to show.
  const canShow = !(receding && alert.now === null && alert.area.nearby)
  const mins = Math.max(0, Math.round((Date.now() - alert.at) / 60_000))

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={`font-bold ${tone.title}`}>{title}</span>
          <span className="text-sm text-slate-600">{t('time.minAgo', { n: mins })}</span>
        </p>
        <p className="text-slate-800">{body}</p>
        {canShow && (
          <Link
            to={`/ops?flood=${alert.area.id}&alert=${alert.at}`}
            viewTransition
            className="mt-1 inline-flex min-h-9 items-center font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-900"
          >
            {t('flood.showMap')}
          </Link>
        )}
      </div>
    </li>
  )
}
