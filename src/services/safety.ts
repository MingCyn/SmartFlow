import safetyJson from '../mocks/safety.json'
import type { SafetyData } from '../types'
import { respond } from './client'

export function getSafety(): Promise<SafetyData> {
  return respond(safetyJson as SafetyData)
}
