// AI layer. Photo depth goes to /api/flood-photo (Groq vision, key held server-side).
// Nothing here can change the life-critical lines in src/constants/lifeCritical.ts.
import type { Lang } from '../store/settings'
import type { Depth } from '../types'
import { respond } from './client'

export interface DepthSuggestion {
  /** null when the model sees no flood water. */
  depth: Depth | null
  confidence: number
  summary: string
}

/** Shrinks the photo to a JPEG data URL so uploads stay small on mobile data. */
async function toDataUrl(photo: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(photo)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** Asks the vision model how deep the flood water in the photo is. Throws on failure. */
export async function suggestDepth(photo: File, lang: Lang): Promise<DepthSuggestion> {
  const image = await toDataUrl(photo)
  const res = await fetch('/api/flood-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, lang }),
  })
  if (!res.ok) throw new Error(`flood-photo ${res.status}`)
  return (await res.json()) as DepthSuggestion
}

/** Extra, non-critical tips for the advice card. */
export function getAdviceTips(context: { cellId: string; rising: boolean }, lang: Lang): Promise<string[]> {
  const tips = {
    en: [
      'Move vehicles to higher ground, such as a multi-storey car park.',
      'Switch off electricity at the main switch if water may enter your home.',
      context.rising ? `Drain levels in Zone ${context.cellId} are rising. Prepare now.` : `Drain levels in Zone ${context.cellId} are steady. Keep checking.`,
    ],
    ms: [
      'Alihkan kenderaan ke kawasan tinggi, seperti tempat letak kereta bertingkat.',
      'Matikan suis utama elektrik jika air mungkin masuk ke rumah.',
      context.rising ? `Paras longkang di Zon ${context.cellId} sedang naik. Bersedia sekarang.` : `Paras longkang di Zon ${context.cellId} stabil. Terus pantau.`,
    ],
  }
  return respond(tips[lang], 400)
}
