export const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))

export const clockTime = (d: Date, lang: string) =>
  d.toLocaleTimeString(lang === 'ms' ? 'ms-MY' : 'en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
