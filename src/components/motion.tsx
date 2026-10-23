// Small motion primitives shared across pages. All CSS-driven, so reduced motion freezes them.

/** Numbered step marker that turns into a drawn tick when the step is complete. */
export function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200 ${
        done ? 'bg-primary-700 text-white' : 'border-2 border-slate-300 text-slate-600'
      }`}
    >
      {done ? (
        <svg key="tick" viewBox="0 0 24 24" className="size-4 animate-pop" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="animate-draw" />
        </svg>
      ) : (
        n
      )}
    </span>
  )
}

/** Large success tick: ring scales in, then the check draws itself. */
export function DrawnCheck({ className = 'size-16' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={`${className} text-primary-700`} fill="none">
      <circle cx="32" cy="32" r="30" className="origin-center animate-pop fill-primary-50" />
      <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="3" pathLength={1} strokeDasharray={1} className="origin-center -rotate-90 animate-draw" />
      <path
        d="M20 33.5l8 8L45 24"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        className="animate-draw [animation-delay:320ms]"
      />
    </svg>
  )
}
