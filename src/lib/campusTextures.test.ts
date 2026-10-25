import { describe, expect, it } from 'vitest'
import { Group, Mesh, MeshPhysicalMaterial, NoColorSpace, SRGBColorSpace, ShapeGeometry, Shape, Texture } from 'three'
import {
  type CampusTextureSet, SHARED_SURFACES, SURFACE_ALIASES, SURFACE_FAMILIES, TEXTURE_MANIFEST, TILE_METERS, TINT_GAIN,
  UNTEXTURED_MATERIALS, WATER_COLOR_SPACE, WATER_SLOTS, WATER_TILE_METERS,
  allTextureRequests, familyRequests, maxAnisotropy, waterUrls,
} from './campusTextures'
import { createCampusMaterials, createSurfaceMaterial } from './materials'
import { batchStaticMeshes } from './staticBatch'
import { scaleUvToTiles } from './worldUv'

function fakeTextures(): CampusTextureSet {
  const families = Object.fromEntries(SURFACE_FAMILIES.map((family) => [family, { map: new Texture(), normalMap: new Texture(), roughnessMap: new Texture() }])) as CampusTextureSet['families']
  return { families, foliage: { tree: new Texture(), palm: new Texture() }, water: { map: new Texture(), normalMap: new Texture(), roughnessMap: new Texture() } }
}
/** The panorama belongs to the loader and is supplied only to the water. */
const reflection = new Texture()

describe('campus texture contract', () => {
  it('lists the sixteen families with the sizes and colour modes the manifest promises', () => {
    expect(Object.keys(TEXTURE_MANIFEST.assets).sort()).toEqual([...SURFACE_FAMILIES].sort())
    for (const family of SURFACE_FAMILIES) {
      const asset = TEXTURE_MANIFEST.assets[family]
      expect(['color', 'tint']).toContain(asset.colorMode)
      expect(asset.tileMeters).toEqual(family === 'bark' || family === 'palm-bark' ? [1.2, 2.4] : [2.4, 2.4])
    }
    for (const family of ['grass', 'sand', 'bark', 'palm-bark', 'soil', 'synthetic'] as const) expect(TEXTURE_MANIFEST.assets[family].colorMode).toBe('color')
    for (const family of ['paving', 'limestone', 'concrete', 'asphalt', 'stucco', 'brick', 'stone', 'wood', 'roof-tile', 'roof-metal'] as const) expect(TEXTURE_MANIFEST.assets[family].colorMode).toBe('tint')
  })

  it('serves the 512 px albedo to phones for the 1024 px families and never loads a 1024 px image there', () => {
    for (const family of SURFACE_FAMILIES) {
      const asset = TEXTURE_MANIFEST.assets[family], [desktop] = familyRequests(family, false), [mobile] = familyRequests(family, true)
      expect(desktop.url).toBe(asset.albedo)
      expect(mobile.url).toBe(asset.resolution === 1024 ? asset.mobileAlbedo : asset.albedo)
      if (asset.resolution === 1024) expect(asset.mobileAlbedo).toMatch(/-512\.webp$/)
    }
    expect(allTextureRequests(true)).toHaveLength(SURFACE_FAMILIES.length * 3)
    expect(maxAnisotropy(true, 16)).toBe(2)
    expect(maxAnisotropy(false, 16)).toBe(8)
    expect(maxAnisotropy(false, 4)).toBe(4)
  })

  it('serves the 512 px ripple normal to phones, keeps data maps linear and the tone sRGB', () => {
    expect(waterUrls(false).normalMap).toBe('/textures/water/pond-normal.webp')
    expect(waterUrls(true).normalMap).toBe('/textures/water/pond-normal-mobile.webp')
    for (const slot of ['map', 'roughnessMap'] as const) expect(waterUrls(true)[slot]).toBe(waterUrls(false)[slot])
    expect(new Set(WATER_SLOTS.map((slot) => waterUrls(true)[slot])).size).toBe(WATER_SLOTS.length)
    expect(WATER_COLOR_SPACE).toEqual({ map: SRGBColorSpace, normalMap: NoColorSpace, roughnessMap: NoColorSpace })
  })
})

