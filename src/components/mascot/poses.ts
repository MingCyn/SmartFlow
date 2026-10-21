// Titis, the SmartFlow mascot: pose data and animation curves.
// Original drawing: a blue droplet-round body with two pill eyes. All motion is
// plain math on numbers, so poses can be blended without an animation library.

export const R = 0.78 // body radius in viewBox units
export const EYE_SCALE = 1.35 // eye sizes below are authored small, drawn larger
export const N = 72 // outline samples
const TAU = Math.PI * 2
const ANGLES = Array.from({ length: N }, (_, i) => (i / N) * TAU - Math.PI / 2)

export const EXPRESSION_IDS = [
  'neutral', 'attentive', 'surprised', 'excited', 'happy', 'laughing', 'angry', 'sad',
  'scared', 'suspicious', 'confused', 'curious', 'proud', 'shy', 'bored', 'sleepy',
] as const
export type ExprId = (typeof EXPRESSION_IDS)[number]

export const ANIM_IDS = [
  'idle', 'thinking', 'wink', 'wide', 'alert', 'notify', 'exclaim', 'sleep',
  'egg', 'hexagon', 'play', 'orbit', 'swirl', 'burst', 'comet',
] as const
export type AnimId = (typeof ANIM_IDS)[number]

export interface Eye {
  w: number
  h: number
  tilt: number
  open: number
}

export interface Pose {
  radii: number[]
  sx: number
  sy: number
  rot: number
  x: number
  y: number
  eyes: [Eye, Eye]
  split: number
  gx: number
  gy: number
  roll: number
  eyeAlpha: number
}

export interface Dot {
  x: number
  y: number
  r: number
  o: number
  fill?: string
}
export interface Glyph {
  text: string
  x: number
  y: number
  size: number
  o: number
  fill?: string
}
export interface Arc {
  cx: number
  cy: number
  r: number
  a0: number
  a1: number
  o: number
  w: number
  color: string
}
export interface Overlay {
  faceDots?: Dot[]
  backDots?: Dot[]
  dots?: Dot[]
  glyphs?: Glyph[]
  arcs?: Arc[]
}

export interface Expression {
  eyes: [Eye, Eye]
  split?: number
  gx?: number
  gy?: number
  roll?: number
  sy?: number
  wobble?: 'bounce' | 'shake' | 'tremble' | 'sway'
}

export interface AnimDef {
  duration: number
  /** Seconds to blend from the previous pose. */
  morph: number
  loop?: boolean
  /** Frame shown when motion is reduced. */
  still?: number
  pose: (t: number, base: Pose, expr: Expression) => Pose
  overlay?: (t: number, pose: Pose) => Overlay
}

// ---------- math helpers ----------
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const easeOutCubic = (k: number) => 1 - (1 - k) ** 3
const easeInCubic = (k: number) => k * k * k
const easeOutBack = (k: number) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2
const pulse = (t: number, period: number) => Math.max(0, Math.sin((((t / period) % 1) + 1) % 1 * TAU))
const fadeInOut = (t: number, d: number, edge = 0.25) => clamp01(t / edge) * clamp01((d - t) / edge)

const pair = (w: number, h: number, tilt = 0): [Eye, Eye] => [
  { w, h, tilt, open: 1 },
  { w, h, tilt, open: 1 },
]

// ---------- body shapes ----------
type ShapeFn = (a: number) => number
const polygon = (n: number): ShapeFn => {
  const seg = TAU / n
  const vertex = -Math.PI / 2
  return (a) => {
    const d = ((((a - vertex) % seg) + seg) % seg) - seg / 2
    return Math.cos(seg / 2) / Math.cos(d)
  }
}
const SHAPES = {
  circle: () => 1,
  egg: (a: number) => 0.97 + 0.1 * Math.sin(a),
  hexagon: polygon(6),
  triangle: (a: number) => 1.18 * polygon(3)(a),
}
type ShapeId = keyof typeof SHAPES

