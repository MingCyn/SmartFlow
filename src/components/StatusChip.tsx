import { useT } from '../i18n'
import { STATUS_META } from '../lib/status'
import type { ReportStatus } from '../types'

export function StatusChip({ status }: { status: ReportStatus }) {
  const t = useT()
  const { Icon, chip, label } = STATUS_META[status]
  return (
    // Keyed by status so a change (Unverified to Likely) pops in rather than swapping silently.
    <span key={status} className={`inline-flex animate-pop items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${chip}`}>
      <Icon aria-hidden className="size-4" />
      {t(label)}
    </span>
  )
}
