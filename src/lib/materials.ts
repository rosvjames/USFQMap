import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Side, type Texture } from 'three'
import {
  type CampusTextureSet, type FamilyTextures, type SharedSurface, type SurfaceFamily, type SurfaceSpec, type WaterTextures,
  NORMAL_STRENGTH, SHARED_SURFACES, SURFACE_ALIASES, TILE_METERS, WATER_SLOTS, WATER_TILE_METERS, surfaceColor,
} from './campusTextures'
import { createPlantGeometry } from './campusFoliage'
import { withWorldUv } from './worldUv'

/** Families whose UVs are authored by their own geometry (trunks wrap their own bark tiles), not projected in world metres. */
const OWN_UV: readonly SurfaceFamily[] = ['bark', 'palm-bark']

/**
 * Still pond water: a dielectric (ior 1.333, no metalness) whose capillary ripples come from the normal map, so the
 * reflection fades in with a Fresnel response toward the horizon. It stays opaque, with no transmission or refraction
 * pass, so it batches and receives shadows like every other flat surface.
 *
 * `reflection` is the campus panorama, and the water is the only surface that receives it: the scene has no environment
 * and no glass or window samples it. It is assigned explicitly, which is also
 * what lets envMapIntensity apply. The envMap feeds the diffuse term at the same intensity, hence the deeper jade. The
 * texture is owned by its loader, not by this material.
 *
 * UVs reach the material in tiles of TILE_METERS (the batcher projects them from world metres, and Shape geometry is scaled
 * to match); each map's repeat then converts that to its own WATER_TILE_METERS, so ripples have the same physical size on
 * the lagoon, the pagoda pond and the fountains, batched or not. The repeats live on the shared textures.
 */
export function createWaterMaterial(textures: WaterTextures, reflection: Texture): MeshPhysicalMaterial {
  for (const slot of WATER_SLOTS) textures[slot].repeat.setScalar(TILE_METERS / WATER_TILE_METERS[slot])
  const material = new MeshPhysicalMaterial({
    color: '#3c6558', map: textures.map, normalMap: textures.normalMap, roughnessMap: textures.roughnessMap,
    envMap: reflection, envMapIntensity: 0.9,
    // The roughness image is near white (about 0.9), so this multiplier lands the surface around 0.19: calm, never mirror-like.
    roughness: 0.21, metalness: 0, ior: 1.333,
  })
  material.normalScale.setScalar(0.5)
  material.userData.worldUv = true
  return material
}

export interface SurfaceOptions { roughness?: number; metalness?: number; normal?: number; side?: Side; vertexColors?: boolean }

/**
 * A MeshStandardMaterial drawing from one family: albedo, normal and roughness images, one repeat per 2.4 m.
 * 'tint' families multiply the palette colour (with TINT_GAIN); 'color' families keep their natural albedo and only
 * take the colour as a gentle multiplier. UVs follow world metres when batched, except bark which wraps its own tiles.
 */
export function createSurfaceMaterial(textures: FamilyTextures, spec: SurfaceSpec, options: SurfaceOptions = {}): MeshStandardMaterial {
  const { hex, gain } = surfaceColor(spec)
  const material = new MeshStandardMaterial({
    color: new Color(hex).multiplyScalar(gain), map: textures.map, normalMap: textures.normalMap, roughnessMap: textures.roughnessMap,
    roughness: options.roughness ?? spec.roughness, metalness: options.metalness ?? spec.metalness ?? 0,
    ...(options.side === undefined ? {} : { side: options.side }), ...(options.vertexColors === undefined ? {} : { vertexColors: options.vertexColors }),
  })
  material.normalScale.setScalar(options.normal ?? spec.normal ?? NORMAL_STRENGTH[spec.family])
  material.userData.surfaceFamily = spec.family
  if (!OWN_UV.includes(spec.family)) material.userData.worldUv = true
  return material
}

/**
 * Windows and glazed doors use plain matte panes without an environment map, including on phones.
 */
export const GLASS_ROUGHNESS = 0.55
export interface GlassOptions { roughness?: number; opacity?: number }