const shapeCache = new Map<string, number[]>()
export function radiiFor(shape: ShapeId, mix = 1): number[] {
  const key = `${shape}:${mix}`
  let r = shapeCache.get(key)
  if (!r) {
    r = ANGLES.map((a) => 1 + (SHAPES[shape](a) - 1) * mix)
    shapeCache.set(key, r)
  }
  return r
}
const CIRCLE = radiiFor('circle')

/** Closed smooth outline through the sampled points (quadratic midpoint smoothing). */
export function bodyPath(radii: number[]): string {
  const pts = radii.map((r, i) => [Math.cos(ANGLES[i]) * r * R, Math.sin(ANGLES[i]) * r * R])
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const start = mid(pts[N - 1], pts[0])
  let d = `M${start[0].toFixed(4)} ${start[1].toFixed(4)}`
  for (let i = 0; i < N; i++) {
    const p = pts[i]
    const m = mid(p, pts[(i + 1) % N])
    d += `Q${p[0].toFixed(4)} ${p[1].toFixed(4)} ${m[0].toFixed(4)} ${m[1].toFixed(4)}`
  }
  return d + 'Z'
}

// ---------- expressions (16) ----------
export const EXPRESSIONS: Record<ExprId, Expression> = {
  neutral: { eyes: pair(0.2, 0.36) },
  attentive: { eyes: pair(0.19, 0.4), gy: -0.04 },
  surprised: { eyes: pair(0.28, 0.4), gy: -0.05, sy: 1.03 },
  excited: { eyes: pair(0.24, 0.46, -6), gy: -0.08, wobble: 'bounce' },
  happy: { eyes: pair(0.26, 0.11, -8), gy: 0.02 },
  laughing: { eyes: pair(0.28, 0.08, -16), gy: 0.03, wobble: 'shake' },
  angry: { eyes: pair(0.27, 0.13, 24), gy: 0.04, sy: 0.97 },
  sad: { eyes: pair(0.24, 0.15, -22), gy: 0.12, sy: 0.96 },
  scared: { eyes: pair(0.14, 0.44), split: 0.21, wobble: 'tremble' },
  suspicious: { eyes: pair(0.24, 0.1), gx: 0.12 },
  confused: { eyes: [{ w: 0.2, h: 0.4, tilt: 0, open: 1 }, { w: 0.22, h: 0.18, tilt: -10, open: 1 }], roll: 9 },
  curious: { eyes: [{ w: 0.2, h: 0.36, tilt: 0, open: 1 }, { w: 0.24, h: 0.44, tilt: 0, open: 1 }], gx: 0.08, gy: -0.05, roll: -7 },
  proud: { eyes: pair(0.24, 0.12, 10), gy: -0.12, sy: 1.03 },
  shy: { eyes: pair(0.16, 0.24), gx: -0.13, gy: 0.11, split: 0.22, sy: 0.96 },
  bored: { eyes: pair(0.25, 0.13), gx: 0.13, gy: 0.04 },
  sleepy: { eyes: pair(0.23, 0.06), gy: 0.06, wobble: 'sway' },
}

export function basePose(expr: Expression): Pose {
  return {
    radii: CIRCLE,
    sx: 1,
    sy: expr.sy ?? 1,
    rot: 0,
    x: 0,
    y: 0,
    eyes: expr.eyes,
    split: expr.split ?? 0.25,
    gx: expr.gx ?? 0,
    gy: expr.gy ?? 0,
    roll: expr.roll ?? 0,
    eyeAlpha: 1,
  }
}

