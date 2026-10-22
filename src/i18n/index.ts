import { useCallback } from 'react'
import { useSettings, type Lang } from '../store/settings'
import { en, ms, type TKey } from './translations'

const dictionaries = { en, ms }

export type { TKey }

/** Non-hook translation, for services. Vars replace {name} placeholders. */
export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let text: string = dictionaries[lang][key] ?? en[key]
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

/** Returns t(key, vars) bound to the current language. */
export function useT() {
  const lang = useSettings((s) => s.lang)
  return useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])
}

// Add these to your cell/zone interface if not already present
export interface WaterSupplyStatus {
  tankLevelPct: number;          // e.g., 75 (%)
  supplyStatus: 'normal' | 'buffer-active' | 'interrupted';
  backupHoursRemaining: number;  // e.g., 18.5 hours
  treatmentPlantStatus: 'operational' | 'silt-shutdown' | 'maintenance';
}