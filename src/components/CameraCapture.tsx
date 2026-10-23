import { useEffect, useRef, useState } from 'react'
import { Camera, LoaderCircle, SwitchCamera, X } from 'lucide-react'
import { useT } from '../i18n'

type CamState = 'starting' | 'live' | 'denied' | 'unavailable'

interface Props {
  onCapture: (photo: File) => void
  onClose: () => void
}

/** True when the browser can show a live camera (needs HTTPS or localhost). */
export const canUseLiveCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext

/** Full-screen live camera. Asks for camera permission when it opens. */
export function CameraCapture({ onCapture, onClose }: Props) {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureRef = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState<CamState>('starting')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    setState('starting')
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop())
        stream = s
        const v = videoRef.current
        if (v) {
          v.srcObject = s
          v.play().catch(() => {})
        }
        setState('live')
        captureRef.current?.focus()
      })
      .catch((err: DOMException) => !cancelled && setState(err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'denied' : 'unavailable'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [facing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    setFlash((f) => f + 1)
    navigator.vibrate?.(12)
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    canvas.toBlob((blob) => blob && onCapture(new File([blob], `flood-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.9)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('camera.title')} className="fixed inset-0 z-[2000] flex animate-fade flex-col bg-black text-white">
      <div className="flex items-center justify-between p-3">
        <p className="font-semibold">{t('camera.title')}</p>
        <button type="button" onClick={onClose} aria-label={t('camera.close')} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/15">
          <X aria-hidden className="size-6" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Shutter flash confirms the capture. */}
        {flash > 0 && <div key={flash} aria-hidden className="pointer-events-none absolute inset-0 z-10 animate-[shutter_260ms_var(--ease-out-quart)_both] bg-white" />}
        <video ref={videoRef} playsInline muted className={`max-h-full max-w-full transition-opacity duration-300 ${facing === 'user' ? '-scale-x-100' : ''} ${state === 'live' ? 'opacity-100' : 'opacity-0'}`} />
        {state === 'starting' && (
          <p className="absolute flex items-center gap-2">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            {t('camera.starting')}
          </p>
        )}
        {(state === 'denied' || state === 'unavailable') && (
          <p role="alert" className="absolute mx-6 max-w-sm rounded-xl bg-white p-4 text-center text-slate-900">
            {t(state === 'denied' ? 'camera.denied' : 'camera.unavailable')}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="size-12" />
        <button
          ref={captureRef}
          type="button"
          onClick={capture}
          disabled={state !== 'live'}
          aria-label={t('camera.capture')}
          className="inline-flex size-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-[transform,background-color] duration-150 hover:bg-white/30 active:scale-90 disabled:opacity-40"
        >
          <Camera aria-hidden className="size-8" />
        </button>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={state !== 'live'}
          aria-label={t('camera.switch')}
          className="inline-flex size-12 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-40"
        >
          <SwitchCamera aria-hidden className="size-6" />
        </button>
      </div>
    </div>
  )
}