export function blendPose(a: Pose, b: Pose, k: number): Pose {
  const eye = (x: Eye, y: Eye): Eye => ({ w: lerp(x.w, y.w, k), h: lerp(x.h, y.h, k), tilt: lerp(x.tilt, y.tilt, k), open: lerp(x.open, y.open, k) })
  return {
    radii: a.radii === b.radii ? b.radii : a.radii.map((r, i) => lerp(r, b.radii[i], k)),
    sx: lerp(a.sx, b.sx, k),
    sy: lerp(a.sy, b.sy, k),
    rot: lerp(a.rot, b.rot, k),
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    eyes: [eye(a.eyes[0], b.eyes[0]), eye(a.eyes[1], b.eyes[1])],
    split: lerp(a.split, b.split, k),
    gx: lerp(a.gx, b.gx, k),
    gy: lerp(a.gy, b.gy, k),
    roll: lerp(a.roll, b.roll, k),
    eyeAlpha: lerp(a.eyeAlpha, b.eyeAlpha, k),
  }
}

const breathe = (p: Pose, t: number, period = 2.4, amt = 1): Pose => {
  const b = Math.sin((TAU * t) / period) * amt
  return { ...p, sy: p.sy * (1 + 0.025 * b), sx: p.sx * (1 - 0.018 * b), y: p.y - 0.012 * b }
}

const BLUE = '#2f63b8'
const DEEP = '#183f80'
const LIGHT = '#adc4ea'
const ACCENT = '#e4002b'
const DANGER = '#b91c1c'

