import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert, Waves, X } from 'lucide-react'
import { useT } from '../i18n'
import { alertText, useFloods, type FloodAlert } from '../store/floods'
import { useSettings } from '../store/settings'

const SHOW_MS = 12_000

/** In-app flood alerts, stacked under the header on every page. */
export function FloodAlerts() {
  const t = useT()
  const alerts = useFloods((s) => s.alerts)

  return (
    <section
      aria-label={t('flood.alertsLabel')}
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[4.75rem] z-[1150] flex w-[calc(100%-1.5rem)] max-w-[396px] -translate-x-1/2 flex-col gap-2 browser:left-auto browser:right-4 browser:top-20 browser:w-96 browser:translate-x-0"
    >
      {alerts.map((a) => (
        <AlertCard key={a.key} alert={a} />
      ))}
    </section>
  )
}

function AlertCard({ alert }: { alert: FloodAlert }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const dismiss = useFloods((s) => s.dismiss)
  const severe = alert.area.level === 'severe'
  const { title, body } = alertText(alert.area, lang)
  const Icon = severe ? TriangleAlert : Waves

  useEffect(() => {
    const id = window.setTimeout(() => dismiss(alert.key), SHOW_MS)
    return () => window.clearTimeout(id)
  }, [alert.key, dismiss])

  return (
    <div
      role={severe ? 'alert' : 'status'}
      className={`pointer-events-auto animate-rise rounded-2xl border-2 bg-white p-3 shadow-[0_14px_36px_-12px_rgb(15_23_42/0.38)] ${
        severe ? 'border-red-700' : 'border-amber-400'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${severe ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-bold ${severe ? 'text-red-900' : 'text-amber-950'}`}>
            {title}{' '}
            <span className="ml-1 rounded-full border border-slate-300 px-1.5 text-xs font-medium text-slate-700">{t('flood.simulated')}</span>
          </p>
          <p className="text-slate-800">{body}</p>
          <Link
            to={`/ops?flood=${alert.area.id}`}
            viewTransition
            onClick={() => dismiss(alert.key)}
            className="mt-1 inline-flex min-h-9 items-center font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-900"
          >
            {t('flood.showMap')}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => dismiss(alert.key)}
          aria-label={t('flood.dismiss')}
          className="-m-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}
