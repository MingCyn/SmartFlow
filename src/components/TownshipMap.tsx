import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { Circle, CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { LoaderCircle, LocateFixed } from 'lucide-react'
import { CELL_GEOMETRY, TOWNSHIP_CENTER } from '../services/cells'
import { usePrefersReducedMotion, useSettings } from '../store/settings'
import { useFloods } from '../store/floods'
import type { FloodLevel } from '../services/floods'
import { retryLocation, useLiveLocation } from '../store/location'
import { useT } from '../i18n'
import type { LatLng } from '../types'

interface Props {
  label: string
  className?: string
  children?: ReactNode
  onPick?: (lat: number, lng: number) => void
  highlightCellId?: string | null
  /** Optional 0 to 1 fill strength per cell id, e.g. priority score. */
  cellTint?: Record<string, number>
  focus?: LatLng | null
  zoom?: number
  /** Show the user's live GPS position and a locate-me button. On by default. */
  liveLocation?: boolean
  /** Show the simulated flooded areas. On by default. */
  floods?: boolean
}

export function TownshipMap({ label, className = 'h-72', children, onPick, highlightCellId, cellTint, focus, zoom = 14, liveLocation = true, floods = true }: Props) {
  const t = useT()
  const reduced = usePrefersReducedMotion()
  const geo = useLiveLocation(liveLocation)
  const mapRef = useRef<LeafletMap>(null)
  const [wantFly, setWantFly] = useState(false)

  // Fly once the fix arrives if the user pressed locate while still waiting.
  useEffect(() => {
    if (!wantFly || !geo.position || !mapRef.current) return
    setWantFly(false)
    const z = Math.max(mapRef.current.getZoom(), 16)
    if (reduced) mapRef.current.setView(geo.position, z, { animate: false })
    else mapRef.current.flyTo(geo.position, z, { duration: 0.8 })
  }, [wantFly, geo.position, reduced])

  function locateMe() {
    if (geo.status === 'denied' || geo.status === 'unavailable') retryLocation()
    setWantFly(true)
  }

  const locBusy = wantFly && !geo.position && geo.status !== 'denied' && geo.status !== 'unavailable'

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-300 ${className}`}>
      {/* Leaflet reads animation options only on creation, so remount when reduced motion changes. */}
      <MapContainer
        key={reduced ? 'still' : 'animated'}
        ref={mapRef}
        center={TOWNSHIP_CENTER}
        zoom={zoom}
        className="size-full"
        scrollWheelZoom={false}
        zoomAnimation={!reduced}
        fadeAnimation={!reduced}
        markerZoomAnimation={!reduced}
      >
        <MapHelpers label={label} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {CELL_GEOMETRY.map((c) => (
          <Rectangle
            key={c.id}
            bounds={c.bounds}
            pathOptions={{
              color: c.id === highlightCellId ? '#183f80' : '#64748b',
              weight: c.id === highlightCellId ? 3 : 1,
              fillColor: '#2f63b8',
              fillOpacity: cellTint ? 0.04 + 0.3 * (cellTint[c.id] ?? 0) : c.id === highlightCellId ? 0.12 : 0.03,
              dashArray: c.id === highlightCellId ? undefined : '4 4',
            }}
          >
            <Tooltip direction="center" permanent className="!border-0 !bg-white/80 !p-0.5 !text-xs !font-semibold !shadow-none">
              {t('zone', { id: c.id })}
            </Tooltip>
          </Rectangle>
        ))}
        {floods && <FloodLayer />}
        {onPick && <ClickToPick onPick={onPick} />}
        {focus && <FocusOn target={focus} />}
        {liveLocation && geo.position && (
          <>
            {geo.accuracyM !== null && geo.accuracyM < 2000 && (
              <Circle center={geo.position} radius={geo.accuracyM} interactive={false} pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }} />
            )}
            <CircleMarker center={geo.position} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -8]}>{t('map.you')}</Tooltip>
            </CircleMarker>
          </>
        )}
        {children}
      </MapContainer>
      {liveLocation && (
        <button
          type="button"
          onClick={locateMe}
          aria-label={t('map.locateMe')}
          title={geo.status === 'denied' ? t('map.locDenied') : t('map.locateMe')}
          className="absolute bottom-3 right-3 z-[1000] inline-flex size-11 items-center justify-center rounded-full border border-slate-300 bg-white text-primary-700 shadow-md hover:bg-primary-50"
        >
          {locBusy ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <LocateFixed aria-hidden className={`size-5 ${geo.status === 'ok' ? 'text-blue-600' : ''}`} />}
        </button>
      )}
    </div>
  )
}

const FLOOD_STYLE: Record<FloodLevel, { color: string; fillOpacity: number; dashArray?: string; label: 'flood.level.watch' | 'flood.level.flooded' | 'flood.level.severe' }> = {
  watch: { color: '#d97706', fillOpacity: 0.08, dashArray: '6 6', label: 'flood.level.watch' },
  flooded: { color: '#d97706', fillOpacity: 0.3, label: 'flood.level.flooded' },
  severe: { color: '#b91c1c', fillOpacity: 0.35, label: 'flood.level.severe' },
}

/** Simulated flooded areas from the shared live feed. Clicks pass through so pin-dropping still works. */
function FloodLayer() {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const areas = useFloods((s) => s.areas)
  return areas.map((a) => {
    const style = FLOOD_STYLE[a.level]
    return (
      <Circle
        key={a.id}
        center={[a.lat, a.lng]}
        radius={a.radiusM}
        bubblingMouseEvents
        pathOptions={{ color: style.color, weight: 2, fillColor: style.color, fillOpacity: style.fillOpacity, dashArray: style.dashArray }}
      >
        <Tooltip direction="top" sticky>
          <span className="font-semibold">{a.name[lang]}</span>: {t(style.label)} ({t('flood.simulated')})
        </Tooltip>
      </Circle>
    )
  })
}

/** Labels the map region and keeps tiles correct when the layout toggle resizes the container. */
function MapHelpers({ label }: { label: string }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('aria-label', label)
    el.setAttribute('role', 'region')
  }, [map, label])
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  return null
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

/** Pans to a point. Respects reduced motion by jumping instead of flying. */
function FocusOn({ target }: { target: LatLng }) {
  const map = useMap()
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    const zoom = Math.max(map.getZoom(), 15)
    if (reduced) map.setView(target, zoom, { animate: false })
    else map.flyTo(target, zoom, { duration: 0.8 })
  }, [map, target, reduced])
  return null
}
