import { Component, type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture, TextureLoader } from 'three'
import {
  type CampusTextureSet, type FamilyTextures, SURFACE_FAMILIES, WATER_COLOR_SPACE, WATER_SLOTS,
  allTextureRequests, foliageUrls, maxAnisotropy, waterUrls,
} from '../lib/campusTextures'
import { LIGHTWEIGHT_QUERY } from './RenderSettings'

/**
 * Loads every campus-v1 image once (useLoader caches by URL) and configures it for its role. Suspends until all are
 * decoded and uploaded to the GPU, so the first frame is drawn with the finished materials; a missing file throws and
 * reaches SceneLoadBoundary instead of falling back to flat colours.
 */
export function useCampusTextures(): CampusTextureSet {
  const gl = useThree((state) => state.gl)
  // Resolution is decided once: changing it later would reload every image and blank the scene.
  const [lightweight] = useState(() => window.matchMedia(LIGHTWEIGHT_QUERY).matches)
  const requests = useMemo(() => allTextureRequests(lightweight), [lightweight])
  const waterFiles = waterUrls(lightweight)
  const loaded = useLoader(TextureLoader, [...requests.map((request) => request.url), ...foliageUrls(), ...WATER_SLOTS.map((slot) => waterFiles[slot])])
  const set = useMemo(() => {
    const anisotropy = maxAnisotropy(lightweight, gl.capabilities.getMaxAnisotropy())
    const configure = (texture: Texture, colorSpace: string, tiled: boolean) => {
      if (texture.colorSpace !== colorSpace) { texture.colorSpace = colorSpace; texture.needsUpdate = true }
      if (tiled) texture.wrapS = texture.wrapT = RepeatWrapping
      texture.anisotropy = anisotropy
      return texture
    }
    const families = Object.fromEntries(SURFACE_FAMILIES.map((family) => [family, {} as FamilyTextures])) as CampusTextureSet['families']
    requests.forEach((request, i) => {
      families[request.family][request.slot] = configure(loaded[i], request.slot === 'map' ? SRGBColorSpace : NoColorSpace, true)
    })
    // Leaf cards are clamped: their transparent margin must not bleed in from the opposite edge.
    const [tree, palm] = loaded.slice(requests.length, requests.length + 2).map((texture) => configure(texture, SRGBColorSpace, false))
    const water = Object.fromEntries(WATER_SLOTS.map((slot, i) => [slot, configure(loaded[requests.length + 2 + i], WATER_COLOR_SPACE[slot], true)])) as CampusTextureSet['water']
    return { families, foliage: { tree, palm }, water }
  }, [gl, lightweight, loaded, requests])
  const textures = useMemo(() => [...Object.values(set.families).flatMap((family) => Object.values(family)), set.foliage.tree, set.foliage.palm, ...Object.values(set.water)], [set])
  useLayoutEffect(() => { textures.forEach((texture) => gl.initTexture(texture)) }, [gl, textures])
  // The loader keeps the decoded images; only the GPU copies are released, and they are re-uploaded if drawn again.
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures])
  return set
}

/** Announces the scene only once everything above it has committed and one frame has been drawn. */
export function SceneReady({ onReady }: { onReady?: () => void }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => onReady?.()) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [invalidate, onReady])
  return null
}

/** A texture that cannot be loaded is reported on screen, not hidden behind flat colours. */
export class SceneLoadBoundary extends Component<{ children: ReactNode; onFail?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('MiCampus scene failed to load:', error); this.props.onFail?.() }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <div role="alert" style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', gap: 8, padding: 24, textAlign: 'center', background: '#f4f1e8', color: '#3b2f2a', font: '15px/1.4 system-ui, sans-serif' }}>
      <strong>No se pudo cargar el mapa 3D del campus.</strong>
      <span>{error.message || 'Falló la carga de una textura.'}</span>
    </div>
  }
}
