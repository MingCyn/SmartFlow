// Mock AI layer. Deterministic stand-ins for a photo model and an advice model.
// Nothing here can change the life-critical lines in src/constants/lifeCritical.ts.
import type { Lang } from '../store/settings'
import type { Depth } from '../types'
import { respond } from './client'

export interface DepthSuggestion {
  depth: Depth
  confidence: number
}

/** Pretends to read water depth from a photo. Uses file size so results are stable per photo. */
export function suggestDepth(photo: File): Promise<DepthSuggestion> {
  const bucket = photo.size % 3
  const depth: Depth = bucket === 0 ? 'ankle' : bucket === 1 ? 'knee' : 'car-door'
  const confidence = 0.62 + ((photo.size % 30) / 100)
  return respond({ depth, confidence: Math.round(confidence * 100) / 100 }, 700)
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
