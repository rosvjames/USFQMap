import { describe, expect, it } from 'vitest'
import { createRoofGeometry, createWalkwayGeometry } from './architecture'
import { CAMPUS_BUILDINGS } from './campus'
import type { Vec2 } from '../types'

describe('architectural surfaces', () => {
  it('keeps concave roof footprints and courtyard notches intact', () => {
    const ring: Vec2[] = [[0, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10], [0, 0]]
    const roof = createRoofGeometry(ring, 7)
    const position = roof.getAttribute('position')
    const indices = roof.index!
    let area = 0
    for (let i = 0; i < indices.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map((offset) => indices.getX(i + offset))
      area += Math.abs((position.getX(b) - position.getX(a)) * (position.getZ(c) - position.getZ(a)) - (position.getZ(b) - position.getZ(a)) * (position.getX(c) - position.getX(a))) / 2
    }
    expect(area).toBeCloseTo(72, 4)
    for (let i = 0; i < position.count; i++) {
      expect(position.getY(i)).toBeGreaterThanOrEqual(7)
      expect(position.getY(i)).toBeLessThanOrEqual(10.6)
    }
    roof.dispose()
  })

  it('renders every mapped campus roof with finite normals and texture coordinates', () => {
    for (const building of CAMPUS_BUILDINGS.filter((b) => b.onCampus)) {
      const roof = createRoofGeometry(building.ring, building.levels * 3.5)
      for (const name of ['position', 'normal', 'uv']) {
        expect(Array.from(roof.getAttribute(name).array).every(Number.isFinite), `${building.osmId}: ${name}`).toBe(true)
      }
      expect(roof.index!.count).toBeGreaterThan(0)
      roof.dispose()
    }
  })

  it('gives paved paths physical width and ignores duplicate points', () => {
    const surface = createWalkwayGeometry([[0, 0], [0, 0], [10, 0]], 2.6, 0.55)
    const p = surface.getAttribute('position')
    expect(p.count).toBe(6)
    expect(Math.max(...Array.from({ length: p.count }, (_, i) => p.getZ(i)))).toBeCloseTo(1.3)
    expect(Math.min(...Array.from({ length: p.count }, (_, i) => p.getZ(i)))).toBeCloseTo(-1.3)
    expect(Array.from(surface.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
    surface.dispose()
  })
})