describe('shared campus materials', () => {
  it('draws every shared surface from its own family and never shares images across families', () => {
    const textures = fakeTextures(), materials = createCampusMaterials(textures, reflection)
    for (const [key, spec] of Object.entries(SHARED_SURFACES)) {
      const material = materials[key as keyof typeof SHARED_SURFACES], family = textures.families[spec.family]
      expect(material.map, key).toBe(family.map)
      expect(material.normalMap, key).toBe(family.normalMap)
      expect(material.roughnessMap, key).toBe(family.roughnessMap)
      expect(material.bumpMap, key).toBeNull()
      expect(material.userData.surfaceFamily).toBe(spec.family)
    }
    expect(materials.garden).toBe(materials.grass)
    expect(Object.keys(SURFACE_ALIASES)).toEqual(['garden'])
    materials.dispose()
  })

  it('keeps water and glass free of wall and ground families', () => {
    const textures = fakeTextures(), materials = createCampusMaterials(textures, reflection)
    const familyImages = new Set(Object.values(textures.families).flatMap((family) => Object.values(family)))
    for (const key of UNTEXTURED_MATERIALS) {
      const material = materials[key]
      for (const image of [material.map, material.normalMap, material.roughnessMap]) expect(image && familyImages.has(image), key).toBeFalsy()
    }
    expect(materials.roofGlass.transparent).toBe(true)
    materials.dispose()
  })

  it('reuses plain glass without a reflection map or physical passes and releases it with its owner', () => {
    const materials = createCampusMaterials(fakeTextures(), reflection)
    const pane = materials.glass('#263936'), translucent = materials.glass('#f4f6f3', { opacity: .85 })
    expect(materials.glass('#263936')).toBe(pane)
    expect(translucent).not.toBe(pane)
    for (const material of [pane, translucent, materials.roofGlass]) {
      expect(material).not.toBeInstanceOf(MeshPhysicalMaterial)
      expect(material.envMap).toBeNull()
      expect(material.metalness).toBe(0)
      expect(material.roughness).toBeGreaterThanOrEqual(.5)
    }
    expect(pane.transparent).toBe(false)
    expect(translucent.transparent).toBe(true)
    let disposed = 0
    pane.addEventListener('dispose', () => disposed++)
    materials.dispose()
    expect(disposed).toBe(1)
  })

  it('makes pond water an opaque dielectric lit by ripple images, so it reflects with Fresnel and still batches', () => {
    const textures = fakeTextures(), materials = createCampusMaterials(textures, reflection)
    const water = materials.pondWater
    expect(water).toBeInstanceOf(MeshPhysicalMaterial)
    expect(water.metalness).toBe(0)
    expect(water.ior).toBeCloseTo(1.333)
    expect(water.transmission).toBe(0)
    expect(water.transparent).toBe(false)
    expect(water.map).toBe(textures.water.map)
    expect(water.normalMap).toBe(textures.water.normalMap)
    expect(water.roughnessMap).toBe(textures.water.roughnessMap)
    expect(water.bumpMap).toBeNull()
    expect(water.userData.worldUv).toBe(true)
    materials.dispose()
  })

  it('reserves the panorama for water and leaves building surfaces without an environment', () => {
    const materials = createCampusMaterials(fakeTextures(), reflection)
    const water = materials.pondWater
    // Only water receives an environment; buildings keep ordinary direct lighting.
    expect(water.envMap).toBe(reflection)
    expect(water.envMapIntensity).toBeGreaterThan(0)
    // Calm, not mirror-like: a smooth dielectric whose roughness image (about 0.9) leaves it between glossy and satin.
    expect(water.roughness * 0.9).toBeGreaterThan(0.1)
    expect(water.roughness * 0.9).toBeLessThan(0.3)
    for (const key of ['grass', 'paving', 'stucco', 'roofGlass'] as const) expect(materials[key].envMap, key).toBeNull()
    // The environment belongs to its loader: disposing the materials must not release it.
    let released = false
    reflection.addEventListener('dispose', () => { released = true })
    materials.dispose()
    expect(released).toBe(false)
  })

  it('gives ripples the same size in metres whether the water is batched or scaled by hand', () => {
    const textures = fakeTextures(), materials = createCampusMaterials(textures, reflection)
    const square = (size: number) => new ShapeGeometry(new Shape().moveTo(0, 0).lineTo(size, 0).lineTo(size, size).lineTo(0, size))
    // A 12 m square of water, 30 m east of the origin and with raw metre UVs, goes through the batcher like the lagoon;
    // the pagoda pond is not batched and scales its own UVs (it sits at the origin, so only the span is comparable).
    const batched = new Mesh(square(12), materials.pondWater), scaled = new Mesh(scaleUvToTiles(square(12)), materials.pondWater)
    for (const mesh of [batched, scaled]) mesh.rotation.x = -Math.PI / 2
    batched.position.x = 30
    const root = new Group(); root.add(batched)
    root.updateMatrixWorld(true)
    const result = batchStaticMeshes(root)
    expect(result.batches).toHaveLength(1)
    const span = (mesh: Mesh, slot: typeof WATER_SLOTS[number]) => {
      const uv = mesh.geometry.getAttribute('uv'), u = Array.from({ length: uv.count }, (_, i) => uv.getX(i) * textures.water[slot].repeat.x)
      return [Math.min(...u), Math.max(...u)]
    }
    for (const slot of WATER_SLOTS) {
      const metres = WATER_TILE_METERS[slot]
      expect(textures.water[slot].repeat.x).toBeCloseTo(TILE_METERS / metres)
      const [from, to] = span(result.batches[0], slot)
      expect(to - from).toBeCloseTo(12 / metres)
      expect(from).toBeCloseTo(30 / metres)
      const [handFrom, handTo] = span(scaled, slot)
      expect(handTo - handFrom).toBeCloseTo(to - from)
    }
    // Ripples must be larger than a metre-sized pattern and smaller than the lagoon.
    expect(WATER_TILE_METERS.normalMap).toBeGreaterThan(2)
    expect(WATER_TILE_METERS.map).toBeGreaterThan(WATER_TILE_METERS.normalMap)
    result.dispose(); scaled.geometry.dispose(); batched.geometry.dispose()
    materials.dispose()
  })

  it('modulates the palette once: tint families take the colour with a gain, colour families stay natural', () => {
    const textures = fakeTextures()
    const stucco = createSurfaceMaterial(textures.families.stucco, SHARED_SURFACES.cream)
    expect(stucco.color.r).toBeCloseTo(Math.min(1, (0xe4 / 255) ** 2.2) * TINT_GAIN, 1)
    const grass = createSurfaceMaterial(textures.families.grass, SHARED_SURFACES.grass)
    expect(grass.color.getHex()).toBe(0xffffff)
    // A colour family given a tone multiplies the natural albedo gently; it does not replace it.
    expect(createSurfaceMaterial(textures.families.grass, { family: 'grass', color: '#d3dba6', roughness: 1 }).color.r).toBeLessThan(1)
  })

  it('caches finishes by family, colour and options, and keeps trunk bark out of the world projection', () => {
    const materials = createCampusMaterials(fakeTextures(), reflection)
    const a = materials.surface('wood', '#62352d', { roughness: .9 })
    expect(materials.surface('wood', '#62352d', { roughness: .9 })).toBe(a)
    expect(materials.surface('wood', '#62352d', { roughness: .8 })).not.toBe(a)
    expect(materials.surface('stucco', '#62352d', { roughness: .9 }).map).not.toBe(a.map)
    expect(a.userData.worldUv).toBe(true)
    expect(materials.bark.userData.worldUv).toBeUndefined()
    expect(materials.palmBark.userData.surfaceFamily).toBe('palm-bark')
    materials.dispose()
  })

  it('offers a shader projection for instanced boxes without touching the shared material', () => {
    const materials = createCampusMaterials(fakeTextures(), reflection)
    const variant = materials.worldUv(materials.cream)
    expect(variant).not.toBe(materials.cream)
    expect(variant.map).toBe(materials.cream.map)
    expect(variant.normalMap).toBe(materials.cream.normalMap)
    expect(variant.userData.worldUvShader).toBe(true)
    expect(materials.cream.userData.worldUvShader).toBeUndefined()
    expect(materials.worldUv(materials.cream)).toBe(variant)
    expect(variant).not.toBeInstanceOf(MeshPhysicalMaterial)
    materials.dispose()
  })

  it('creates alpha-tested leaf materials that only brighten or dim the natural leaf colour', () => {
    const textures = fakeTextures(), materials = createCampusMaterials(textures, reflection)
    const leaf = materials.leaf('#bdc9aa'), palm = materials.leaf('#ffffff', 'palm')
    expect(materials.leaf('#bdc9aa')).toBe(leaf)
    expect(leaf.map).toBe(textures.foliage.tree)
    expect(palm.map).toBe(textures.foliage.palm)
    expect(leaf.alphaTest).toBeGreaterThan(0)
    expect(leaf.transparent).toBe(false)
    expect(leaf.side).toBe(2)
    materials.dispose()
  })
})
