// Evacuation planner for the chatbot: pins the user, picks the nearest safe high place,
// and chooses the safest walking route to it.
// Elevation: Open-Meteo (90 m terrain model). Routing: FOSSGIS OSRM foot profile on OpenStreetMap.
// Both are free, keyless and called straight from the browser.
import { distanceKm } from '../lib/geo'
import type { Lang } from '../store/settings'
import { useGeo } from '../store/location'
import type { LatLng, SafetyData } from '../types'
import { CELL_GEOMETRY, TOWNSHIP_CENTER } from './cells'
import { ipPlace, placeLabel, reverseGeocode } from './place'

export interface EvacPlan {
  origin: LatLng
  /** True when the start point is from IP or the township, not GPS. */
  originApprox: boolean
  originLabel: string
  originElevM: number | null
  dest: {
    point: LatLng
    name: string
    kind: 'shelter' | 'high'
    elevM: number | null
    note?: string
  }
  /** Metres the destination sits above the start. */
  gainM: number | null
  path: LatLng[]
  distanceKm: number
  walkMin: number
  /** Lowest ground anywhere on the chosen route. */
  lowestM: number | null
  /** How many route options were compared. */
  options: number
  /** True when only nearby ground is flat, so going up a solid building is the better advice. */
  flat: boolean
  /** False when routing failed and the path is a straight line. */
  routed: boolean
  mapsUrl: string
}

const ELEV_URL = 'https://api.open-meteo.com/v1/elevation'
const ROUTE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
/** Search rings around the user for higher ground, in km. */
const RINGS_KM = [0.3, 0.6, 1, 1.5, 2.2]
const BEARINGS = 12
/** Shelters further than this are not offered on foot. */
const SHELTER_MAX_KM = 6
/** Gain worth walking for. Below this, nearby ground counts as flat. */
const MIN_GAIN_M = 4
const WALK_KMH = 4.5

async function elevations(points: LatLng[], signal?: AbortSignal): Promise<(number | null)[]> {
  if (!points.length) return []
  const params = new URLSearchParams({
    latitude: points.map((p) => p[0].toFixed(5)).join(','),
    longitude: points.map((p) => p[1].toFixed(5)).join(','),
  })
  const res = await fetch(`${ELEV_URL}?${params}`, { signal })
  if (!res.ok) throw new Error(`Elevation ${res.status}`)
  const { elevation } = (await res.json()) as { elevation: number[] }
  return points.map((_, i) => (Number.isFinite(elevation[i]) ? elevation[i] : null))
}

/** Point `km` away from `from` on compass `bearing` (degrees). Flat-earth is fine at this scale. */
function offset([lat, lng]: LatLng, km: number, bearing: number): LatLng {
  const rad = (bearing * Math.PI) / 180
  return [lat + (km / 111.32) * Math.cos(rad), lng + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad)]
}

interface Route {
  path: LatLng[]
  distanceKm: number
}

