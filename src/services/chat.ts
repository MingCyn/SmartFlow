// Chatbot. Free text is answered by the LLM via /api/chat (Groq, key held server-side),
// grounded in the app's safety data, reports and live weather. Keyword intents still
// pick the mascot mood and quick links, and are the offline fallback.
// Safety-critical replies never contain generated text: danger is caught locally first,
// sets `critical`, and the UI renders the frozen lines from src/constants/lifeCritical.ts.
import { translate, type TKey } from '../i18n'
import { STATUS_META } from '../lib/status'
import type { Lang } from '../store/settings'
import { respond } from './client'
import { getMyReports } from './reports'
import { getSafety } from './safety'
import { getWeather, weatherLabel } from './weather'
import { TOWNSHIP_CENTER } from './cells'
import { useGeo } from '../store/location'

export type Intent =
  | 'greeting' | 'danger' | 'report' | 'status' | 'roads' | 'safe'
  | 'bring' | 'contacts' | 'depth' | 'thanks' | 'fallback' | 'answer'

export interface BotReply {
  intent: Intent
  text: string
  items?: string[]
  links?: { to: string; label: string }[]
  critical?: boolean
}

// Order matters: danger is always checked first.
const INTENTS: [Intent, RegExp][] = [
  ['danger', /\b(trapped|stuck|drown|help me|need help|help now|emergency|sos|injur|swept|terperangkap|lemas|tolong|bantuan|kecemasan|cedera|hanyut)/i],
  // A bare greeting only, so "selamat pagi" is not read as a safe-point question.
  ['greeting', /^\s*(hi|hello|hey|hai|helo|salam|assalamualaikum|selamat (pagi|petang|malam))\s*[!.]*\s*$/i],
  ['status', /\b(status|my report|track|laporan saya|jejak)/i],
  ['report', /\b(report|photo|lapor|gambar|send a)/i],
  ['roads', /\b(road|jalan|avoid|elak|closed|tutup|drive|memandu)/i],
  ['safe', /\b(safe|shelter|evacuat|hall|pindah|selamat|dewan|pps)/i],
  ['bring', /\b(bring|pack|bag|checklist|bawa|dibawa|kemas|beg)/i],
  ['contacts', /\b(contact|call|number|phone|bomba|nadma|jps|hubungi|nombor|telefon)/i],
  ['depth', /\b(deep|depth|ankle|knee|dalam|buku lali|lutut)/i],
  ['thanks', /\b(thank|thanks|tq|terima kasih)/i],
  ['greeting', /^\s*(hi|hello|hey|hai|helo|salam)\b/i],
]

export function detectIntent(text: string): Intent {
  return INTENTS.find(([, re]) => re.test(text))?.[0] ?? 'fallback'
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Facts the LLM may use. It is told never to state anything outside this. */
async function buildContext(lang: Lang): Promise<string> {
  const tr = (k: TKey, v?: Record<string, string | number>) => translate(lang, k, v)
  const [safety, reports, weather] = await Promise.all([
    getSafety(),
    getMyReports(),
    getWeather(useGeo.getState().position ?? TOWNSHIP_CENTER, AbortSignal.timeout(4000)).catch(() => null),
  ])
  const lines = [
    'Roads: ' + safety.roadClosures.map((r) => `${r.name} (${r.severity}, zone ${r.cellId}): ${r.reason[lang]}`).join('; '),
    'Safe points: ' + safety.safePoints.map((p) => `${p.name[lang]} (zone ${p.cellId}): ${p.note[lang]}`).join('; '),
    'Official contacts: ' + safety.contacts.map((c) => `${c.name[lang]}: ${c.phone ?? c.url}`).join('; '),
    'Go-bag checklist: ' + safety.checklist.map((c) => c[lang]).join(', '),
    'Depth options when reporting: ankle (about 10 cm), knee (about 50 cm), car door (about 90 cm).',
    reports.length
      ? "User's reports: " + reports.slice(0, 3).map((r) => `${r.id} in zone ${r.cellId}, ${r.depth}, status ${tr(STATUS_META[r.status].label)}, sent ${r.createdAt}`).join('; ')
      : 'User has not sent any reports.',
  ]
  if (weather)
    lines.push(
      `Live weather (${useGeo.getState().position ? "user's location" : 'township'}): ${weatherLabel(weather.code, lang)}, ${Math.round(weather.tempC)} C, rain now ${weather.precipMm} mm, next 3 hours ${weather.next3hMm} mm, hourly rain chance ${weather.next.map((h) => h.chancePct + '%').join(' ')}.`,
    )
  return lines.join('\n')
}

async function askLlm(history: ChatTurn[], lang: Lang): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, history, context: await buildContext(lang) }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`chat ${res.status}`)
  const { text } = (await res.json()) as { text: string }
  if (!text) throw new Error('empty reply')
  return text
}

