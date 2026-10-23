import { useEffect } from 'react'
import { latLngBounds } from 'leaflet'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { ExternalLink, Footprints, Mountain, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useT } from '../i18n'
import type { EvacPlan } from '../services/evacuation'
import { usePrefersReducedMotion } from '../store/settings'
import type { LatLng } from '../types'

/** Chat reply attachment: the user's pin, the safe high place and the safest route between them. */
export function RouteCard({ plan }: { plan: EvacPlan }) {
  const t = useT()
  const reduced = usePrefersReducedMotion()

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white">
      <div className="h-64">
        <MapContainer
          key={reduced ? 'still' : 'animated'}
          center={plan.origin}
          zoom={15}
          className="size-full"
          scrollWheelZoom={false}
          zoomAnimation={!reduced}
          fadeAnimation={!reduced}
          markerZoomAnimation={!reduced}
        >
          <FitRoute path={plan.path} label={t('route.mapLabel')} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* White casing under the line so it reads on any tile colour. */}
          <Polyline positions={plan.path} pathOptions={{ color: '#fff', weight: 9, opacity: 0.9 }} />
          <Polyline positions={plan.path} pathOptions={{ color: '#15803d', weight: 5, dashArray: plan.routed ? undefined : '8 8' }} />
          <CircleMarker center={plan.origin} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} permanent>
              {t('map.you')}
            </Tooltip>
          </CircleMarker>
          <CircleMarker center={plan.dest.point} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#15803d', fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} permanent>
              {t('route.dest')}
            </Tooltip>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="space-y-2 p-4">
        <p className="flex items-start gap-2 font-semibold text-slate-900">
          <Mountain aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" />
          <span>
            {plan.dest.name || t('route.highGround')}
            {plan.gainM !== null && plan.gainM > 0 && <span className="font-normal text-slate-700"> · {t('route.gain', { m: plan.gainM })}</span>}
          </span>
        </p>
        <p className="flex items-center gap-2 text-slate-800">
          <Footprints aria-hidden className="size-5 shrink-0 text-slate-600" />
          {t('route.stats', { km: plan.distanceKm, min: plan.walkMin })}
        </p>
        {plan.routed ? (
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
            <span>
              {plan.options > 1 ? t('route.safest', { n: plan.options }) : null}
              {plan.lowestM !== null && <> {t('route.lowest', { m: plan.lowestM })}</>}
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
            {t('route.straight')}
          </p>
        )}
        {plan.originApprox && (
          <p className="flex items-start gap-2 text-sm font-medium text-amber-900">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
            {t('route.approx')}
          </p>
        )}
        <a
          href={plan.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-700 px-4 font-semibold text-white hover:bg-primary-800"
        >
          {t('route.openMaps')}
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>
    </div>
  )
}

/** Frames the whole route and labels the map region. */
function FitRoute({ path, label }: { path: LatLng[]; label: string }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('aria-label', label)
    el.setAttribute('role', 'region')
  }, [map, label])
  useEffect(() => {
    map.fitBounds(latLngBounds(path), { padding: [36, 36], maxZoom: 17, animate: false })
  }, [map, path])
  return null
}
