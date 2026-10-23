// One shared GPS watch for the whole app. Maps, weather and the report form all
// read from here, so the browser only asks for permission once.
import { useEffect } from 'react'
import { create } from 'zustand'
import type { LatLng } from '../types'

export type GeoStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'

interface LocationState {
  status: GeoStatus
  position: LatLng | null
  accuracyM: number | null
  updatedAt: number | null
  /** Browser permission for this site. 'unknown' where the Permissions API is missing (older Safari). */
  permission: PermissionState | 'unknown'
}

export const useGeo = create<LocationState>(() => ({ status: 'idle', position: null, accuracyM: null, updatedAt: null, permission: 'unknown' }))

// Track the site permission live, so the UI updates when the user flips it in browser settings.
if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
  navigator.permissions
    .query({ name: 'geolocation' })
    .then((p) => {
      const sync = () => {
        useGeo.setState({ permission: p.state })
        // Unblocked in settings while the app is open: pick the watch back up.
        if (p.state === 'granted' && users > 0 && useGeo.getState().status !== 'ok') retryLocation()
      }
      sync()
      p.addEventListener('change', sync)
    })
    .catch(() => {})
}

let watchId: number | null = null
let users = 0

function start() {
  if (watchId !== null) return
  if (!('geolocation' in navigator)) return useGeo.setState({ status: 'unavailable' })
  if (!useGeo.getState().position) useGeo.setState({ status: 'locating' })
  watchId = navigator.geolocation.watchPosition(
    ({ coords }) =>
      useGeo.setState({
        status: 'ok',
        position: [coords.latitude, coords.longitude],
        accuracyM: coords.accuracy,
        updatedAt: Date.now(),
      }),
    (err) => {
      // Keep the last good fix through a brief signal loss.
      if (err.code === err.PERMISSION_DENIED) useGeo.setState({ status: 'denied', position: null })
      else if (!useGeo.getState().position) useGeo.setState({ status: 'unavailable' })
    },
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
  )
}

function stop() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

/** Retry after the user denied or the signal failed. */
export function retryLocation() {
  stop()
  useGeo.setState({ status: 'locating' })
  start()
}

/** Keeps the GPS watch running while the calling component is mounted. */
export function useLiveLocation(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    users++
    start()
    return () => {
      if (--users === 0) stop()
    }
  }, [enabled])
  return useGeo()
}