/** history: earlier turns, oldest first, not including `message`. */
export async function askBot(message: string, lang: Lang, history: ChatTurn[] = []): Promise<BotReply> {
  const local = await keywordReply(message, lang)
  // Danger never goes to the model: the frozen safety lines are the whole answer.
  if (local.critical) return local
  try {
    const text = await askLlm([...history, { role: 'user', content: message }], lang)
    // Prose replaces the canned text and lists; keep the quick links.
    return { intent: local.intent === 'fallback' ? 'answer' : local.intent, text, links: local.links }
  } catch {
    return local
  }
}

async function keywordReply(message: string, lang: Lang): Promise<BotReply> {
  const tr = (k: TKey, v?: Record<string, string | number>) => translate(lang, k, v)
  const intent = detectIntent(message)
  const adviceLink = { to: '/advice', label: tr('nav.advice') }
  let reply: BotReply

  switch (intent) {
    case 'danger':
      reply = { intent, text: tr('bot.danger'), critical: true }
      break
    case 'report':
      reply = { intent, text: tr('bot.report'), links: [{ to: '/report', label: tr('chip.report') }] }
      break
    case 'status': {
      const [latest] = await getMyReports()
      reply = latest
        ? {
            intent,
            text: tr('bot.status', { id: latest.id, zone: tr('zone', { id: latest.cellId }), status: tr(STATUS_META[latest.status].label) }),
            links: [{ to: '/status', label: tr('nav.status') }],
          }
        : { intent, text: tr('bot.statusNone'), links: [{ to: '/report', label: tr('chip.report') }] }
      break
    }
    case 'roads': {
      const { roadClosures } = await getSafety()
      reply = {
        intent,
        text: tr('bot.roads'),
        items: roadClosures.map((r) => `${r.name} (${tr(r.severity === 'closed' ? 'advice.closed' : 'advice.avoid')}): ${r.reason[lang]}`),
        links: [adviceLink],
      }
      break
    }
    case 'safe': {
      const { safePoints } = await getSafety()
      reply = { intent, text: tr('bot.safe'), items: safePoints.map((s) => `${s.name[lang]}, ${tr('zone', { id: s.cellId })}. ${s.note[lang]}`), links: [adviceLink] }
      break
    }
    case 'bring': {
      const { checklist } = await getSafety()
      reply = { intent, text: tr('bot.bring'), items: checklist.slice(0, 6).map((c) => c[lang]), links: [adviceLink] }
      break
    }
    case 'contacts': {
      const { contacts } = await getSafety()
      reply = { intent, text: tr('bot.contacts'), items: contacts.map((c) => `${c.name[lang]}: ${c.phone ?? c.url}`), links: [adviceLink] }
      break
    }
    case 'depth':
      reply = { intent, text: tr('bot.depth'), links: [{ to: '/report', label: tr('chip.report') }] }
      break
    case 'thanks':
      reply = { intent, text: tr('bot.thanks') }
      break
    case 'greeting':
      reply = { intent, text: tr('bot.greeting') }
      break
    default:
      reply = { intent: 'fallback', text: tr('bot.fallback') }
  }
  return respond(reply, 0)
}