/** `reflection` is for the water only; nothing else in the campus receives an environment map. */
export function createCampusMaterials(textures: CampusTextureSet, reflection: Texture) {
  const owned = new Set<MeshStandardMaterial>()
  const own = <T extends MeshStandardMaterial>(material: T, name: string): T => { material.name = name; owned.add(material); return material }

  const shared = Object.fromEntries(Object.entries(SHARED_SURFACES).map(([key, spec]) =>
    [key, own(createSurfaceMaterial(textures.families[spec.family], spec), key)])) as Record<SharedSurface, MeshStandardMaterial>
  const aliases = Object.fromEntries(Object.entries(SURFACE_ALIASES).map(([alias, key]) => [alias, shared[key]])) as Record<keyof typeof SURFACE_ALIASES, MeshStandardMaterial>

  const roofGlass = own(new MeshStandardMaterial({ color: '#8aafab', roughness: 0.6, metalness: 0, transparent: true, opacity: 0.88 }), 'roofGlass')

  const panes = new Map<string, MeshStandardMaterial>()
  /** A cached pane per colour and finish, owned (and disposed) here: components borrow it and never dispose it. */
  function glass(color: string, options: GlassOptions = {}) {
    const roughness = options.roughness ?? GLASS_ROUGHNESS, opacity = options.opacity ?? 1
    const key = [color, roughness, opacity].join('|')
    let material = panes.get(key)
    if (!material) {
      material = own(new MeshStandardMaterial({ color, roughness, metalness: 0, ...(opacity < 1 ? { transparent: true, opacity } : {}) }), `glass-${key}`)
      panes.set(key, material)
    }
    return material
  }

  const locals = new Map<string, MeshStandardMaterial>()
  /** Finishes that components used to build as flat local colours, now cached and shared by family and colour. */
  function surface(family: SurfaceFamily, color?: string, options: SurfaceOptions = {}) {
    const key = [family, color, options.roughness, options.metalness, options.normal, options.side, options.vertexColors].join('|')
    let material = locals.get(key)
    if (!material) {
      const spec: SurfaceSpec = { family, color, roughness: options.roughness ?? defaultRoughness(family) }
      material = own(createSurfaceMaterial(textures.families[family], spec, options), key)
      locals.set(key, material)
    }
    return material
  }

  const worldUvVariants = new Map<MeshStandardMaterial, MeshStandardMaterial>()
  /** For instanced boxes of varying size, whose baked UVs cannot follow each instance. Only for flat-faced geometry. */
  function worldUv(material: MeshStandardMaterial) {
    let variant = worldUvVariants.get(material)
    if (!variant) { variant = own(withWorldUv(material), `${material.name}-worldUv`); worldUvVariants.set(material, variant) }
    return variant
  }

  const foliageMaterials = new Map<string, MeshStandardMaterial>()
  /** Alpha-tested leaf cards. `tone` is a light multiplier over the natural leaf colour, never a replacement. */
  function leaf(tone = '#ffffff', kind: 'tree' | 'palm' = 'tree') {
    const key = `${kind}|${tone}`
    let material = foliageMaterials.get(key)
    if (!material) {
      material = own(new MeshStandardMaterial({
        color: tone, map: textures.foliage[kind], alphaTest: kind === 'tree' ? 0.4 : 0.35, alphaToCoverage: true, side: DoubleSide, roughness: kind === 'tree' ? 0.92 : 0.8,
      }), `leaf-${key}`)
      foliageMaterials.set(key, material)
    }
    return material
  }
  const plants = createPlantGeometry()

  const materials = {
    ...shared,
    ...aliases,
    pondWater: own(createWaterMaterial(textures.water, reflection), 'pondWater'),
    roofGlass,
    bark: surface('bark'),
    palmBark: surface('palm-bark'),
  }
  return {
    ...materials, plants, surface, worldUv, leaf, glass,
    dispose: () => { owned.forEach((material) => material.dispose()); plants.dispose() },
  }
}

/** Per-family roughness when a component asks for a finish without choosing one. */
function defaultRoughness(family: SurfaceFamily): number {
  switch (family) {
    case 'roof-metal': return 0.7
    case 'wood': case 'bark': case 'palm-bark': return 0.9
    case 'asphalt': case 'grass': case 'sand': case 'soil': return 1
    default: return 0.95
  }
}

export type CampusMaterials = ReturnType<typeof createCampusMaterials>
