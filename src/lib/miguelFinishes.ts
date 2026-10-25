import { EquirectangularReflectionMapping, MeshStandardMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

export const MIGUEL_TEXTURE_FILES = {
  stucco: '/textures/miguel/stucco.webp', stuccoBump: '/textures/miguel/stucco-bump.webp',
  roof: '/textures/miguel/roof.webp', roofBump: '/textures/miguel/roof-bump.webp',
  terracotta: '/textures/miguel/terracotta.webp', terracottaBump: '/textures/miguel/terracotta-bump.webp',
  paving: '/textures/miguel/paving.webp', pavingBump: '/textures/miguel/paving-bump.webp',
  reflections: '/textures/miguel/reflections.webp',
}
export type MiguelTextures = Record<keyof typeof MIGUEL_TEXTURE_FILES, Texture>
export type MiguelFinishes = Record<'miguelCream' | 'tealRoof' | 'metalRoof' | 'hallRed' | 'paving' | 'entranceStone', MeshStandardMaterial>

/** Colour space, wrapping and filtering of Miguel's own images; the panorama is only ever a water reflection. */
export function configureMiguelTextures(textures: MiguelTextures, anisotropy: number) {
  for (const [name, texture] of Object.entries(textures)) {
    texture.colorSpace = name.endsWith('Bump') ? NoColorSpace : SRGBColorSpace
    if (name !== 'reflections') {
      texture.wrapS = texture.wrapT = RepeatWrapping
      texture.anisotropy = anisotropy
    }
    texture.needsUpdate = true
  }
  textures.reflections.mapping = EquirectangularReflectionMapping
}

/** Miguel's plaster, roof, terracotta and paving. None of them takes an environment map; panes come from CampusMaterials.glass. */
export function createMiguelFinishes(textures: MiguelTextures): MiguelFinishes {
  const stucco = new MeshStandardMaterial({ color: '#ffffff', map: textures.stucco, bumpMap: textures.stuccoBump, bumpScale: .018, roughness: .92 })
  const roof = new MeshStandardMaterial({ color: '#b5c5bb', map: textures.roof, bumpMap: textures.roofBump, bumpScale: .045, roughness: .66, metalness: .08 })
  const red = new MeshStandardMaterial({ color: '#ffffff', map: textures.terracotta, bumpMap: textures.terracottaBump, bumpScale: .016, roughness: .94 })
  const paving = new MeshStandardMaterial({ color: '#ffffff', map: textures.paving, bumpMap: textures.pavingBump, bumpScale: .025, roughness: .86 })
  paving.userData.groundSurface = true
  return { miguelCream: stucco, tealRoof: roof, metalRoof: roof, hallRed: red, paving, entranceStone: paving }
}
