import type { Cell, RankedCell, Report, ReportStatus, Trend } from '../types'

/** Storm slider value where the simulated readings equal the mock baseline. */
export const BASELINE_STORM = 50

const STATUS_WEIGHT: Record<ReportStatus, number> = {
  verified: 1,
  likely: 0.7,
  unverified: 0.4,
  submitted: 0.3,
}

/**
 * Applies the demo storm intensity (0 to 100) to a cell's sensor series.
 * The effect ramps up over the series so trends steepen, and low-lying
 * cells (higher sensitivity) respond more, which is what re-ranks the list.
 */
export function simulateCell(cell: Cell, storm: number): { rainfall: number[]; drain: number[] } {
  const factor = 0.2 + (1.6 * storm) / 100 // 0.2 to 1.8, 1.0 at baseline
  const n = cell.rainfallMmH.length
  const rainfall = cell.rainfallMmH.map((v, i) => {
    const ramp = 1 + (factor - 1) * ((i + 1) / n)
    return round1(Math.max(0, v * ramp))
  })
  const drain = cell.drainLevelCm.map((v, i) => {
    const delta = (factor - 1) * cell.sensitivity * cell.drainCapacityCm * 0.6 * ((i + 1) / n)
    return Math.round(clamp(v + delta, 0, cell.drainCapacityCm * 1.2))
  })
  return { rainfall, drain }
}

export function trendOf(series: number[]): Trend {
  if (series.length < 2) return 'steady'
  const last = series[series.length - 1]
  const prev = series[Math.max(0, series.length - 3)]
  const change = (last - prev) / Math.max(1, prev)
  if (change > 0.05) return 'rising'
  if (change < -0.05) return 'falling'
  return 'steady'
}

/**
 * Score 0 to 100. Reports 35%, sensors 50%, people affected 15%, plus an
 * escalation of up to 30 points as a drain passes 90% of capacity, so a
 * low-lying cell with no reports yet can still rise to the top in a storm.
 */
export function rankCells(cells: Cell[], reports: Report[], storm: number): RankedCell[] {
  return cells
    .map((cell) => {
      const { rainfall, drain } = simulateCell(cell, storm)
      const inCell = reports.filter((r) => r.cellId === cell.id)
      const weighted = inCell.reduce((sum, r) => sum + STATUS_WEIGHT[r.status], 0)
      const reportScore = Math.min(1, weighted / 10)

      const rainNow = rainfall[rainfall.length - 1]
      const drainRatio = drain[drain.length - 1] / cell.drainCapacityCm
      const drainPct = Math.round(drainRatio * 100)
      const sensorScore = 0.4 * Math.min(1, rainNow / 80) + 0.6 * Math.min(1, drainRatio)
      const overflow = (clamp(drainRatio - 0.9, 0, 0.2) / 0.2) * 0.3
      const popScore = Math.min(1, cell.population / 12000)

      return {
        cell,
        rainfall,
        drain,
        reportCount: inCell.length,
        verifiedCount: inCell.filter((r) => r.status === 'verified').length,
        trend: trendOf(drain),
        drainPct,
        score: Math.round(100 * Math.min(1, 0.35 * reportScore + 0.5 * sensorScore + 0.15 * popScore + overflow)),
      }
    })
    .sort((a, b) => b.score - a.score || b.reportCount - a.reportCount)
}

/** Returns the cell containing the point, or the nearest cell centre. */
export function cellForPoint(cells: Cell[], lat: number, lng: number): Cell {
  const inside = cells.find(
    ({ bounds: [[s, w], [n, e]] }) => lat >= s && lat <= n && lng >= w && lng <= e,
  )
  if (inside) return inside
  return cells.reduce((best, c) =>
    dist2(c.center[0], c.center[1], lat, lng) < dist2(best.center[0], best.center[1], lat, lng) ? c : best,
  )
}

const dist2 = (a: number, b: number, c: number, d: number) => (a - c) ** 2 + (b - d) ** 2
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round1 = (v: number) => Math.round(v * 10) / 10
