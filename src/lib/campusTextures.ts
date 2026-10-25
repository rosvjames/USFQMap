import { NoColorSpace, SRGBColorSpace, type Texture } from 'three'
import manifest from '../../public/textures/campus-v1/manifest.json'

/** The texture contract lives in `public/textures/campus-v1/manifest.json`; paths and colour modes are read from it. */
export const SURFACE_FAMILIES = [
  'grass', 'sand', 'paving', 'limestone', 'concrete', 'asphalt', 'stucco', 'brick',
  'stone', 'wood', 'roof-tile', 'roof-metal', 'bark', 'palm-bark', 'soil', 'synthetic',
] as const
export type SurfaceFamily = typeof SURFACE_FAMILIES[number]
export type ColorMode = 'color' | 'tint'

export interface FamilyAsset {
  label: string
  colorMode: ColorMode
  resolution: number
  tileMeters: [number, number]
  albedo: string
  mobileAlbedo: string
  normal: string
  roughness: string
}
export const TEXTURE_MANIFEST = manifest as unknown as {
  version: number
  ready: boolean
  assets: Record<SurfaceFamily, FamilyAsset>
  foliage: { tree: string; palm: string }
}

/** UVs are expressed in tiles of this many metres, so one image repeat covers 2.4 m of wall or floor. */
export const TILE_METERS = 2.4

/**
 * 'tint' albedos are neutral greys whose average is about 0.85 (sRGB), i.e. 0.695 once linearised. The procedural maps they
 * replace averaged about 0.78 linear, and every palette colour was chosen under those; this gain keeps the same brightness
 * so the palette is modulated once and not darkened by the new images.
 */
export const TINT_GAIN = 1.12

/** Normal-map strength per family: the relief is derived from the colour image, so it is kept moderate. */
export const NORMAL_STRENGTH: Record<SurfaceFamily, number> = {
  grass: .5, sand: .6, paving: .7, limestone: .6, concrete: .5, asphalt: .6, stucco: .45, brick: .8,
  stone: .8, wood: .6, 'roof-tile': .8, 'roof-metal': .6, bark: .9, 'palm-bark': .9, soil: .6, synthetic: .4,
}

export type TextureSlot = 'map' | 'normalMap' | 'roughnessMap'
export interface TextureRequest { family: SurfaceFamily; slot: TextureSlot; url: string }
export type FamilyTextures = Record<TextureSlot, Texture>
/** Pond ripples: a tangent-space normal map, a roughness map and a neutral macro tone that multiplies the jade colour. */
export type WaterSlot = 'map' | 'normalMap' | 'roughnessMap'
export type WaterTextures = Record<WaterSlot, Texture>
export interface CampusTextureSet {
  families: Record<SurfaceFamily, FamilyTextures>
  foliage: { tree: Texture; palm: Texture }
  water: WaterTextures
}

export const WATER_SLOTS: readonly WaterSlot[] = ['map', 'normalMap', 'roughnessMap']
/** Data maps stay linear; only the tone is sRGB. */
export const WATER_COLOR_SPACE: Record<WaterSlot, string> = { map: SRGBColorSpace, normalMap: NoColorSpace, roughnessMap: NoColorSpace }
/**
 * Metres covered by one repeat of each map. Ripples repeat every 6 m, which keeps them fine at eye level without showing
 * a pattern across the lagoon; the soft tone repeats three times more slowly so the two never line up.
 */
export const WATER_TILE_METERS: Record<WaterSlot, number> = { map: 18, normalMap: 6, roughnessMap: 6 }
/** Phones and coarse pointers get the 512 px normal map; the colour and roughness maps are 512 px everywhere. */
export function waterUrls(lightweight: boolean): Record<WaterSlot, string> {
  return {
    map: '/textures/water/pond-color.webp',
    normalMap: lightweight ? '/textures/water/pond-normal-mobile.webp' : '/textures/water/pond-normal.webp',
    roughnessMap: '/textures/water/pond-roughness.webp',
  }
}

/** Every image a family needs. Phones and coarse pointers get the 512 px albedo of the 1024 px families. */
export function familyRequests(family: SurfaceFamily, lightweight: boolean): TextureRequest[] {
  const asset = TEXTURE_MANIFEST.assets[family]
  return [
    { family, slot: 'map', url: lightweight ? asset.mobileAlbedo : asset.albedo },
    { family, slot: 'normalMap', url: asset.normal },
    { family, slot: 'roughnessMap', url: asset.roughness },
  ]
}
export function allTextureRequests(lightweight: boolean): TextureRequest[] {
  return SURFACE_FAMILIES.flatMap((family) => familyRequests(family, lightweight))
}
export function foliageUrls() { return [TEXTURE_MANIFEST.foliage.tree, TEXTURE_MANIFEST.foliage.palm] }