// ---------- animations (15) ----------
export const ANIMS: Record<AnimId, AnimDef> = {
  idle: {
    duration: 2.4,
    morph: 0.45,
    loop: true,
    still: 0,
    pose: (t, b, ex) => {
      const p = breathe(b, t)
      if (ex.wobble === 'bounce') p.y -= Math.abs(Math.sin(TAU * t * 0.6)) * 0.07
      if (ex.wobble === 'shake') p.rot = Math.sin(TAU * t * 2.5) * 3.5
      if (ex.wobble === 'tremble') p.x = Math.sin(TAU * t * 6.5) * 0.012
      if (ex.wobble === 'sway') p.rot = Math.sin((TAU * t) / 2.4) * 6
      return p
    },
  },

  thinking: {
    duration: 2.4,
    morph: 0.35,
    loop: true,
    still: 0.3,
    pose: (t, b) => ({ ...breathe(b, t, 1.2, 0.6), eyeAlpha: 0 }),
    overlay: (t) => ({
      faceDots: [-0.27, 0, 0.27].map((x, i) => {
        const p = pulse(t - i * 0.2, 1.2)
        return { x, y: -0.03 * p, r: 0.075 * (1 + 0.4 * p), o: 0.55 + 0.45 * p }
      }),
    }),
  },

  wink: {
    duration: 1.6,
    morph: 0.25,
    still: 0.6,
    pose: (t, b) => {
      const on = t > 0.15 && t < 1.25
      return {
        ...b,
        eyes: on ? [b.eyes[0], { w: 0.26, h: 0.05, tilt: -6, open: 1 }] : b.eyes,
        gx: b.gx - (on ? 0.04 : 0),
        roll: on ? 7 : b.roll,
        sy: b.sy * (on ? 1.02 : 1),
      }
    },
  },

  wide: {
    duration: 1.8,
    morph: 0.2,
    still: 0.5,
    pose: (t, b) => {
      const pop = easeOutBack(clamp01(t / 0.35))
      const settle = 1 - clamp01((t - 0.9) / 0.9)
      return { ...b, eyes: pair(0.2 + 0.08 * pop * settle, 0.36 + 0.16 * pop * settle), gy: -0.06 * settle, sy: 1 + 0.06 * settle, sx: 1 - 0.04 * settle }
    },
  },

  alert: {
    duration: 2.4,
    morph: 0.4,
    still: 1,
    pose: (t, b) => ({
      ...b,
      radii: radiiFor('triangle', 0.55),
      eyeAlpha: 0,
      x: Math.sin(t * 42) * 0.025 * (1 - clamp01(t / 0.5)),
    }),
    overlay: (t, p) => {
      const ph = (t % 1.2) / 1.2
      return {
        glyphs: [{ text: '!', x: p.x, y: p.y + 0.1, size: 0.82, o: clamp01((t - 0.15) / 0.3), fill: '#ffffff' }],
        arcs: [{ cx: p.x, cy: p.y + 0.05, r: 0.92 + 0.35 * ph, a0: 0, a1: TAU, o: (1 - ph) * 0.7 * fadeInOut(t, 2.4, 0.2), w: 0.05, color: DANGER }],
      }
    },
  },

  notify: {
    duration: 2.2,
    morph: 0.3,
    still: 1,
    pose: (t, b) => ({ ...b, y: -Math.sin(Math.PI * clamp01(t / 0.45)) * 0.08, gx: 0.1, gy: -0.1 }),
    overlay: (t, p) => ({
      dots: [{ x: p.x + 0.56, y: p.y - 0.56, r: 0.15 * easeOutBack(clamp01((t - 0.1) / 0.4)) * clamp01((2.2 - t) / 0.3), o: 1, fill: ACCENT }],
    }),
  },

  exclaim: {
    duration: 2,
    morph: 0.3,
    still: 0.9,
    pose: (t, b) => {
      const jump = Math.sin(Math.PI * clamp01(t / 0.5))
      const land = t > 0.5 && t < 0.75 ? Math.sin(Math.PI * ((t - 0.5) / 0.25)) : 0
      return { ...b, eyeAlpha: 0, y: -0.18 * jump, sy: 1 + 0.05 * jump - 0.1 * land, sx: 1 + 0.08 * land }
    },
    overlay: (t, p) => ({ glyphs: [{ text: '!', x: p.x, y: p.y + 0.02, size: 1, o: clamp01(t / 0.2) * clamp01((2 - t) / 0.25), fill: '#ffffff' }] }),
  },

  sleep: {
    duration: 2.4,
    morph: 0.6,
    loop: true,
    still: 0.8,
    pose: (t, b) => ({ ...breathe(b, t, 2.4, 1.6), eyes: pair(0.22, 0.035), gy: 0.05, sy: 0.95, y: 0.04 }),
    overlay: (t, p) => ({
      glyphs: [0, 1, 2].map((i) => {
        const ph = (t / 2.4 + i / 3) % 1
        return { text: 'z', x: p.x + 0.55 + ph * 0.35, y: p.y - 0.5 - ph * 0.6, size: 0.22 + ph * 0.16, o: Math.sin(Math.PI * ph), fill: BLUE }
      }),
    }),
  },

  egg: {
    duration: 1.8,
    morph: 0.35,
    still: 1,
    pose: (t, b) => ({ ...b, radii: radiiFor('egg'), sy: 1.08, sx: 0.95, rot: Math.sin(t * 9) * 7 * Math.exp(-t * 2), eyes: pair(0.17, 0.3), gy: 0.06 }),
  },

  hexagon: {
    duration: 1.6,
    morph: 0.35,
    still: 1,
    pose: (t, b) => ({ ...b, radii: radiiFor('hexagon', 0.9), rot: 30 * easeInOut(clamp01(t / 0.8)), eyes: pair(0.2, 0.3) }),
  },

  play: {
    duration: 2,
    morph: 0.2,
    still: 0.25,
    pose: (t, b) => {
      const h = Math.sin(Math.PI * (t % 1))
      const ground = h < 0.15 ? 1 - h / 0.15 : 0
      return {
        ...b,
        y: -0.3 * h,
        sy: ground ? 1 - 0.15 * ground : 1 + 0.05 * h,
        sx: ground ? 1 + 0.12 * ground : 1 - 0.04 * h,
        eyes: pair(0.25, 0.12, -8),
      }
    },
  },

  orbit: {
    duration: 3.4,
    morph: 0.3,
    still: 0.6,
    pose: (t, b) => {
      const a = (TAU * t) / 1.7
      return { ...breathe(b, t), gx: Math.cos(a) * 0.1, gy: Math.sin(a) * 0.06 }
    },
    overlay: (t) => {
      const a = (TAU * t) / 1.7
      const front = Math.sin(a) >= 0
      const dot: Dot = { x: Math.cos(a) * 1.02, y: Math.sin(a) * 0.3 - 0.05, r: 0.085 * (1 + 0.25 * Math.sin(a)), o: fadeInOut(t, 3.4, 0.3), fill: DEEP }
      return front ? { dots: [dot] } : { backDots: [{ ...dot, o: dot.o * 0.6 }] }
    },
  },

  swirl: {
    duration: 1.3,
    morph: 0.25,
    still: 0.5,
    pose: (t, b) => ({ ...b, rot: Math.sin(t * 5) * 4 }),
    overlay: (t) => ({
      arcs: [0, 1, 2].map((i) => {
        const a = t * TAU * 1.2 + (i * TAU) / 3
        return { cx: 0, cy: 0, r: 1.0, a0: a, a1: a + 0.9, o: fadeInOut(t, 1.3, 0.2), w: 0.06, color: BLUE }
      }),
    }),
  },

  burst: {
    duration: 2.6,
    morph: 0.2,
    still: 0.9,
    pose: (t, b) => {
      if (t < 0.5) {
        const k = easeInOut(t / 0.5)
        return { ...b, sy: 1 - 0.2 * k, sx: 1 + 0.14 * k, eyes: pair(0.25, 0.06) }
      }
      const k = clamp01((t - 0.5) / 0.5)
      const spring = Math.sin(k * Math.PI * 2.5) * (1 - k) * 0.14
      return { ...b, sy: 1 + spring, sx: 1 - spring * 0.7, eyes: pair(0.26, 0.11, -8) }
    },
    overlay: (t) => {
      if (t < 0.5) return {}
      const p = clamp01((t - 0.5) / 1.4)
      const colours = [LIGHT, BLUE, ACCENT, DEEP]
      return {
        dots: Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * TAU + 0.3
          const dist = 0.85 + 0.35 * easeOutCubic(p)
          return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: 0.07 * (1 - p) + 0.01, o: 1 - p, fill: colours[i % colours.length] }
        }),
      }
    },
  },

  comet: {
    duration: 2.4,
    morph: 0.15,
    still: 0,
    pose: (t, b) => {
      let x = 0
      let moving = 0
      if (t < 1) {
        x = 1.9 * easeInCubic(t)
        moving = t
      } else if (t < 1.2) {
        x = -1.9
      } else {
        const k = clamp01((t - 1.2) / 1)
        x = -1.9 * (1 - easeOutCubic(k))
        moving = 1 - k
      }
      return { ...b, x, sx: 1 + 0.2 * moving, sy: 1 - 0.12 * moving, gx: 0.12 * Math.sign(moving), eyes: pair(0.22, 0.3) }
    },
    overlay: (t, p) => {
      const moving = t < 1 ? t : t >= 1.2 ? 1 - clamp01((t - 1.2) / 1) : 0
      return {
        backDots: Array.from({ length: 5 }, (_, i) => ({
          x: p.x - 0.28 * (i + 1),
          y: p.y,
          r: R * (0.8 - i * 0.14),
          o: 0.22 * (1 - i / 5) * moving,
          fill: BLUE,
        })),
      }
    },
  },
}

export function arcPath(a: Arc): string {
  const span = a.a1 - a.a0
  const pt = (ang: number) => `${(a.cx + Math.cos(ang) * a.r).toFixed(4)} ${(a.cy + Math.sin(ang) * a.r).toFixed(4)}`
  if (span >= TAU - 1e-3) {
    // Full ring as two half arcs.
    return `M${pt(a.a0)}A${a.r} ${a.r} 0 1 1 ${pt(a.a0 + Math.PI)}A${a.r} ${a.r} 0 1 1 ${pt(a.a0)}`
  }
  return `M${pt(a.a0)}A${a.r} ${a.r} 0 ${span > Math.PI ? 1 : 0} 1 ${pt(a.a1)}`
}
