// Mock chatbot. Keyword intents over the mock data; no external API.
// Safety-critical replies never contain generated text: they set `critical`
// and the UI renders the frozen lines from src/constants/lifeCritical.ts.
import { translate, type TKey } from '../i18n'
import { STATUS_META } from '../lib/status'
import type { Lang } from '../store/settings'
import { respond } from './client'
import { getMyReports } from './reports'
import { getSafety } from './safety'

export type Intent =
  | 'greeting' | 'danger' | 'report' | 'status' | 'roads' | 'safe'
  | 'bring' | 'contacts' | 'depth' | 'thanks' | 'fallback'

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

export async function askBot(message: string, lang: Lang): Promise<BotReply> {
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
  return respond(reply, 700)
}
