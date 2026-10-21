import type { ReactNode } from 'react'
import { Info, OctagonAlert, Phone } from 'lucide-react'
import { ADVISORY_BANNER, LIFE_CRITICAL } from '../constants/lifeCritical'
import { useSettings } from '../store/settings'

/**
 * Every advice card carries the advisory banner. It is rendered here, not
 * passed in, so no caller (and no AI output) can remove or reword it.
 */
export function AdviceCard({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const lang = useSettings((s) => s.lang)
  return (
    <section aria-labelledby={labelledBy} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <p
        role="note"
        className="sticky top-14 z-10 flex items-start gap-2 rounded-t-2xl border-b border-primary-200 bg-primary-50 px-4 py-3 font-semibold text-primary-900"
      >
        <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
        {ADVISORY_BANNER[lang]}
      </p>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** The fixed life-critical lines. Takes no content props by design. */
export function LifeCriticalList({ headingId, heading }: { headingId: string; heading: string }) {
  const lang = useSettings((s) => s.lang)
  return (
    <div>
      <h2 id={headingId} className="text-xl font-bold text-slate-900">
        {heading}
      </h2>
      <ul className="mt-3 space-y-2">
        {LIFE_CRITICAL.map((line) => (
          <li key={line.id} className="flex items-start gap-3 rounded-xl border-l-4 border-red-700 bg-red-50 p-3 font-semibold text-red-900">
            <OctagonAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
            <span className="flex-1">{line[lang]}</span>
            {line.tel && (
              <a
                href={`tel:${line.tel}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-white hover:bg-red-800"
              >
                <Phone aria-hidden className="size-4" />
                {line.tel}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
