import { useEffect, type ReactNode } from 'react'
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { CELL_GEOMETRY, TOWNSHIP_CENTER } from '../services/cells'
import { usePrefersReducedMotion } from '../store/settings'
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
}

export function TownshipMap({ label, className = 'h-72', children, onPick, highlightCellId, cellTint, focus, zoom = 14 }: Props) {
  const t = useT()
  const reduced = usePrefersReducedMotion()
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-300 ${className}`}>
      {/* Leaflet reads animation options only on creation, so remount when reduced motion changes. */}
      <MapContainer
        key={reduced ? 'still' : 'animated'}
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
        {onPick && <ClickToPick onPick={onPick} />}
        {focus && <FocusOn target={focus} />}
        {children}
      </MapContainer>
    </div>
  )
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