async function routes(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route[]> {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`
  const res = await fetch(`${ROUTE_URL}/${coords}?overview=full&geometries=geojson&alternatives=true`, { signal })
  if (!res.ok) throw new Error(`Route ${res.status}`)
  const j = (await res.json()) as { code: string; routes?: { distance: number; geometry: { coordinates: [number, number][] } }[] }
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error(`Route ${j.code}`)
  return j.routes.slice(0, 3).map((r) => ({ path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng), distanceKm: r.distance / 1000 }))
}

/** Up to n points spread evenly along a path. */
function sample(path: LatLng[], n: number): LatLng[] {
  if (path.length <= n) return path
  return Array.from({ length: n }, (_, i) => path[Math.round((i * (path.length - 1)) / (n - 1))])
}

function inCell(p: LatLng, cellIds: Set<string>): boolean {
  return CELL_GEOMETRY.some((c) => cellIds.has(c.id) && p[0] >= c.bounds[0][0] && p[0] <= c.bounds[1][0] && p[1] >= c.bounds[0][1] && p[1] <= c.bounds[1][1])
}

/** GPS if we have it, a fresh one-off fix if the browser allows, then IP, then the township. */
async function locate(lang: Lang): Promise<{ point: LatLng; approx: boolean; label: string }> {
  let point = useGeo.getState().position
  if (!point && 'geolocation' in navigator) {
    point = await new Promise<LatLng | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve([coords.latitude, coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
      ),
    )
  }
  if (point) {
    const place = await reverseGeocode(point, lang, AbortSignal.timeout(5000)).catch(() => null)
    return { point, approx: false, label: place ? placeLabel(place) : '' }
  }
  const ip = await ipPlace(lang, AbortSignal.timeout(5000)).catch(() => null)
  if (ip) return { point: ip.point, approx: true, label: placeLabel(ip) }
  return { point: TOWNSHIP_CENTER, approx: true, label: '' }
}

export async function planEvacuation(safety: SafetyData, lang: Lang): Promise<EvacPlan> {
  const signal = AbortSignal.timeout(15_000)
  const start = await locate(lang)
  const origin = start.point

  // 1. Terrain around the user, plus every official shelter in walking range, in one call.
  const shelters = safety.safePoints.filter((s) => distanceKm(origin, [s.lat, s.lng]) <= SHELTER_MAX_KM)
  const ring = RINGS_KM.flatMap((km) => Array.from({ length: BEARINGS }, (_, i) => offset(origin, km, (360 / BEARINGS) * i)))
  const probe: LatLng[] = [origin, ...shelters.map((s) => [s.lat, s.lng] as LatLng), ...ring]
  const elev = await elevations(probe, signal).catch(() => probe.map(() => null))
  const originElev = elev[0]
  const shelterElev = elev.slice(1, 1 + shelters.length)
  const ringElev = elev.slice(1 + shelters.length)

  // 2. Destination. An official shelter wins if it is not lower than where the user stands.
  let dest: EvacPlan['dest'] | null = null
  const okShelters = shelters
    .map((s, i) => ({ s, e: shelterElev[i], d: distanceKm(origin, [s.lat, s.lng]) }))
    .filter(({ e }) => originElev === null || e === null || e >= originElev - 1)
    .sort((a, b) => a.d - b.d)
  if (okShelters.length) {
    const { s, e } = okShelters[0]
    dest = { point: [s.lat, s.lng], name: s.name[lang], kind: 'shelter', elevM: e, note: s.note[lang] }
  }

  let flat = false
  if (!dest) {
    // Best height gained per km walked, among points worth the walk.
    const scored = ring
      .map((p, i) => ({ p, e: ringElev[i], d: distanceKm(origin, p) }))
      .filter((c): c is { p: LatLng; e: number; d: number } => c.e !== null)
      .map((c) => ({ ...c, gain: originElev === null ? 0 : c.e - originElev }))
    // Height past 15 m buys little in a flood, so a closer, lower hill beats a far mountain.
    const value = (c: { gain: number; d: number }) => Math.min(c.gain, 15) / (c.d + 0.3)
    const worth = scored.filter((c) => c.gain >= MIN_GAIN_M).sort((a, b) => value(b) - value(a))
    const pick = worth[0] ?? scored.sort((a, b) => b.e - a.e || a.d - b.d)[0]
    flat = !worth.length
    const point = pick?.p ?? offset(origin, 0.3, 0)
    const place = await reverseGeocode(point, lang, AbortSignal.timeout(4000)).catch(() => null)
    dest = { point, name: place ? placeLabel(place) : '', kind: 'high', elevM: pick?.e ?? null }
  }

  // 3. Route options, scored on their lowest ground and on passing closed-road zones.
  const closedZones = new Set(safety.roadClosures.filter((r) => r.severity === 'closed').map((r) => r.cellId))
  let options: Route[] = []
  try {
    options = await routes(origin, dest.point, signal)
  } catch {
    // Routing down or unreachable: fall back to a straight line below.
  }

  let path: LatLng[] = [origin, dest.point]
  let dist = distanceKm(origin, dest.point)
  let lowest: number | null = null
  if (options.length) {
    const per = Math.floor(90 / options.length)
    const samples = options.map((r) => sample(r.path, per))
    const flatElev = await elevations(samples.flat(), signal).catch(() => samples.flat().map(() => null))
    let at = 0
    const ranked = options.map((r, i) => {
      const e = flatElev.slice(at, (at += samples[i].length)).filter((x): x is number => x !== null)
      const low = e.length ? Math.min(...e) : null
      const closedHits = samples[i].filter((p) => inCell(p, closedZones)).length
      // Higher low point is safer; each sample in a closed zone costs 5 m; each km costs 0.5 m.
      const score = (low ?? 0) - closedHits * 5 - r.distanceKm * 0.5
      return { r, low, score }
    })
    ranked.sort((a, b) => b.score - a.score)
    path = ranked[0].r.path
    dist = ranked[0].r.distanceKm
    lowest = ranked[0].low
  }

  const [o, d] = [origin, dest.point].map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`)
  return {
    origin,
    originApprox: start.approx,
    originLabel: start.label,
    originElevM: originElev,
    dest,
    gainM: originElev !== null && dest.elevM !== null ? Math.round(dest.elevM - originElev) : null,
    path,
    distanceKm: Math.round(dist * 10) / 10,
    walkMin: Math.max(1, Math.round((dist / WALK_KMH) * 60)),
    lowestM: lowest === null ? null : Math.round(lowest),
    options: options.length,
    flat,
    routed: options.length > 0,
    mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=walking`,
  }
}

/** Plain facts for the LLM context. */
export function planFacts(p: EvacPlan): string {
  return [
    `EVACUATION PLAN (computed by the app, a map with the route is shown under your reply):`,
    `Start: ${p.originLabel || 'user position'}${p.originApprox ? ' (approximate, GPS is off)' : ' (GPS)'}, ground ${p.originElevM ?? 'unknown'} m.`,
    `Destination: ${p.dest.kind === 'shelter' ? 'official safe point' : 'nearest higher ground'} ${p.dest.name || ''}, ground ${p.dest.elevM ?? 'unknown'} m, ${p.gainM ?? 'unknown'} m above start.${p.dest.note ? ' ' + p.dest.note : ''}`,
    `Route: ${p.distanceKm} km on foot, about ${p.walkMin} min${p.routed ? `, safest of ${p.options} options (highest low point on the way, steers clear of zones with closed roads; no live flood data for roads outside the township), lowest ground on the way ${p.lowestM ?? 'unknown'} m` : ', straight line only, routing unavailable'}.`,
    p.flat ? 'Nearby ground is flat: if water is already rising, an upper floor of a solid building is safer than a long walk.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}
