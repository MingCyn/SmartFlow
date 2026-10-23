import type { CSSProperties } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudRainWind, MapPin, Moon, Sun, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import { isReturning, timeGreeting } from '../lib/greeting'
import { HEAVY_RAIN_3H_MM, weatherKind, weatherLabel, type Weather } from '../services/weather'
import { useSettings } from '../store/settings'
import { useWeather } from '../store/weather'
import { LocationPrompt } from './LocationPrompt'

type Sky = 'day' | 'cloudy' | 'rain' | 'storm' | 'night' | 'nightRain' | 'dusk'

/** top, bottom, ink. Each ink holds 4.5:1 or better against both gradient stops. */
const SKIES: Record<Sky, [string, string, string]> = {
  day: ['oklch(0.70 0.11 235)', 'oklch(0.90 0.04 225)', 'oklch(0.24 0.06 255)'],
  cloudy: ['oklch(0.74 0.03 240)', 'oklch(0.91 0.012 240)', 'oklch(0.25 0.03 250)'],
  dusk: ['oklch(0.74 0.09 55)', 'oklch(0.84 0.05 290)', 'oklch(0.25 0.06 270)'],
  rain: ['oklch(0.40 0.04 245)', 'oklch(0.50 0.035 240)', 'oklch(0.985 0.005 240)'],
  storm: ['oklch(0.28 0.035 265)', 'oklch(0.40 0.04 255)', 'oklch(0.985 0.005 240)'],
  night: ['oklch(0.24 0.06 268)', 'oklch(0.37 0.07 262)', 'oklch(0.97 0.01 250)'],
  nightRain: ['oklch(0.23 0.02 255)', 'oklch(0.34 0.025 250)', 'oklch(0.97 0.01 250)'],
}

function skyFor(w: Weather | null, hour: number): Sky {
  if (!w) return hour >= 7 && hour < 19 ? 'cloudy' : 'night'
  const kind = weatherKind(w.code)
  const wet = kind === 'drizzle' || kind === 'rain' || kind === 'heavy' || kind === 'storm'
  if (!w.isDay) return wet ? 'nightRain' : 'night'
  if (kind === 'storm' || kind === 'heavy') return 'storm'
  if (wet) return 'rain'
  if (hour === 6 || hour === 7 || hour === 18 || hour === 19) return 'dusk'
  return kind === 'clear' ? 'day' : 'cloudy'
}

const ICONS: Record<ReturnType<typeof weatherKind>, LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  heavy: CloudRainWind,
  storm: CloudLightning,
}

function iconFor(code: number, isDay: boolean): LucideIcon {
  const kind = weatherKind(code)
  if (!isDay && kind === 'clear') return Moon
  if (!isDay && kind === 'cloudy') return CloudMoon
  return ICONS[kind]
}

