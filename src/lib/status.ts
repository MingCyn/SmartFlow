import { CircleDashed, Send, ShieldAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { TKey } from '../i18n'
import type { ReportStatus } from '../types'

export const STATUS_ORDER: ReportStatus[] = ['submitted', 'unverified', 'likely', 'verified']

/** Colour is never the only signal: every status also has an icon and a text label. */
export const STATUS_META: Record<ReportStatus, { label: TKey; desc: TKey; Icon: LucideIcon; chip: string; marker: string }> = {
  submitted: {
    label: 'status.submitted',
    desc: 'status.submittedDesc',
    Icon: Send,
    chip: 'border-primary-200 bg-primary-50 text-primary-800',
    marker: '#2f63b8',
  },
  unverified: {
    label: 'status.unverified',
    desc: 'status.unverifiedDesc',
    Icon: CircleDashed,
    chip: 'border-slate-300 bg-slate-100 text-slate-800',
    marker: '#64748b',
  },
  likely: {
    label: 'status.likely',
    desc: 'status.likelyDesc',
    Icon: TriangleAlert,
    chip: 'border-amber-300 bg-amber-50 text-amber-900',
    marker: '#d97706',
  },
  verified: {
    label: 'status.verified',
    desc: 'status.verifiedDesc',
    Icon: ShieldAlert,
    chip: 'border-red-300 bg-red-50 text-red-800',
    marker: '#b91c1c',
  },
}
