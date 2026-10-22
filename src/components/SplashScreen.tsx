import { useEffect, useState } from 'react'

// Long enough to greet the visitor even when the campus loads instantly from cache.
const MIN_VISIBLE_MS = 1400
const FADE_MS = 450

/** Covers the map while the 3D campus is built, with the mascot waving from the bottom edge. */
export function SplashScreen({ ready }: { ready: boolean }) {
  const [greeted, setGreeted] = useState(false)
  const [gone, setGone] = useState(false)
  const leaving = ready && greeted

  useEffect(() => {
    const timer = setTimeout(() => setGreeted(true), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  if (gone) return null
  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-live="polite">
      <div className="splash-brand">
        <p className="wordmark">USFQ <span>Explora</span></p>
        <span className="splash-bar" aria-hidden="true"><span /></span>
        <span className="visually-hidden">{leaving ? 'Campus listo' : 'Cargando el campus'}</span>
      </div>
      <img className="splash-mascot" src="/mascota/saludo.png" alt="" />
    </div>
  )
}
