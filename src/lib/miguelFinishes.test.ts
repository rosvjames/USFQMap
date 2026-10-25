import { describe, expect, it } from 'vitest'
import { EquirectangularReflectionMapping, MeshPhysicalMaterial, NoColorSpace, SRGBColorSpace, Texture } from 'three'
import { configureMiguelTextures, createMiguelFinishes, MIGUEL_TEXTURE_FILES, type MiguelTextures } from './miguelFinishes'

describe('Miguel textured finishes without window reflections', () => {
  it('keeps surface maps and linear relief while reserving the panorama for water', () => {
    const textures = Object.fromEntries(Object.keys(MIGUEL_TEXTURE_FILES).map(key => [key, new Texture()])) as MiguelTextures
    configureMiguelTextures(textures, 2)
    const finishes = createMiguelFinishes(textures)
    expect(finishes.miguelCream.map).toBe(textures.stucco)
    expect(finishes.miguelCream.bumpMap).toBe(textures.stuccoBump)
    expect(finishes.tealRoof.map).toBe(textures.roof)
    expect(finishes.hallRed.map).toBe(textures.terracotta)
    expect(finishes.paving.map).toBe(textures.paving)
    for (const finish of new Set(Object.values(finishes))) {
      expect(finish.envMap).toBeNull()
      expect(finish).not.toBeInstanceOf(MeshPhysicalMaterial)
      expect(finish.map?.colorSpace).toBe(SRGBColorSpace)
      expect(finish.bumpMap?.colorSpace).toBe(NoColorSpace)
      expect(finish.map?.anisotropy).toBe(2)
      finish.dispose()
    }
    expect(textures.reflections.mapping).toBe(EquirectangularReflectionMapping)
    Object.values(textures).forEach(texture => texture.dispose())
  })
})
