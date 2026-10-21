import { useEffect, useId, useRef, type RefObject } from 'react'
import { usePrefersReducedMotion } from '../../store/settings'
import { MascotEngine, type MascotEls } from './engine'
import type { AnimId, ExprId } from './poses'

export type { AnimId, ExprId }

interface Props {
  size?: number
  expression?: ExprId
  /** Play a one-shot (or looping) move. Change `nonce` to replay the same move. */
  play?: { id: AnimId; nonce: number } | null
  /** Loops the thinking move while true. */
  busy?: boolean
  label: string
  /** Renders as a button: press to squish, Enter or Space works too. */
  onPoke?: () => void
  onHoverChange?: (hovering: boolean) => void
  sleepAfterMs?: number
  className?: string
}

const DOTS = 12

export function Mascot({ size = 120, expression = 'neutral', play, busy = false, label, onPoke, onHoverChange, sleepAfterMs = 45_000, className = '' }: Props) {
  const reduced = usePrefersReducedMotion()
  const gid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLElement>(null)
  const engineRef = useRef<MascotEngine | null>(null)

  // Element refs collected once; pools are fixed size.
  const els = useRef<Partial<MascotEls>>({ eyes: [], faceDots: [], backDots: [], dots: [], glyphs: [], arcs: [] })
  const pool = <T extends Element>(key: 'eyes' | 'faceDots' | 'backDots' | 'dots' | 'glyphs' | 'arcs', i: number) => (el: T | null) => {
    if (el) (els.current[key] as unknown as T[])[i] = el
  }
  const one = <K extends 'shadow' | 'bodyG' | 'body' | 'face' | 'eyesG'>(key: K) => (el: MascotEls[K] | null) => {
    if (el) els.current[key] = el
  }

  useEffect(() => {
    const engine = new MascotEngine(els.current as MascotEls, sleepAfterMs)
    engineRef.current = engine
    engine.setExpression(expression)
    if (busy) engine.setBusy(true)
    if (reduced) {
      engine.drawStill()
      return
    }
    engine.run()

    const onMove = (e: PointerEvent) => {
      const r = rootRef.current?.getBoundingClientRect()
      if (!r) return
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const span = Math.max(240, r.width * 2)
      engine.look((e.clientX - cx) / span, (e.clientY - cy) / span)
    }
    const onKey = () => engine.activity()
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      engine.stop()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
    }
    // Recreate only when motion preference changes; props are pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, sleepAfterMs])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setExpression(expression)
    if (reduced) engine.drawStill()
  }, [expression, reduced])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !play) return
    engine.play(play.id)
    if (reduced) engine.drawStill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.nonce, play?.id])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setBusy(busy)
    if (reduced) engine.drawStill()
  }, [busy, reduced])

  const svg = (
    <svg viewBox="-1.25 -1.25 2.5 2.5" width={size} height={size} aria-hidden focusable="false" className="block overflow-hidden">
      <defs>
        <radialGradient id={`${gid}-body`} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#5b8fe0" />
          <stop offset="55%" stopColor="#1f4e9c" />
          <stop offset="100%" stopColor="#133266" />
        </radialGradient>
      </defs>
      <ellipse ref={one('shadow')} cx="0" cy={0.9} rx="0.55" ry="0.07" fill="#0e2550" opacity="0.16" />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} ref={pool<SVGCircleElement>('backDots', i)} r="0" opacity="0" />
      ))}
      <g ref={one('bodyG')}>
        <path ref={one('body')} fill={`url(#${gid}-body)`} />
        <ellipse cx="-0.3" cy="-0.4" rx="0.2" ry="0.1" fill="#ffffff" opacity="0.22" transform="rotate(-32 -0.3 -0.4)" />
        <g ref={one('face')}>
          <g ref={one('eyesG')}>
            <rect ref={pool<SVGRectElement>('eyes', 0)} fill="#ffffff" />
            <rect ref={pool<SVGRectElement>('eyes', 1)} fill="#ffffff" />
          </g>
          {Array.from({ length: 3 }, (_, i) => (
            <circle key={i} ref={pool<SVGCircleElement>('faceDots', i)} r="0" opacity="0" />
          ))}
        </g>
      </g>
      {Array.from({ length: DOTS }, (_, i) => (
        <circle key={i} ref={pool<SVGCircleElement>('dots', i)} r="0" opacity="0" />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <text
          key={i}
          ref={pool<SVGTextElement>('glyphs', i)}
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="800"
          fontFamily="Inter Variable, system-ui, sans-serif"
          opacity="0"
        />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <path key={i} ref={pool<SVGPathElement>('arcs', i)} fill="none" strokeLinecap="round" opacity="0" />
      ))}
    </svg>
  )

  if (onPoke) {
    return (
      <button
        ref={rootRef as RefObject<HTMLButtonElement>}
        type="button"
        aria-label={label}
        onPointerDown={() => engineRef.current?.poke()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && engineRef.current?.poke()}
        onClick={onPoke}
        onPointerEnter={() => onHoverChange?.(true)}
        onPointerLeave={() => onHoverChange?.(false)}
        className={`shrink-0 touch-manipulation rounded-full ${className}`}
      >
        {svg}
      </button>
    )
  }
  return (
    <span ref={rootRef as RefObject<HTMLSpanElement>} role="img" aria-label={label} className={`inline-block shrink-0 ${className}`}>
      {svg}
    </span>
  )
}

/** Small static face for icons and chat avatars. No animation loop. */
export function MascotIcon({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="-1 -1 2 2" aria-hidden focusable="false" className={className}>
      <circle r="0.92" fill="currentColor" />
      <rect x="-0.4" y="-0.24" width="0.22" height="0.42" rx="0.11" fill="#ffffff" />
      <rect x="0.18" y="-0.24" width="0.22" height="0.42" rx="0.11" fill="#ffffff" />
    </svg>
  )
}
