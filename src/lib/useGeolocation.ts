import { useEffect, useState } from 'react'
import type { Vec2 } from '../types'
import { toLocal } from './geo'

// Farther than this from the campus center the position is useless as a starting point.
const CAMPUS_RADIUS = 450

export interface Geolocation {
  position?: Vec2
  error?: string
}

/** Follows the phone's GPS while `enabled`. Browsers only allow it over HTTPS or on localhost. */
export function useGeolocation(enabled: boolean): Geolocation {
  const [state, setState] = useState<Geolocation>({})

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setState({ error: 'Este navegador no permite obtener tu ubicación.' })
      return
    }
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const position = toLocal([coords.longitude, coords.latitude])
        setState(
          Math.hypot(...position) > CAMPUS_RADIUS
            ? { error: 'Parece que estás fuera del campus. Elige un edificio como punto de partida.' }
            : { position },
        )
      },
      (error) =>
        setState({
          error:
            error.code === error.PERMISSION_DENIED
              ? 'Permite el acceso a tu ubicación para usarla como punto de partida.'
              : 'No pudimos obtener tu ubicación. Elige un edificio como punto de partida.',
        }),
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [enabled])

  return enabled ? state : {}
}
