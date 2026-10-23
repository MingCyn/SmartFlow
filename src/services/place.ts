// Place names from BigDataCloud's free client-side reverse geocoder (no key, CORS open).
// With coordinates it names the GPS fix; without, it falls back to the network's IP location.
import type { Lang } from '../store/settings'
import type { LatLng } from '../types'

export interface Place {
  point: LatLng
  /** Neighbourhood or town, e.g. "Bandar Baru Klang". */
  locality: string
  /** City or district, e.g. "Klang". */
  city: string
  /** State, e.g. "Selangor". */
  region: string
  /** True when the point came from the IP address, so it is only roughly right. */
  approximate: boolean
}

const URL_BASE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

async function lookup(params: Record<string, string>, signal?: AbortSignal): Promise<Place> {
  const res = await fetch(`${URL_BASE}?${new URLSearchParams(params)}`, { signal })
  if (!res.ok) throw new Error(`Place ${res.status}`)
  const j = await res.json()
  if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number') throw new Error('Place has no point')
  return {
    point: [j.latitude, j.longitude],
    locality: j.locality ?? '',
    city: j.city ?? '',
    region: j.principalSubdivision ?? '',
    approximate: j.lookupSource !== 'coordinates',
  }
}

export function reverseGeocode([lat, lng]: LatLng, lang: Lang, signal?: AbortSignal): Promise<Place> {
  return lookup({ latitude: lat.toFixed(5), longitude: lng.toFixed(5), localityLanguage: lang }, signal)
}

/** Rough location from the IP address, for when GPS is off or still waiting. */
export function ipPlace(lang: Lang, signal?: AbortSignal): Promise<Place> {
  return lookup({ localityLanguage: lang }, signal)
}

/** "Bandar Baru Klang, Klang" style label. Skips repeats and blanks. */
export function placeLabel(p: Place): string {
  const parts = [p.locality, p.city, p.region].filter((s, i, all) => s && all.indexOf(s) === i)
  return parts.slice(0, 2).join(', ')
}
