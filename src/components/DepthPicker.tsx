import { useT, type TKey } from '../i18n'
import type { Depth } from '../types'

export const DEPTHS: { value: Depth; label: TKey; desc: TKey; waterY: number }[] = [
  { value: 'ankle', label: 'depth.ankle', desc: 'depth.ankleDesc', waterY: 42 },
  { value: 'knee', label: 'depth.knee', desc: 'depth.kneeDesc', waterY: 34 },
  { value: 'car-door', label: 'depth.car-door', desc: 'depth.car-doorDesc', waterY: 24 },
]

export const depthLabel = (d: Depth): TKey => DEPTHS.find((x) => x.value === d)!.label

interface Props {
  value: Depth | null
  onChange: (d: Depth) => void
  legend: string
  describedBy?: string
  invalid?: boolean
}

export function DepthPicker({ value, onChange, legend, describedBy, invalid }: Props) {
  const t = useT()
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="text-lg font-semibold">{legend}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DEPTHS.map((d) => (
          <label
            key={d.value}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 bg-white p-2 text-center has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600 ${
              invalid ? 'border-red-600' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            <input
              type="radio"
              name="depth"
              value={d.value}
              checked={value === d.value}
              onChange={() => onChange(d.value)}
              className="sr-only"
            />
            <DepthIcon waterY={d.waterY} />
            <span className="font-semibold leading-tight">{t(d.label)}</span>
            <span className="text-sm text-slate-700">{t(d.desc)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function DepthIcon({ waterY }: { waterY: number }) {
  return (
    <svg aria-hidden viewBox="0 0 40 48" className="h-14 w-12">
      <circle cx="20" cy="7" r="5" fill="#475569" />
      <rect x="14" y="13" width="12" height="18" rx="4" fill="#475569" />
      <rect x="14.5" y="29" width="4.5" height="17" rx="2" fill="#475569" />
      <rect x="21" y="29" width="4.5" height="17" rx="2" fill="#475569" />
      <rect x="0" y={waterY} width="40" height={48 - waterY} fill="#2f63b8" fillOpacity="0.45" />
      <line x1="0" x2="40" y1={waterY} y2={waterY} stroke="#183f80" strokeWidth="1.5" />
    </svg>
  )
}
