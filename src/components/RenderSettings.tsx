import { useLayoutEffect, useState, useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function useLightweightRendering() {
  const [lightweight, setLightweight] = useState(() => window.matchMedia('(max-width: 759px), (pointer: coarse)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 759px), (pointer: coarse)')
    const update = () => setLightweight(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return lightweight
}

/** Sun and buildings are fixed: shadow maps only change when scene content changes. */
export function CachedShadows({ sceneKey }: { sceneKey: string }) {
  const gl = useThree((state) => state.gl), invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; invalidate()
    return () => { gl.shadowMap.autoUpdate = true }
  }, [gl, invalidate, sceneKey])
  return null
}
