export type ReportStatus = 'submitted' | 'unverified' | 'likely' | 'verified'
export type Depth = 'ankle' | 'knee' | 'car-door'
export type DispatchStatus = 'unassigned' | 'assigned' | 'on-site' | 'cleared'
export type Trend = 'rising' | 'steady' | 'falling'
export type LatLng = [number, number]

export interface Localized {
  en: string
  ms: string
}

export interface Report {
  id: string
  cellId: string
  lat: number
  lng: number
  createdAt: string
  status: ReportStatus
  depth: Depth
  note: string
  reporter: string
}

export interface NewReport {
  lat: number
  lng: number
  depth: Depth
  note: string
  hasPhoto: boolean
  locationSource: 'gps' | 'map'
}

export interface Cell {
  id: string
  name: string
  bounds: [LatLng, LatLng]
  center: LatLng
  population: number
  drainCapacityCm: number
  /** How strongly the cell responds to storm intensity (low-lying cells are higher). */
  sensitivity: number
  readingIntervalMin: number
  rainfallMmH: number[]
  drainLevelCm: number[]
}

export interface RankedCell {
  cell: Cell
  rainfall: number[]
  drain: number[]
  reportCount: number
  verifiedCount: number
  trend: Trend
  drainPct: number
  score: number
}

export interface RoadClosure {
  id: string
  name: string
  cellId: string
  severity: 'closed' | 'avoid'
  reason: Localized
}

export interface SafePoint {
  id: string
  name: Localized
  cellId: string
  lat: number
  lng: number
  note: Localized
}

export interface Contact {
  id: string
  name: Localized
  phone?: string
  url?: string
}

export interface ChecklistItem extends Localized {
  id: string
}

export interface SafetyData {
  roadClosures: RoadClosure[]
  safePoints: SafePoint[]
  contacts: Contact[]
  checklist: ChecklistItem[]
}
