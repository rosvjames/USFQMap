import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Sky } from '@react-three/drei'
import { useLoader, useThree } from '@react-three/fiber'
import { EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader, WebGLCubeRenderTarget } from 'three'
import { LIGHTWEIGHT_QUERY } from './RenderSettings'

const SKY_URL = '/textures/sky/campus-day.webp'
const SKY_URL_LIGHTWEIGHT = '/textures/sky/campus-day-mobile.webp'

/**
 * Map view keeps the procedural Sky over the scene's flat background colour. Walking swaps it for a static equirectangular
 * panorama; it is a backdrop only, so scene.environment (the lighting) is untouched. The image is fetched once on mount
 * (one variant, chosen once) and suspends with the rest of the scene, so entering walking never waits.
 *
 * On first entering walking the panorama is converted once into a cube map of width/4 per face (512 desktop, 256 mobile;
 * three's automatic background conversion would use the image height, twice that). The cube map is kept for later
 * toggles and the equirectangular GPU copy is released right after, so only the cube map stays resident (~8 MiB / ~2 MiB
 * with mips, estimated). Cube map and image are released on unmount; the decoded image stays in useLoader's cache.
 */
export function CampusSky({ walking }: { walking: boolean }) {
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const [lightweight] = useState(() => window.matchMedia(LIGHTWEIGHT_QUERY).matches)
  const panorama = useLoader(TextureLoader, lightweight ? SKY_URL_LIGHTWEIGHT : SKY_URL)
  const cube = useRef<WebGLCubeRenderTarget | null>(null)
  useMemo(() => {
    panorama.mapping = EquirectangularReflectionMapping
    if (panorama.colorSpace !== SRGBColorSpace) { panorama.colorSpace = SRGBColorSpace; panorama.needsUpdate = true }
  }, [panorama])
  useLayoutEffect(() => {
    if (!walking) return
    if (!cube.current) {
      cube.current = new WebGLCubeRenderTarget(panorama.image.width / 4, { depthBuffer: false }).fromEquirectangularTexture(gl, panorama)
      panorama.dispose()
    }
    const previous = scene.background
    scene.background = cube.current.texture
    invalidate()
    return () => { scene.background = previous; invalidate() }
  }, [walking, scene, gl, panorama, invalidate])
  useEffect(() => () => {
    cube.current?.dispose()
    cube.current = null
    panorama.dispose()
  }, [panorama])
  return walking ? null : <Sky distance={4500} sunPosition={[-140, 240, 100]} turbidity={4} rayleigh={0.6} mieCoefficient={0.005} />
}
