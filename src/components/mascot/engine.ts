import {
  ANIMS, EXPRESSIONS, EYE_SCALE, R, arcPath, basePose, blendPose, bodyPath, clamp01, easeInOut,
  type AnimId, type Dot, type ExprId, type Overlay, type Pose,
} from './poses'

export interface MascotEls {
  shadow: SVGEllipseElement
  bodyG: SVGGElement
  body: SVGPathElement
  face: SVGGElement
  eyesG: SVGGElement
  eyes: SVGRectElement[]
  faceDots: SVGCircleElement[]
  backDots: SVGCircleElement[]
  dots: SVGCircleElement[]
  glyphs: SVGTextElement[]
  arcs: SVGPathElement[]
}

/**
 * Drives one mascot instance. Writes SVG attributes directly each frame so
 * React does not re-render 60 times a second.
 */
export class MascotEngine {
  private anim: AnimId = 'idle'
  private start = performance.now()
  private exprId: ExprId = 'neutral'
  private cur: Pose = basePose(EXPRESSIONS.neutral)
  private from: Pose = this.cur
  private busy = false
  private raf = 0
  private lastFrame = performance.now()
  private gaze = { x: 0, y: 0 }
  private gazeTarget = { x: 0, y: 0 }
  private squish = { s: 0, v: 0 }
  private blinkAt = performance.now() + 1500
  private blinkStart = -1
  private lastActivity = performance.now()
  private readonly els: MascotEls
  private readonly sleepAfterMs: number

  constructor(els: MascotEls, sleepAfterMs: number) {
    this.els = els
    this.sleepAfterMs = sleepAfterMs
  }

  get current(): AnimId {
    return this.anim
  }

  setExpression(id: ExprId) {
    if (id === this.exprId) return
    this.exprId = id
    this.from = this.cur
    if (this.anim === 'idle') this.start = performance.now()
  }

  play(id: AnimId) {
    this.from = this.cur
    this.anim = id
    this.start = performance.now()
    this.lastActivity = performance.now()
  }

  setBusy(busy: boolean) {
    this.busy = busy
    if (busy) this.play('thinking')
    else if (this.anim === 'thinking') this.play('idle')
  }

