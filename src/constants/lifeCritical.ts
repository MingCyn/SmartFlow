// Life-critical safety lines. Hard-coded and frozen on purpose: the mock AI layer
// (src/services/ai.ts) and the mock data never feed into these, and no prop can
// override them. Change them only after review with the authorities.
import type { Localized } from '../types'

interface CriticalLine extends Localized {
  id: 'leave-early' | 'moving-water' | 'call-999'
  tel?: string
}

export const LIFE_CRITICAL: readonly Readonly<CriticalLine>[] = Object.freeze([
  Object.freeze({
    id: 'leave-early',
    en: 'Leave early. Do not wait for water to reach your home.',
    ms: 'Keluar awal. Jangan tunggu air sampai ke rumah anda.',
  }),
  Object.freeze({
    id: 'moving-water',
    en: 'Do not walk or drive through moving water.',
    ms: 'Jangan berjalan atau memandu melalui air yang mengalir.',
  }),
  Object.freeze({
    id: 'call-999',
    en: 'In danger? Call 999 now.',
    ms: 'Dalam bahaya? Hubungi 999 sekarang.',
    tel: '999',
  }),
] as const)

export const ADVISORY_BANNER: Readonly<Localized> = Object.freeze({
  en: 'Advisory only. Follow official instructions from JPS, NADMA and Bomba.',
  ms: 'Nasihat sahaja. Ikut arahan rasmi daripada JPS, NADMA dan Bomba.',
})
