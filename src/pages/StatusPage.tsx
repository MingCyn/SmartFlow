import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatusChip } from '../components/StatusChip'
import { depthLabel } from '../components/DepthPicker'
import { useT } from '../i18n'
import { STATUS_META, STATUS_ORDER } from '../lib/status'
import { minutesSince } from '../lib/time'
import { useAsync } from '../lib/useAsync'
import { CURRENT_USER, getMyReports } from '../services/reports'

const REFRESH_MS = 10_000

export default function StatusPage() {
  const t = useT()
  const mine = useAsync(getMyReports)

  // Poll so the simulated verification pipeline visibly moves.
  const { reload } = mine
  useEffect(() => {
    const id = setInterval(reload, REFRESH_MS)
    return () => clearInterval(id)
  }, [reload])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('mine.title')} subtitle={t('mine.subtitle', { user: CURRENT_USER })} />
      <p className="-mt-3 mb-5 text-slate-700">{t('mine.refresh')}</p>

      {!mine.data ? (
        <p className="text-slate-700">{t('common.loading')}</p>
      ) : mine.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p>{t('mine.empty')}</p>
          <Link to="/report" className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-primary-700 px-4 font-semibold text-white hover:bg-primary-800">
            {t('mine.makeReport')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {mine.data.map((r) => {
            const current = STATUS_ORDER.indexOf(r.status)
            const zone = t('zone', { id: r.cellId })
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-mono text-xl font-bold text-primary-900">{r.id}</h2>
                    <p className="text-slate-800">
                      {zone}, {t(depthLabel(r.depth))}
                    </p>
                    <p className="text-slate-700">{t('mine.sent', { time: t('time.minAgo', { n: minutesSince(r.createdAt) }) })}</p>
                  </div>
                  <StatusChip status={r.status} />
                </div>
                <p className="mt-2 text-slate-800">{t(STATUS_META[r.status].desc)}</p>

                <ol aria-label={t('mine.progress', { id: r.id })} className="mt-4 grid grid-cols-4 gap-1">
                  {STATUS_ORDER.map((s, i) => {
                    const done = i <= current
                    return (
                      <li key={s} aria-current={i === current ? 'step' : undefined} className="flex flex-col items-center gap-1 text-center">
                        <span
                          aria-hidden
                          className={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                            done ? 'border-primary-700 bg-primary-700 text-white' : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          {i < current ? <Check className="size-4" /> : i + 1}
                        </span>
                        <span className={`text-sm leading-tight ${i === current ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                          <span className="sr-only">{t('mine.step', { n: i + 1, total: STATUS_ORDER.length, label: '' })}</span>
                          {t(STATUS_META[s].label)}
                        </span>
                      </li>
                    )
                  })}
                </ol>

                <Link
                  to={`/advice?cell=${r.cellId}`}
                  className="mt-4 inline-flex items-center rounded font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-900"
                >
                  {t('mine.advice', { zone })}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section aria-labelledby="legend-h" className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 id="legend-h" className="text-lg font-semibold">
          {t('mine.legend')}
        </h2>
        <dl className="mt-2 space-y-3">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex flex-col gap-1 browser:flex-row browser:items-center browser:gap-3">
              <dt className="browser:w-44">
                <StatusChip status={s} />
              </dt>
              <dd className="text-slate-800">{t(STATUS_META[s].desc)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
