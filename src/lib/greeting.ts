import type { TKey } from '../i18n'

const LAST_VISIT_KEY = 'smartflow-last-visit'

// Read once per app load, so the greeting does not flip to "welcome back" mid-session.
const previousVisit: number | null = (() => {
  try {
    const prev = Number(localStorage.getItem(LAST_VISIT_KEY)) || null
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
    return prev
  } catch {
    return null
  }
})()

export const isReturning = previousVisit !== null

export function timeGreeting(date = new Date()): TKey {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'greet.morning'
  if (h >= 12 && h < 15) return 'greet.midday'
  if (h >= 15 && h < 19) return 'greet.afternoon'
  return 'greet.evening'
}
