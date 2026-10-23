import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUp, Check, ClipboardList, Copy, LifeBuoy, MapPin, OctagonAlert, SquarePen, TriangleAlert, Waves, type LucideIcon } from 'lucide-react'
import { Mascot, type AnimId, type ExprId } from '../components/mascot/Mascot'
import { LifeCriticalList } from '../components/AdviceCard'
import { ADVISORY_BANNER } from '../constants/lifeCritical'
import { useT, type TKey } from '../i18n'
import { askBot, type BotReply, type Intent } from '../services/chat'
import { useEffectiveLayout, usePrefersReducedMotion, useSettings } from '../store/settings'

interface Msg extends Partial<BotReply> {
  id: number
  from: 'user' | 'bot'
  text: string
}

/** How Titis reacts to each kind of answer. */
const MOOD: Record<Intent, { expression: ExprId; anim: AnimId }> = {
  greeting: { expression: 'happy', anim: 'wink' },
  danger: { expression: 'attentive', anim: 'alert' },
  report: { expression: 'excited', anim: 'play' },
  status: { expression: 'curious', anim: 'notify' },
  flood: { expression: 'attentive', anim: 'exclaim' },
  roads: { expression: 'attentive', anim: 'exclaim' },
  safe: { expression: 'proud', anim: 'orbit' },
  bring: { expression: 'happy', anim: 'egg' },
  contacts: { expression: 'attentive', anim: 'notify' },
  depth: { expression: 'surprised', anim: 'wide' },
  thanks: { expression: 'laughing', anim: 'burst' },
  fallback: { expression: 'confused', anim: 'swirl' },
  answer: { expression: 'happy', anim: 'notify' },
}

const POKE_MOVES: AnimId[] = ['wink', 'play', 'egg', 'hexagon', 'swirl', 'orbit', 'comet', 'burst']
const STARTERS: { key: TKey; Icon: LucideIcon }[] = [
  { key: 'chip.roads', Icon: TriangleAlert },
  { key: 'chip.safe', Icon: MapPin },
  { key: 'chip.bring', Icon: LifeBuoy },
  { key: 'chip.status', Icon: ClipboardList },
]
const STORE_KEY = 'smartflow-chat'

