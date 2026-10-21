import cellsJson from '../mocks/cells.json'
import type { Cell } from '../types'
import { respond } from './client'

const CELLS = cellsJson as Cell[]

export function getCells(): Promise<Cell[]> {
  return respond(CELLS)
}

/** Synchronous access for code that only needs geometry (map defaults, cell lookup). */
export const TOWNSHIP_CENTER: [number, number] = [
  CELLS.reduce((s, c) => s + c.center[0], 0) / CELLS.length,
  CELLS.reduce((s, c) => s + c.center[1], 0) / CELLS.length,
]
export const CELL_GEOMETRY = CELLS
