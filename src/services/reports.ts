import reportsJson from '../mocks/reports.json'
import { cellForPoint } from '../lib/scoring'
import type { NewReport, Report, ReportStatus } from '../types'
import { CELL_GEOMETRY } from './cells'
import { readLocal, respond, writeLocal } from './client'

/** The demo resident. A real API would take this from the session. */
export const CURRENT_USER = 'Resident A'

const STORAGE_KEY = 'smartflow-submitted-reports'

// Shift mock timestamps so the newest report is two minutes old when the app loads.
const MOCK = reportsJson as Report[]
const newest = Math.max(...MOCK.map((r) => Date.parse(r.createdAt)))
const shift = Date.now() - 2 * 60_000 - newest
const SEEDED: Report[] = MOCK.map((r) => ({
  ...r,
  createdAt: new Date(Date.parse(r.createdAt) + shift).toISOString(),
}))

interface StoredReport extends Report {
  hasPhoto: boolean
  locationSource: NewReport['locationSource']
}

/**
 * Simulated verification pipeline for reports made in this browser:
 * Submitted, then Unverified (queued for checks), then Likely (matches sensors
 * or neighbours), then Verified once enough nearby reports agree.
 */
function progress(r: StoredReport, all: Report[]): ReportStatus {
  const age = (Date.now() - Date.parse(r.createdAt)) / 1000
  if (age < 15) return 'submitted'
  if (age < 40) return 'unverified'
  if (age < 75) return 'likely'
  const corroborating = all.filter((o) => o.cellId === r.cellId && o.id !== r.id && o.status !== 'submitted')
  return corroborating.length >= 3 ? 'verified' : 'likely'
}

function submitted(): Report[] {
  const stored = readLocal<StoredReport[]>(STORAGE_KEY, [])
  return stored.map((r) => ({ ...r, status: progress(r, SEEDED) }))
}

export function getReports(): Promise<Report[]> {
  return respond([...SEEDED, ...submitted()])
}

export function getMyReports(): Promise<Report[]> {
  const mine = [...SEEDED, ...submitted()].filter((r) => r.reporter === CURRENT_USER)
  return respond(mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export async function submitReport(input: NewReport): Promise<Report> {
  const cell = cellForPoint(CELL_GEOMETRY, input.lat, input.lng)
  const report: StoredReport = {
    id: `R-${Date.now().toString(36).slice(-5).toUpperCase()}`,
    cellId: cell.id,
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
    status: 'submitted',
    depth: input.depth,
    note: input.note.trim(),
    reporter: CURRENT_USER,
    hasPhoto: input.hasPhoto,
    locationSource: input.locationSource,
  }
  // Photos stay on the device in this prototype; only metadata is stored.
  writeLocal(STORAGE_KEY, [...readLocal<StoredReport[]>(STORAGE_KEY, []), report])
  return respond(report, 600)
}