  /** Pointer position relative to the mascot centre, roughly -1 to 1 on each axis. */
  look(x: number, y: number) {
    this.gazeTarget = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }
    this.activity()
  }

  activity() {
    const now = performance.now()
    this.lastActivity = now
    // Short grace period so a nap started from a button is visible before waking.
    if (this.anim === 'sleep' && now - this.start > 2500) this.play('wide')
  }

  poke() {
    this.squish.s = 0.2
    this.squish.v = 0
    this.activity()
  }

  run() {
    const tick = (now: number) => {
      this.frame(now)
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  /** Reduced motion: draw one representative frame, no loop, no blinking. */
  drawStill() {
    const def = ANIMS[this.anim]
    const t = def.still ?? 0
    const pose = def.pose(t, basePose(EXPRESSIONS[this.exprId]), EXPRESSIONS[this.exprId])
    this.cur = pose
    this.draw(pose, def.overlay?.(t, pose) ?? {}, 1)
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now

    let def = ANIMS[this.anim]
    let t = (now - this.start) / 1000
    if (!def.loop && t >= def.duration) {
      this.from = this.cur
      this.anim = this.busy ? 'thinking' : 'idle'
      this.start = now
      def = ANIMS[this.anim]
      t = 0
    }
    if (this.anim === 'idle' && now - this.lastActivity > this.sleepAfterMs) {
      this.play('sleep')
      def = ANIMS.sleep
      t = 0
    }

    const local = def.loop ? t % def.duration : t
    const expr = EXPRESSIONS[this.exprId]
    const target = def.pose(local, basePose(expr), expr)
    const k = easeInOut(clamp01(t / def.morph))
    const pose = k >= 1 ? target : blendPose(this.from, target, k)
    this.cur = pose

    // Gaze eases toward the pointer.
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * Math.min(1, dt * 8)
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * Math.min(1, dt * 8)

    // Damped spring for the press squish.
    const acc = -220 * this.squish.s - 14 * this.squish.v
    this.squish.v += acc * dt
    this.squish.s += this.squish.v * dt

    // Blink at random intervals, sometimes twice.
    let blink = 1
    if (this.blinkStart < 0 && now >= this.blinkAt) this.blinkStart = now
    if (this.blinkStart >= 0) {
      const b = (now - this.blinkStart) / 160
      if (b >= 1) {
        this.blinkStart = -1
        this.blinkAt = now + (Math.random() < 0.2 ? 180 : 2200 + Math.random() * 4200)
      } else blink = 1 - Math.sin(Math.PI * b) * 0.92
    }

    this.draw(pose, def.overlay?.(local, pose) ?? {}, blink)
  }

  private draw(p: Pose, o: Overlay, blink: number) {
    const e = this.els
    const s = this.squish.s
    e.body.setAttribute('d', bodyPath(p.radii))
    e.bodyG.setAttribute(
      'transform',
      `translate(${p.x} ${p.y}) translate(0 ${R}) scale(${p.sx * (1 + s)} ${p.sy * (1 - s)}) translate(0 ${-R}) rotate(${p.rot})`,
    )
    const gx = p.gx + this.gaze.x * 0.12
    const gy = p.gy + this.gaze.y * 0.1
    e.face.setAttribute('transform', `translate(${gx} ${gy}) rotate(${p.roll})`)
    e.eyesG.setAttribute('opacity', String(p.eyeAlpha))
    p.eyes.forEach((eye, i) => {
      const el = e.eyes[i]
      const w = eye.w * EYE_SCALE
      const h = Math.max(0.02, eye.h * EYE_SCALE * eye.open * blink)
      const side = i === 0 ? -1 : 1
      el.setAttribute('x', String(-w / 2))
      el.setAttribute('y', String(-h / 2))
      el.setAttribute('width', String(w))
      el.setAttribute('height', String(h))
      el.setAttribute('rx', String(Math.min(w, h) / 2))
      el.setAttribute('transform', `translate(${side * p.split * 1.12} 0) rotate(${-side * eye.tilt})`)
    })

    const lift = Math.max(0, -p.y)
    e.shadow.setAttribute('cx', String(p.x))
    e.shadow.setAttribute('rx', String(0.55 * p.sx * (1 - lift * 0.6)))
    e.shadow.setAttribute('opacity', String(0.16 * (1 - lift)))

    setDots(e.faceDots, o.faceDots)
    setDots(e.backDots, o.backDots)
    setDots(e.dots, o.dots)
    e.glyphs.forEach((el, i) => {
      const g = o.glyphs?.[i]
      if (!g) return el.setAttribute('opacity', '0')
      if (el.textContent !== g.text) el.textContent = g.text
      el.setAttribute('x', String(g.x))
      el.setAttribute('y', String(g.y))
      el.setAttribute('font-size', String(g.size))
      el.setAttribute('fill', g.fill ?? '#ffffff')
      el.setAttribute('opacity', String(g.o))
    })
    e.arcs.forEach((el, i) => {
      const a = o.arcs?.[i]
      if (!a) return el.setAttribute('opacity', '0')
      el.setAttribute('d', arcPath(a))
      el.setAttribute('stroke', a.color)
      el.setAttribute('stroke-width', String(a.w))
      el.setAttribute('opacity', String(a.o))
    })
  }
}

function setDots(pool: SVGCircleElement[], list?: Dot[]) {
  pool.forEach((el, i) => {
    const d = list?.[i]
    if (!d) return el.setAttribute('opacity', '0')
    el.setAttribute('cx', String(d.x))
    el.setAttribute('cy', String(d.y))
    el.setAttribute('r', String(Math.max(0, d.r)))
    el.setAttribute('opacity', String(d.o))
    el.setAttribute('fill', d.fill ?? '#ffffff')
  })
}
