import type { LatLng } from '../types'

/** Great-circle distance in kilometres. */
export function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const r = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}
