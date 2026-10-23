// Shared live weather. Every component reads one fetch, keyed by a rounded location.
import { useEffect } from 'react'
import { create } from 'zustand'
import { TOWNSHIP_CENTER } from '../services/cells'
import { getWeather, type Weather } from '../services/weather'
import { useLiveLocation } from './location'

const REFRESH_MS = 10 * 60_000

interface WeatherState {
  weather: Weather | null
  key: string | null
  /** True when the reading is for the user's GPS position, not the township. */
  local: boolean
  error: boolean
}

const useWeatherStore = create<WeatherState>(() => ({ weather: null, key: null, local: false, error: false }))
let inflight: string | null = null
let latest: string | null = null

async function load(key: string, point: [number, number], local: boolean) {
  if (inflight === key) return
  inflight = key
  latest = key
  try {
    const weather = await getWeather(point)
    // A newer location won while this was in flight.
    if (latest !== key) return
    useWeatherStore.setState({ weather, key, local, error: false })
  } catch {
    if (latest === key) useWeatherStore.setState((s) => ({ error: true, key: s.weather ? s.key : null }))
  } finally {
    if (inflight === key) inflight = null
  }
}

export function useWeather() {
  const geo = useLiveLocation()
  // About 2 km grid, so GPS jitter does not refetch.
  const point: [number, number] = geo.position ? [Math.round(geo.position[0] * 50) / 50, Math.round(geo.position[1] * 50) / 50] : TOWNSHIP_CENTER
  const local = !!geo.position
  const key = point.join(',')

  useEffect(() => {
    const s = useWeatherStore.getState()
    const stale = !s.weather || Date.now() - s.weather.fetchedAt > REFRESH_MS
    if (s.key !== key || stale) load(key, point, local)
    const id = window.setInterval(() => load(key, point, local), REFRESH_MS)
    return () => window.clearInterval(id)
    // point and local derive from key.
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return useWeatherStore()
}
