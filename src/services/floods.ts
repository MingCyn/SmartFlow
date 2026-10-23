// Simulated flooded areas. Two sources, both clearly demo data:
// - township zones, levelled from the live zone ranking (reports, drain and rain, storm simulator);
// - a few fake spots placed around the user's GPS position (or the township centre),
//   plus any the operator adds with "Add a flood near me".
// The map, the in-app alerts and Titis all read this one feed, so they always agree.
import { distanceKm } from '../lib/geo'
import { rankCells } from '../lib/scoring'
import { useGeo } from '../store/location'
import { useOps } from '../store/ops'
import type { Depth, LatLng, Localized } from '../types'
import { CELL_GEOMETRY, TOWNSHIP_CENTER } from './cells'
import { getReports } from './reports'

export type FloodLevel = 'watch' | 'flooded' | 'severe'

export interface FloodArea {
  id: string
  name: Localized
  lat: number
  lng: number
  radiusM: number
  level: FloodLevel
  /** True for the fake spots placed around the user. */
  nearby: boolean
  /** Distance from the user (or township centre) in km. */
  km: number
}

export const LEVEL_RANK: Record<FloodLevel | 'none', number> = { none: 0, watch: 1, flooded: 2, severe: 3 }

/** Rough depth to show for each level. Watch means water is rising, not standing yet. */
export const LEVEL_DEPTH: Record<FloodLevel, Depth | null> = { watch: null, flooded: 'knee', severe: 'car-door' }

/** Zone score thresholds, tuned so the demo opens with B2 severe, A2 flooded and B3 on watch. */
function zoneLevel(score: number): FloodLevel | null {
  if (score >= 80) return 'severe'
  if (score >= 60) return 'flooded'
  if (score >= 40) return 'watch'
  return null
}

interface NearbySpot {
  id: string
  name: Localized
  northM: number
  eastM: number
  radiusM: number
  level: (storm: number) => FloodLevel | null
}

// Fictional places. At the default storm (50) the underpass and riverside path are flooded;
// a stronger storm makes the underpass severe and floods the car park.
const NEARBY: NearbySpot[] = [
  {
    id: 'N1',
    name: { en: 'Underpass near you', ms: 'Laluan bawah berhampiran anda' },
    northM: 250,
    eastM: 180,
    radiusM: 120,
    level: (s) => (s >= 70 ? 'severe' : s >= 20 ? 'flooded' : 'watch'),
  },
  {
    id: 'N2',
    name: { en: 'Riverside path', ms: 'Laluan tepi sungai' },
    northM: -420,
    eastM: -300,
    radiusM: 180,
    level: (s) => (s >= 85 ? 'severe' : s >= 45 ? 'flooded' : 'watch'),
  },
  {
    id: 'N3',
    name: { en: 'Market car park', ms: 'Tempat letak kereta pasar' },
    northM: 150,
    eastM: -650,
    radiusM: 140,
    level: (s) => (s >= 65 ? 'flooded' : s >= 35 ? 'watch' : null),
  },
]

/** Moves a point by metres. Good enough at township scale. */
function offset([lat, lng]: LatLng, northM: number, eastM: number): LatLng {
  return [lat + northM / 111_320, lng + eastM / (111_320 * Math.cos((lat * Math.PI) / 180))]
}

/** The user's position, rounded to about 100 m so GPS jitter does not move the fake spots. */
export function floodAnchor(): { point: LatLng; isUser: boolean } {
  const pos = useGeo.getState().position
  if (!pos) return { point: TOWNSHIP_CENTER, isUser: false }
  return { point: [Math.round(pos[0] * 1000) / 1000, Math.round(pos[1] * 1000) / 1000], isUser: true }
}

/** Current flooded areas, nearest first. */
export async function getFloodAreas(): Promise<FloodArea[]> {
  const { storm, extraFloods } = useOps.getState()
  const { point } = floodAnchor()
  const reports = await getReports()
  const areas: Omit<FloodArea, 'km'>[] = []

  for (const rc of rankCells(CELL_GEOMETRY, reports, storm)) {
    const level = zoneLevel(rc.score)
    if (!level) continue
    const [lat, lng] = rc.cell.center
    areas.push({ id: rc.cell.id, name: { en: `Zone ${rc.cell.id}`, ms: `Zon ${rc.cell.id}` }, lat, lng, radiusM: 450, level, nearby: false })
  }

  for (const spot of NEARBY) {
    const level = spot.level(storm)
    if (!level) continue
    const [lat, lng] = offset(point, spot.northM, spot.eastM)
    areas.push({ id: spot.id, name: spot.name, lat, lng, radiusM: spot.radiusM, level, nearby: true })
  }

  extraFloods.forEach((x, i) => {
    const [lat, lng] = offset(point, x.northM, x.eastM)
    const n = i + 1
    areas.push({ id: x.id, name: { en: `Reported flood ${n} near you`, ms: `Banjir dilaporkan ${n} berhampiran anda` }, lat, lng, radiusM: 150, level: 'flooded', nearby: true })
  })

  return areas
    .map((a) => ({ ...a, km: Math.round(distanceKm(point, [a.lat, a.lng]) * 10) / 10 }))
    .sort((a, b) => a.km - b.km)
}
