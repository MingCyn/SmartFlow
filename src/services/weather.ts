// Live weather from Open-Meteo (free, no key). Called straight from the browser.
import type { Lang } from '../store/settings'
import type { LatLng } from '../types'

export interface HourForecast {
  time: string
  precipMm: number
  chancePct: number
  code: number
}

export interface Weather {
  tempC: number
  feelsC: number
  precipMm: number
  windKmh: number
  code: number
  isDay: boolean
  next: HourForecast[]
  /** Total rain expected over the next 3 hours. */
  next3hMm: number
  fetchedAt: number
}

export async function getWeather([lat, lng]: LatLng, signal?: AbortSignal): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lng.toFixed(3),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    hourly: 'precipitation,precipitation_probability,weather_code',
    forecast_hours: '6',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error(`Weather ${res.status}`)
  const j = await res.json()
  const next: HourForecast[] = (j.hourly.time as string[]).map((time, i) => ({
    time,
    precipMm: j.hourly.precipitation[i] ?? 0,
    chancePct: j.hourly.precipitation_probability[i] ?? 0,
    code: j.hourly.weather_code[i] ?? 0,
  }))
  return {
    tempC: j.current.temperature_2m,
    feelsC: j.current.apparent_temperature,
    precipMm: j.current.precipitation,
    windKmh: j.current.wind_speed_10m,
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
    next,
    next3hMm: Math.round(next.slice(0, 3).reduce((s, h) => s + h.precipMm, 0) * 10) / 10,
    fetchedAt: Date.now(),
  }
}

/** Rain over 3 hours above which low-lying areas can flash flood. Rough guide, tune with local data. */
export const HEAVY_RAIN_3H_MM = 20

type Kind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavy' | 'storm'

export function weatherKind(code: number): Kind {
  if (code <= 1) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code === 65 || code === 82 || code === 67) return 'heavy'
  if (code <= 82) return 'rain'
  return 'storm'
}

const LABELS: Record<Kind, Record<Lang, string>> = {
  clear: { en: 'Clear', ms: 'Cerah' },
  cloudy: { en: 'Cloudy', ms: 'Berawan' },
  fog: { en: 'Fog', ms: 'Berkabus' },
  drizzle: { en: 'Drizzle', ms: 'Gerimis' },
  rain: { en: 'Rain', ms: 'Hujan' },
  heavy: { en: 'Heavy rain', ms: 'Hujan lebat' },
  storm: { en: 'Thunderstorm', ms: 'Ribut petir' },
}

export const weatherLabel = (code: number, lang: Lang) => LABELS[weatherKind(code)][lang]
