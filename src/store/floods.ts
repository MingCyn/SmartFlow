// Live flood feed and alerts. One watcher (mounted in AppShell) refreshes the simulated
// flood areas and raises an alert whenever an area floods or gets worse.
import { useEffect } from 'react'
import { create } from 'zustand'
import { translate } from '../i18n'
import { depthLabel } from '../components/DepthPicker'
import { getFloodAreas, LEVEL_DEPTH, LEVEL_RANK, type FloodArea, type FloodLevel } from '../services/floods'
import { useGeo } from './location'
import { useOps } from './ops'
import { useSettings } from './settings'

const REFRESH_MS = 15_000
const MAX_ALERTS = 3

export interface FloodAlert {
  key: string
  area: FloodArea
  at: number
}

interface FloodState {
  areas: FloodArea[]
  updatedAt: number | null
  alerts: FloodAlert[]
  dismiss: (key: string) => void
}

export const useFloods = create<FloodState>((set) => ({
  areas: [],
  updatedAt: null,
  alerts: [],
  dismiss: (key) => set((s) => ({ alerts: s.alerts.filter((a) => a.key !== key) })),
}))

/** Alert text, shared by the in-app alert and the system notification. */
export function alertText(area: FloodArea, lang: 'en' | 'ms'): { title: string; body: string } {
  const depth = LEVEL_DEPTH[area.level]
  return {
    title: translate(lang, area.level === 'severe' ? 'flood.titleSevere' : 'flood.titleFlooded'),
    body: translate(lang, area.level === 'severe' ? 'flood.alertSevere' : 'flood.alertFlooded', {
      area: area.name[lang],
      depth: depth ? translate(lang, depthLabel(depth)) : '',
      km: area.km,
    }),
  }
}

async function systemNotify(area: FloodArea) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const { title, body } = alertText(area, useSettings.getState().lang)
  const options = { body, tag: `flood-${area.id}`, icon: '/icons/icon-192.png' }
  try {
    // Phones need the service worker to show it; in dev there is none, so fall back.
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // Notifications blocked mid-session: the in-app alert still shows.
  }
}

/** Keeps the flood feed fresh and raises alerts. Mount once. */
export function useFloodWatch() {
  useEffect(() => {
    let prev: Map<string, FloodLevel> | null = null
    let seq = 0
    let live = true

    async function tick() {
      const mine = ++seq
      const areas = await getFloodAreas()
      // A newer refresh started while this one was loading.
      if (!live || mine !== seq) return
      // The first load only sets the baseline, so opening the app does not fire alerts.
      const worse = prev
        ? areas.filter((a) => a.level !== 'watch' && LEVEL_RANK[a.level] > LEVEL_RANK[prev!.get(a.id) ?? 'none'])
        : []
      prev = new Map(areas.map((a) => [a.id, a.level]))
      const now = Date.now()
      useFloods.setState((s) => ({
        areas,
        updatedAt: now,
        alerts: [
          ...worse.map((area) => ({ key: `${area.id}-${area.level}-${now}`, area, at: now })),
          ...s.alerts.filter((a) => !worse.some((w) => w.id === a.area.id)),
        ].slice(0, MAX_ALERTS),
      }))
      worse.forEach(systemNotify)
    }

    tick()
    const id = window.setInterval(tick, REFRESH_MS)
    // React at once to the storm simulator, added floods and a moved GPS anchor.
    const offOps = useOps.subscribe((s, p) => (s.storm !== p.storm || s.extraFloods !== p.extraFloods) && tick())
    const round = (p: [number, number] | null) => (p ? `${p[0].toFixed(3)},${p[1].toFixed(3)}` : '')
    const offGeo = useGeo.subscribe((s, p) => round(s.position) !== round(p.position) && tick())
    return () => {
      live = false
      window.clearInterval(id)
      offOps()
      offGeo()
    }
  }, [])
}
