// Titis' per-zone briefing on the Advice page. The alert level is computed here from sensors,
// reports and closures, never by the model. The LLM only words the steps from the same facts,
// and a rule-based set of steps stands in whenever the LLM is unavailable.
import { translate, type TKey } from '../i18n'
import { distanceKm } from '../lib/geo'
import { rankCells } from '../lib/scoring'
import { useOps } from '../store/ops'
import type { Lang } from '../store/settings'
import { CELL_GEOMETRY } from './cells'
import { getReports } from './reports'
import { getSafety } from './safety'
import { getWeather, HEAVY_RAIN_3H_MM, weatherLabel } from './weather'

export type GuideLevel = 'act' | 'prepare' | 'watch'

export interface ZoneGuide {
  level: GuideLevel
  steps: string[]
  /** True when the steps came from the LLM. */
  ai: boolean
}

export async function getZoneGuide(cellId: string, lang: Lang): Promise<ZoneGuide> {
  const tr = (k: TKey, v?: Record<string, string | number>) => translate(lang, k, v)
  const zone = tr('zone', { id: cellId })
  const [safety, reports] = await Promise.all([getSafety(), getReports()])
  const ranked = rankCells(CELL_GEOMETRY, reports, useOps.getState().storm)
  const rank = ranked.findIndex((r) => r.cell.id === cellId)
  const z = ranked[rank]
  const weather = await getWeather(z.cell.center, AbortSignal.timeout(5000)).catch(() => null)

  const roads = safety.roadClosures.filter((r) => r.cellId === cellId)
  const closed = roads.some((r) => r.severity === 'closed')
  const safe = safety.safePoints
    .map((sp) => ({ sp, km: Math.round(distanceKm(z.cell.center, [sp.lat, sp.lng]) * 10) / 10 }))
    .sort((a, b) => a.km - b.km)[0]
  const heavyRain = !!weather && weather.next3hMm >= HEAVY_RAIN_3H_MM

  const level: GuideLevel =
    z.drainPct >= 85 || (closed && z.trend === 'rising') || z.verifiedCount >= 2
      ? 'act'
      : z.trend === 'rising' || z.drainPct >= 60 || heavyRain || closed || z.reportCount > 0
        ? 'prepare'
        : 'watch'

  // Rule-based steps: always available, and the facts the LLM is held to.
  const fallback = [
    tr(level === 'act' ? 'guide.act' : level === 'prepare' ? 'guide.prepare' : 'guide.watch', { place: safe?.sp.name[lang] ?? '', km: safe?.km ?? '' }),
    tr('guide.drain', { zone, pct: z.drainPct, trend: tr(`trend.${z.trend}` as TKey).toLowerCase() }),
    roads.length ? tr('guide.road', { road: roads[0].name, reason: roads[0].reason[lang] }) : tr('guide.noRoads', { zone }),
    weather ? tr(heavyRain ? 'guide.rainHeavy' : 'guide.rain', { mm: weather.next3hMm }) : '',
  ].filter(Boolean)

  const facts = [
    `ZONE BRIEFING for ${zone}. Alert level (fixed by the app, do not change it): ${level.toUpperCase()}.`,
    `Priority rank ${rank + 1} of ${ranked.length} zones. Drain ${z.drainPct}% of capacity, ${z.trend}. Rain now ${z.rainfall[z.rainfall.length - 1]} mm/h.`,
    `Reports in zone: ${z.reportCount} (${z.verifiedCount} verified). People living here: about ${z.cell.population}.`,
    roads.length ? 'Roads in this zone: ' + roads.map((r) => `${r.name} (${r.severity}): ${r.reason[lang]}`).join('; ') : 'No road closures in this zone.',
    safe ? `Nearest safe point: ${safe.sp.name[lang]}, ${safe.km} km from the zone centre. ${safe.sp.note[lang]}` : '',
    weather ? `Weather at the zone: ${weatherLabel(weather.code, lang)}, next 3 hours ${weather.next3hMm} mm.` : '',
    'Go-bag checklist: ' + safety.checklist.map((c) => c[lang]).join(', '),
  ].filter(Boolean)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lang,
        context: facts.join('\n'),
        history: [
          {
            role: 'user',
            content: `Brief residents of ${zone} using only the ZONE BRIEFING. Write exactly 3 short steps in order of urgency, one per line, no numbering or bullets. Match the alert level: ACT means leave or move up now, PREPARE means pack and get ready, WATCH means stay alert. Name the safe point and any road to avoid, and mention what to bring if the level is not WATCH.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`chat ${res.status}`)
    const { text } = (await res.json()) as { text: string }
    const steps = text
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 4)
    if (steps.length < 2) throw new Error('short reply')
    return { level, steps, ai: true }
  } catch {
    return { level, steps: fallback, ai: false }
  }
}
