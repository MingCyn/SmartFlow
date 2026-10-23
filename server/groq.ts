// Server-side Groq calls. Runs in Node (Vite dev/preview middleware), never in the
// browser, so GROQ_API_KEY stays off the client.
import type { IncomingMessage, ServerResponse } from 'node:http'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const CHAT_MODEL = 'openai/gpt-oss-120b'
const VISION_MODEL = 'qwen/qwen3.8-27b'
const MAX_BODY = 6 * 1024 * 1024

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

async function groq(key: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { choices: { message: { content: string | null } }[] }
  // Strip any reasoning block, and em dashes (house style).
  return (json.choices[0]?.message.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\s*—\s*/g, ', ').trim()
}

export async function chat(key: string, input: { lang: 'en' | 'ms'; context: string; history: ChatTurn[] }): Promise<string> {
  const language = input.lang === 'ms' ? 'Bahasa Malaysia' : 'English'
  const system = [
    'You are Titis, the friendly assistant in SmartFlow, a flood early-warning app for township residents.',
    `Always reply in ${language}. Keep replies short: 1 to 4 sentences, plain text, no markdown, no em dashes.`,
    'Only state roads, safe points, contacts, flooded areas and report details that appear in the CONTEXT below. Never invent phone numbers, places or flood levels.',
    'When asked which areas are flooded, use the "Flooded areas right now" line, nearest first, and say it is simulated demo data.',
    'If someone is in danger, trapped, injured or in moving water, tell them to call 999 now and move to higher ground.',
    'For anything outside floods, weather, safety or using the app, politely steer back.',
    'App pages: Report (round camera button) to send a flood photo, Advice for roads and safe points, My reports for status, Chat for you.',
    '',
    'CONTEXT:',
    input.context.slice(0, 6000),
  ].join('\n')
  return groq(key, {
    model: CHAT_MODEL,
    reasoning_effort: 'low',
    max_completion_tokens: 600,
    temperature: 0.4,
    messages: [{ role: 'system', content: system }, ...input.history.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))],
  })
}

export interface PhotoAssessment {
  /** null when no flood water is visible. */
  depth: 'ankle' | 'knee' | 'car-door' | null
  confidence: number
  summary: string
}

export async function assessPhoto(key: string, input: { image: string; lang: 'en' | 'ms' }): Promise<PhotoAssessment> {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(input.image)) throw new Error('Bad image')
  const language = input.lang === 'ms' ? 'Bahasa Malaysia' : 'English'
  const prompt = [
    'You estimate flood water depth from a photo for a flood reporting app.',
    'Use reference objects (kerbs, car wheels, doors, people, walls) to judge depth.',
    'Categories: "none" (no standing flood water), "ankle" (up to about 15 cm), "knee" (about 15 to 60 cm), "car-door" (above about 60 cm).',
    `Reply with ONLY a JSON object: {"depth": "none"|"ankle"|"knee"|"car-door", "confidence": 0 to 1, "summary": "one short sentence in ${language} describing what you see, no em dashes"}`,
  ].join('\n')
  const raw = await groq(key, {
    model: VISION_MODEL,
    max_completion_tokens: 400,
    temperature: 0.1,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: input.image } }] }],
  })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in model reply')
  const parsed = JSON.parse(match[0]) as { depth?: string; confidence?: number; summary?: string }
  const depth = parsed.depth === 'ankle' || parsed.depth === 'knee' || parsed.depth === 'car-door' ? parsed.depth : null
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5))
  return { depth, confidence: Math.round(confidence * 100) / 100, summary: String(parsed.summary ?? '').slice(0, 300) }
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('Body too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Connect-style middleware for /api/chat and /api/flood-photo. */
export function groqMiddleware(key: string | undefined) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const route = req.url?.split('?')[0]
    if (route !== '/api/chat' && route !== '/api/flood-photo') return next()
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
    if (!key) return send(res, 503, { error: 'GROQ_API_KEY is not set' })
    try {
      const body = (await readJson(req)) as Record<string, unknown>
      const lang = body.lang === 'ms' ? 'ms' : 'en'
      if (route === '/api/chat') {
        const history = Array.isArray(body.history) ? (body.history as ChatTurn[]).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : []
        if (!history.length) return send(res, 400, { error: 'Empty history' })
        const text = await chat(key, { lang, context: String(body.context ?? ''), history })
        return send(res, 200, { text })
      }
      return send(res, 200, await assessPhoto(key, { image: String(body.image ?? ''), lang }))
    } catch (e) {
      console.error('[groq]', e)
      return send(res, 502, { error: 'AI request failed' })
    }
  }
}