/** Weather-driven greeting band at the top of resident pages. */
export function SkyHero() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const name = useSettings((s) => s.name.trim())
  const { weather, local, error } = useWeather()

  const now = new Date()
  const sky = skyFor(weather, now.getHours())
  const [top, bottom, ink] = SKIES[sky]
  const kind = weather ? weatherKind(weather.code) : null
  const rainLayer = kind === 'drizzle' ? 'light' : kind === 'rain' || kind === 'heavy' || kind === 'storm' ? 'heavy' : null
  const heavy = !!weather && weather.next3hMm >= HEAVY_RAIN_3H_MM
  const glow = sky === 'day' || sky === 'dusk' || sky === 'night'

  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const clock = (d: string | number) => new Date(d).toLocaleTimeString(locale, { hour: 'numeric' })
  const date = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const welcome = isReturning ? (name ? t('greet.welcomeBackName', { name }) : t('greet.welcomeBack')) : name ? t('greet.welcomeName', { name }) : t('greet.welcome')
  const Icon = weather ? iconFor(weather.code, weather.isDay) : Cloud

  const outlook = !weather
    ? null
    : heavy
      ? t('sky.heavy', { mm: weather.next3hMm })
      : weather.next3hMm >= 1
        ? t('sky.light', { mm: weather.next3hMm })
        : Math.max(...weather.next.slice(0, 3).map((h) => h.chancePct)) >= 50
          ? t('sky.showers')
          : t('sky.dry')

  return (
    <section
      aria-labelledby="sky-greeting"
      className="relative isolate -mx-4 -mt-[5.25rem] mb-6 overflow-hidden px-5 pb-4 pt-[5.25rem] text-(--sky-ink) browser:mx-0 browser:mt-0 browser:pt-6 browser:rounded-3xl browser:px-7 browser:pt-6"
      style={{ '--sky-ink': ink, '--sky-bg': top, backgroundImage: `linear-gradient(180deg, ${top}, ${bottom})` } as CSSProperties}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full"
          style={{
            background:
              sky === 'night'
                ? 'radial-gradient(circle, oklch(0.95 0.02 250 / 0.22), transparent 65%)'
                : 'radial-gradient(circle, oklch(0.98 0.08 90 / 0.55), transparent 65%)',
          }}
        />
      )}
      {rainLayer && <div aria-hidden className={`sky-rain sky-rain--${rainLayer}`} />}

      <p className="text-[0.95rem] font-medium opacity-85">
        {t(timeGreeting(now))} · {date}
      </p>
      <p id="sky-greeting" className="mt-0.5 text-2xl font-bold tracking-tight text-balance">
        {welcome}
      </p>

      <div className="mt-5 flex items-end justify-between gap-4" aria-live="polite">
        {weather ? (
          <div>
            <p className="text-7xl font-semibold leading-none tracking-tighter tabular-nums">
              {Math.round(weather.tempC)}
              <span className="align-top text-4xl font-medium">°</span>
            </p>
            <p className="mt-2 text-lg font-semibold">
              {weatherLabel(weather.code, lang)}
              <span className="font-normal opacity-85"> · {t('weather.feels', { t: Math.round(weather.feelsC) })}</span>
            </p>
          </div>
        ) : error ? (
          <p className="font-medium">{t('weather.error')}</p>
        ) : (
          <div aria-label={t('common.loading')} className="space-y-3">
            <div className="h-16 w-28 animate-pulse rounded-xl bg-(--sky-ink)/12" />
            <div className="h-5 w-44 animate-pulse rounded bg-(--sky-ink)/12" />
          </div>
        )}
        <Icon aria-hidden strokeWidth={1.5} className="size-20 shrink-0 opacity-90" />
      </div>

      {outlook && (
        <p
          className={
            heavy
              ? 'mt-4 flex items-start gap-2 rounded-2xl bg-[oklch(0.94_0.09_88)] px-4 py-3 font-semibold text-[oklch(0.27_0.07_60)]'
              : 'mt-4 text-lg font-medium leading-snug'
          }
          role={heavy ? 'alert' : undefined}
        >
          {heavy && <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />}
          {outlook}
        </p>
      )}

      {weather && (
        <ol aria-label={t('weather.next')} className="mt-4 grid grid-cols-6 border-t border-(--sky-ink)/20 pt-3 text-center">
          {weather.next.map((h, i) => {
            const HIcon = iconFor(h.code, weather.isDay)
            return (
              <li key={h.time} className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium opacity-85">{i === 0 ? t('sky.now') : clock(h.time)}</span>
                <HIcon aria-hidden strokeWidth={1.75} className="size-6" />
                <span className="text-sm font-semibold tabular-nums">
                  {h.chancePct}%<span className="sr-only"> {t('sky.chanceSr')}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-85">
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <MapPin aria-hidden className="size-4" />
          {local ? t('sky.near') : t('sky.township')}
        </span>
        {weather && <span className="whitespace-nowrap">{t('weather.updated', { time: new Date(weather.fetchedAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) })}</span>}
        <span className="whitespace-nowrap">Open-Meteo</span>
      </div>

      <div className="mt-3 empty:hidden">
        <LocationPrompt tone="sky" />
      </div>
    </section>
  )
}
