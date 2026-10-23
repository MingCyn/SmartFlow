// Shared live weather. Every component reads one fetch, keyed by a rounded location.
// Location priority: GPS fix, then the network's IP location, then the township centre.
import { useEffect } from 'react'
import { create } from 'zustand'
import { TOWNSHIP_CENTER } from '../services/cells'
import { ipPlace, reverseGeocode, type Place } from '../services/place'
import { getWeather, type Weather } from '../services/weather'
import type { LatLng } from '../types'
import { useGeo, useLiveLocation } from './location'
import { useSettings } from './settings'

const REFRESH_MS = 5 * 60_000

export type WeatherSource = 'gps' | 'ip' | 'township'

interface WeatherState {
  weather: Weather | null
  key: string | null
  source: WeatherSource
  /** Named place for the reading. Null for the township fallback or when the lookup failed. */
  place: Place | null
  /** IP-based location, looked up once as a fallback while GPS is off. */
  ip: Place | null
  error: boolean
}

const useWeatherStore = create<WeatherState>(() => ({ weather: null, key: null, source: 'township', place: null, ip: null, error: false }))
let inflight: string | null = null
let latest: string | null = null
let ipAsked = false

function askIp() {
  if (ipAsked) return
  ipAsked = true
  ipPlace(useSettings.getState().lang, AbortSignal.timeout(6000))
    .then((ip) => useWeatherStore.setState({ ip }))
    .catch(() => {})
}

async function load(key: string, point: LatLng, source: WeatherSource, exact: LatLng | null) {
  if (inflight === key) return
  inflight = key
  latest = key
  const lang = useSettings.getState().lang
  try {
    const [weather, place] = await Promise.all([
      getWeather(point),
      source === 'gps' && exact
        ? reverseGeocode(exact, lang, AbortSignal.timeout(6000)).catch(() => null)
        : Promise.resolve(source === 'ip' ? useWeatherStore.getState().ip : null),
    ])
    // A newer location won while this was in flight.
    if (latest !== key) return
    useWeatherStore.setState((s) => ({ weather, key, source, place: place ?? (s.source === source ? s.place : null), error: false }))
  } catch {
    if (latest === key) useWeatherStore.setState((s) => ({ error: true, key: s.weather ? s.key : null }))
  } finally {
    if (inflight === key) inflight = null
  }
}

/** Rounds to about 1 km so GPS jitter does not refetch. */
const snap = ([lat, lng]: LatLng): LatLng => [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100]

export function useWeather() {
  const geo = useLiveLocation()
  const ip = useWeatherStore((s) => s.ip)
  const source: WeatherSource = geo.position ? 'gps' : ip ? 'ip' : 'township'
  const point = geo.position ? snap(geo.position) : ip ? snap(ip.point) : TOWNSHIP_CENTER
  const key = `${source}:${point.join(',')}`

  // No GPS yet (still asking, denied or failed): use the IP location meanwhile.
  useEffect(() => {
    if (!geo.position) askIp()
  }, [geo.position])

  useEffect(() => {
    const refresh = (force: boolean) => {
      const s = useWeatherStore.getState()
      const stale = !s.weather || Date.now() - s.weather.fetchedAt > REFRESH_MS
      if (force || s.key !== key || stale) load(key, point, source, useGeo.getState().position)
    }
    refresh(false)
    const id = window.setInterval(() => refresh(true), REFRESH_MS)
    // Coming back to the tab after a while: refresh straight away.
    const onVisible = () => document.visibilityState === 'visible' && refresh(false)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // point and source derive from key.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return useWeatherStore()
}