export function maxAnisotropy(lightweight: boolean, supported: number) { return Math.min(lightweight ? 2 : 8, supported) }

export interface SurfaceSpec {
  family: SurfaceFamily
  /** Palette colour for 'tint' families. 'color' families keep their natural albedo, so this only multiplies it (default white). */
  color?: string
  roughness: number
  metalness?: number
  /** Overrides NORMAL_STRENGTH[family]. */
  normal?: number
}

/**
 * Shared campus materials and the family each one draws from. The palette colours are the ones the buildings already used.
 * pondWater and roofGlass are deliberately absent: water has its own ripple images (WATER_TILE_METERS) and reflections, glass stays glass.
 */
export const SHARED_SURFACES = {
  pagodaWood: { family: 'wood', color: '#ac7841', roughness: .83 },
  pagodaRoof: { family: 'roof-tile', color: '#504b43', roughness: .95 },
  pondRock: { family: 'stone', color: '#767569', roughness: .98 },
  stucco: { family: 'stucco', color: '#d5af94', roughness: .95 },
  casitaWhite: { family: 'stucco', color: '#f0ece0', roughness: .95 },
  daVinciYellow: { family: 'stucco', color: '#e5b55f', roughness: .95 },
  miguelCream: { family: 'stucco', color: '#dccaaa', roughness: .95 },
  brick: { family: 'brick', color: '#b65e43', roughness: .92 },
  hayekBrick: { family: 'brick', color: '#ac8964', roughness: .96 },
  hayekStone: { family: 'stone', color: '#aaa99b', roughness: .96 },
  cream: { family: 'stucco', color: '#e4ddc8', roughness: .95 },
  epicuroStone: { family: 'stucco', color: '#b6b09c', roughness: .96 },
  academicOrange: { family: 'stucco', color: '#db7842', roughness: .95 },
  coliseoOrange: { family: 'stucco', color: '#c85e35', roughness: .95 },
  coliseoLane: { family: 'paving', color: '#c1b8a2', roughness: .95 },
  hallRed: { family: 'stucco', color: '#c3654f', roughness: .95 },
  entranceStone: { family: 'stone', color: '#b8b6a8', roughness: .95 },
  redStone: { family: 'stone', color: '#aa705a', roughness: .95 },
  terracotta: { family: 'roof-tile', color: '#64504a', roughness: .92 },
  redTileRoof: { family: 'roof-tile', color: '#b78368', roughness: .95 },
  tealRoof: { family: 'roof-metal', color: '#8bafa3', roughness: .77, metalness: .15 },
  concreteRoof: { family: 'concrete', color: '#d6d0bd', roughness: .96 },
  metalRoof: { family: 'roof-metal', color: '#708c7e', roughness: .65, metalness: .25 },
  grass: { family: 'grass', roughness: 1 },
  paving: { family: 'paving', color: '#c1b8a2', roughness: .95 },
  lakePaving: { family: 'limestone', color: '#c1b8a2', roughness: .95 },
  road: { family: 'asphalt', color: '#aaa9a0', roughness: 1 },
  sand: { family: 'sand', roughness: 1 },
  tennis: { family: 'concrete', color: '#286fa8', roughness: .95 },
  synthetic: { family: 'synthetic', roughness: .95 },
  // Pieces that previously used a flat local colour and now share the families.
  hedge: { family: 'grass', color: '#d3dba6', roughness: 1 },
  soil: { family: 'soil', roughness: 1 },
  gravel: { family: 'sand', color: '#ebe6cf', roughness: 1 },
} as const satisfies Record<string, SurfaceSpec>
export type SharedSurface = keyof typeof SHARED_SURFACES

/** Aliases that keep the same material object as another entry. */
export const SURFACE_ALIASES = { garden: 'grass' } as const satisfies Record<string, SharedSurface>

/** Water and glass use their own finishes rather than a wall or ground texture family. */
export const UNTEXTURED_MATERIALS = ['pondWater', 'roofGlass'] as const

/** Colour a material multiplies its albedo with: palette colour for 'tint' families (with gain), white tone for 'color' ones. */
export function surfaceColor(spec: SurfaceSpec): { hex: string; gain: number } {
  const mode = TEXTURE_MANIFEST.assets[spec.family].colorMode
  if (mode === 'color') return { hex: spec.color ?? '#ffffff', gain: 1 }
  return { hex: spec.color ?? '#ffffff', gain: TINT_GAIN }
}