export default function ChatPage() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const reduced = usePrefersReducedMotion()
  const layout = useEffectiveLayout(useLocation().pathname)

  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY)
      if (saved) return JSON.parse(saved) as Msg[]
    } catch {
      // ignore
    }
    return []
  })
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const started = messages.length > 0

  // Mascot state
  const [expression, setExpression] = useState<ExprId>('happy')
  const [play, setPlay] = useState<{ id: AnimId; nonce: number } | null>(null)
  const [hovering, setHovering] = useState(false)
  const pokes = useRef<number[]>([])
  const nonce = useRef(0)
  const idleTimer = useRef<number>(0)
  const endRef = useRef<HTMLDivElement>(null)
  // Only messages sent after the page opened animate in; restored history just appears.
  const openedAt = useRef(Date.now())
  const enter = (id: number) => (id > openedAt.current ? 'animate-rise' : '')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const doPlay = (id: AnimId) => setPlay({ id, nonce: ++nonce.current })

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {
      // ignore
    }
    if (messages.length) endRef.current?.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' })
  }, [messages, busy, reduced])

  // Bored after 20 seconds with nothing happening; the mascot itself naps later.
  const nudgeIdle = () => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setExpression('bored'), 20_000)
  }
  useEffect(() => {
    nudgeIdle()
    return () => window.clearTimeout(idleTimer.current)
  }, [])

  // Hover: curious at first, shy if you hover for a while.
  useEffect(() => {
    if (!hovering) return
    setExpression('curious')
    const id = window.setTimeout(() => setExpression('shy'), 3000)
    return () => window.clearTimeout(id)
  }, [hovering])

  // Grow the composer with its content, up to a limit.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  function poke() {
    nudgeIdle()
    const now = Date.now()
    pokes.current = [...pokes.current.filter((p) => now - p < 2500), now]
    if (pokes.current.length >= 5) {
      pokes.current = []
      setExpression('angry')
      doPlay('exclaim')
      window.setTimeout(() => setExpression('neutral'), 2500)
      return
    }
    setExpression(Math.random() < 0.5 ? 'laughing' : 'happy')
    doPlay(POKE_MOVES[Math.floor(Math.random() * POKE_MOVES.length)])
  }

  async function send(text: string) {
    const clean = text.trim()
    if (!clean || busy) return
    nudgeIdle()
    setDraft('')
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text: clean }])
    setBusy(true)
    try {
      const history = messages.slice(-10).map((m) => ({ role: m.from === 'user' ? ('user' as const) : ('assistant' as const), content: m.text }))
      const reply = await askBot(clean, lang, history)
      setMessages((m) => [...m, { id: Date.now() + 1, from: 'bot', ...reply }])
      const mood = MOOD[reply.intent]
      setExpression(mood.expression)
      doPlay(mood.anim)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(draft)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(draft)
    }
  }

  function newChat() {
    setMessages([])
    setExpression('happy')
    doPlay('wink')
    inputRef.current?.focus()
  }

  async function copy(m: Msg) {
    const text = [m.text, ...(m.items ?? []).map((i) => `- ${i}`)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(m.id)
      window.setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1500)
    } catch {
      // Clipboard blocked: nothing to do.
    }
  }

  const mascot = (size: number) => (
    <Mascot
      size={size}
      label={t('chat.mascotLabel')}
      expression={expression}
      play={play}
      busy={busy}
      onPoke={poke}
      onHoverChange={setHovering}
    />
  )

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] min-w-0 max-w-3xl flex-col browser:min-h-[calc(100dvh-6.5rem)]">
      <h1 className="sr-only">{t('chat.title')}</h1>

      {started ? (
        // Compact mascot bar stays at the top while chatting.
        <div className="sticky top-16 z-10 -mx-4 -mt-5 browser:top-[4.25rem] flex items-center gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur browser:-mt-6 browser:mx-0 browser:px-0">
          {mascot(layout === 'browser' ? 72 : 60)}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-primary-900">{t('chat.bot')}</p>
            <p className="text-sm text-slate-700" aria-live="polite">
              {busy ? t('chat.thinking') : t('chat.ready')}
            </p>
          </div>
          <button
            type="button"
            onClick={newChat}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-medium text-slate-800 hover:bg-slate-200"
          >
            <SquarePen aria-hidden className="size-4" />
            {t('chat.newChat')}
          </button>
        </div>
      ) : (
        // Empty state: big mascot and starter prompts, like an assistant home screen.
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          {mascot(layout === 'browser' ? 176 : 148)}
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{t('chat.heroTitle')}</p>
          <p className="mt-1 max-w-md text-slate-700">{t('chat.subtitle')}</p>

          <div className="mt-6 grid w-full max-w-xl gap-2 browser:grid-cols-2">
            <button
              type="button"
              onClick={() => send(t('chip.help'))}
              className="flex items-center gap-3 rounded-2xl border-2 border-red-700 bg-red-50 px-4 py-3 text-left font-semibold text-red-900 hover:bg-red-100 browser:col-span-2"
            >
              <OctagonAlert aria-hidden className="size-5 shrink-0 text-red-700" />
              {t('chip.help')}
            </button>
            <button
              type="button"
              onClick={() => send(t('chip.floods'))}
              className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left font-medium text-slate-800 hover:border-primary-600 hover:bg-primary-50 browser:col-span-2"
            >
              <Waves aria-hidden className="size-5 shrink-0 text-primary-700" />
              {t('chip.floods')}
            </button>
            {STARTERS.map(({ key, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => send(t(key))}
                className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left font-medium text-slate-800 hover:border-primary-600 hover:bg-primary-50"
              >
                <Icon aria-hidden className="size-5 shrink-0 text-primary-700" />
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      {started && (
        <div role="log" aria-live="polite" aria-label={t('chat.log')} className="flex-1 space-y-6 pb-4 pt-6">
          {messages.map((m) =>
            m.from === 'user' ? (
              <div key={m.id} className={`flex justify-end ${enter(m.id)}`}>
                <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-slate-200 px-4 py-2.5 text-slate-900">
                  <span className="sr-only">{t('chat.you')}: </span>
                  {m.text}
                </p>
              </div>
            ) : (
              <article key={m.id} className={`group text-slate-900 ${enter(m.id)}`}>
                <span className="sr-only">{t('chat.bot')}: </span>
                <p className="leading-relaxed">{m.text}</p>
                {m.critical && (
                  <div className="mt-3">
                    <LifeCriticalList headingId={`crit-${m.id}`} heading={t('advice.stay')} />
                  </div>
                )}
                {m.items && (
                  <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-relaxed">
                    {m.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                )}
                {m.links && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 font-semibold text-primary-700 hover:border-primary-600 hover:bg-primary-50"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => copy(m)}
                    aria-label={copied === m.id ? t('chat.copied') : t('chat.copy')}
                    title={copied === m.id ? t('chat.copied') : t('chat.copy')}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  >
                    {copied === m.id ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                  </button>
                </div>
              </article>
            ),
          )}
          {busy && (
            <p className="flex animate-fade items-center gap-1.5 text-slate-700" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block size-2 animate-bounce rounded-full bg-slate-500"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </p>
          )}
          {/* Scroll margin keeps the newest reply above the pinned composer. */}
          <div ref={endRef} className="scroll-mb-72 browser:scroll-mb-52" />
        </div>
      )}

      {/* Composer, pinned above the tab bar. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 -mx-4 bg-gradient-to-t from-slate-50 from-85% to-transparent px-4 pb-10 pt-4 browser:bottom-0 browser:mx-0 browser:px-0 browser:pb-3">
        {started && (
          // Urgent help stays one tap away during a conversation.
          <button
            type="button"
            onClick={() => send(t('chip.help'))}
            disabled={busy}
            className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-700 bg-red-50 px-3 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60"
          >
            <OctagonAlert aria-hidden className="size-4 text-red-700" />
            {t('chip.help')}
          </button>
        )}
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-3xl border border-slate-300 bg-white p-2 pl-4 shadow-sm focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600/30"
        >
          <label htmlFor="chat-input" className="sr-only">
            {t('chat.inputLabel')}
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              nudgeIdle()
              if (expression !== 'attentive' && e.target.value) setExpression('attentive')
            }}
            onKeyDown={onKeyDown}
            placeholder={t('chat.placeholder')}
            aria-describedby="chat-hint"
            maxLength={300}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 leading-6 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t('chat.send')}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white hover:bg-primary-800 disabled:bg-slate-300 disabled:text-slate-600"
          >
            <ArrowUp aria-hidden className="size-5" />
          </button>
        </form>
        <p id="chat-hint" className="sr-only">
          {t('chat.enterHint')}
        </p>
        <p role="note" className="mt-2 text-center text-sm text-slate-700">
          {ADVISORY_BANNER[lang]}
        </p>
      </div>
    </div>
  )
}
