import { describe, expect, it } from 'vitest'
import { createSculptureGeometry } from './sculptures'

describe('local sculpture meshes', () => {
  it('represents the small Maxwell lions reclining in pale stone', () => {
    const geometry = createSculptureGeometry('reclining-lion', 48)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.y).toBeLessThan(0.9)
    expect(box.max.z - box.min.z).toBeGreaterThan(1.5)
    expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true)
    geometry.dispose()
  })
  it('builds complete figures with finite normals within the rendering budget', () => {
    for (const kind of ['david', 'lion'] as const) {
      const geometry = createSculptureGeometry(kind)
      const position = geometry.getAttribute('position')
      expect(position.count).toBeGreaterThan(1000)
      expect(position.count).toBeLessThan(135000)
      for (const name of ['position', 'normal', 'color']) expect(Array.from(geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
      geometry.computeBoundingBox()
      expect(geometry.boundingBox!.min.y).toBeLessThan(0.05)
      expect(geometry.boundingBox!.max.y).toBeGreaterThan(kind === 'david' ? 1.86 : 1.18)
      geometry.dispose()
    }
  })
})
