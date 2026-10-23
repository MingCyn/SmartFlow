import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudRainWind, LoaderCircle, Sun, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import { HEAVY_RAIN_3H_MM, weatherKind, weatherLabel } from '../services/weather'
import { useWeather } from '../store/weather'
import { useSettings } from '../store/settings'

const ICONS: Record<ReturnType<typeof weatherKind>, LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy: CloudRainWind,
  storm: CloudLightning,
}

export function WeatherCard({ className = '' }: { className?: string }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const { weather, local: here, error } = useWeather()

  const time = (iso: string | number) => new Date(iso).toLocaleTimeString(lang === 'ms' ? 'ms-MY' : 'en-MY', { hour: 'numeric', minute: '2-digit' })
  const Icon = weather ? ICONS[weatherKind(weather.code)] : Cloud
  const heavy = weather && weather.next3hMm >= HEAVY_RAIN_3H_MM

  return (
    <section aria-labelledby="weather-h" className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="weather-h" className="text-lg font-semibold">
          {t('weather.title')}
        </h2>
        <p className="text-sm text-slate-600">{here ? t('weather.here') : t('weather.township')}</p>
      </div>

      {!weather && !error && (
        <p className="mt-2 flex items-center gap-2 text-slate-700">
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
          {t('common.loading')}
        </p>
      )}
      {!weather && error && <p className="mt-2 text-slate-700">{t('weather.error')}</p>}

      {weather && (
        <>
          {heavy && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 font-semibold text-amber-950">
              <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
              {t('weather.heavy', { mm: weather.next3hMm })}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4">
            <Icon aria-hidden className="size-12 shrink-0 text-primary-700" />
            <div>
              <p className="text-3xl font-bold text-slate-900">{Math.round(weather.tempC)}°C</p>
              <p className="font-medium text-slate-800">{weatherLabel(weather.code, lang)}</p>
            </div>
            <ul className="ml-auto text-right text-sm text-slate-700">
              <li>{t('weather.feels', { t: Math.round(weather.feelsC) })}</li>
              <li>{t('weather.rainNow', { mm: weather.precipMm })}</li>
              <li>{t('weather.wind', { kmh: Math.round(weather.windKmh) })}</li>
            </ul>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-700">{t('weather.next')}</h3>
          <ol className="mt-1 grid grid-cols-6 gap-1 text-center text-xs">
            {weather.next.map((h) => {
              const HIcon = ICONS[weatherKind(h.code)]
              return (
                <li key={h.time} className="rounded-lg bg-slate-50 px-0.5 py-1.5">
                  <p className="text-slate-600">{time(h.time)}</p>
                  <HIcon aria-hidden className="mx-auto my-1 size-5 text-primary-700" />
                  <p className="font-semibold text-slate-900">{h.chancePct}%</p>
                  <p className="text-slate-600">{h.precipMm} mm</p>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs text-slate-600">
            {t('weather.updated', { time: time(weather.fetchedAt) })}. {t('weather.source')}
          </p>
        </>
      )}
    </section>
  )
}
