import { describe, expect, it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { maxwellToCampus } from './maxwell'
import { COURTYARD_OUTLINE, COURTYARD_GARDENS, COURTYARD_PALMS, FOUNTAIN_CENTER } from './maxwellCourtyard'
import { createDragonWingGeometry } from './dragon'

describe('photo-referenced Maxwell courtyard', () => {
  it('fits gardens, fountain and palms into the open space between the actual buildings', () => {
    for (const point of [...COURTYARD_OUTLINE, ...COURTYARD_GARDENS.flat(), ...COURTYARD_PALMS, FOUNTAIN_CENTER]) {
      const world = maxwellToCampus(point)
      expect(CAMPUS_BUILDINGS.some((building) => pointInPolygon(world, building.ring)), `inside a building: ${point}`).toBe(false)
    }
    for (const garden of COURTYARD_GARDENS) for (const point of garden) {
      expect(point[1]).toBeGreaterThan(5)
      expect(Math.abs(point[0])).toBeGreaterThan(1)
    }
  })

  it('keeps the doorway approach and paths beside the central fountain open', () => {
    for (const point of [[0, 6], [0, 10], [-3.5, 14.8], [3.5, 14.8]] as [number, number][]) {
      expect(COURTYARD_GARDENS.some((garden) => pointInPolygon(point, garden))).toBe(false)
    }
    expect(FOUNTAIN_CENTER[0]).toBe(0)
    expect(FOUNTAIN_CENTER[1]).toBeGreaterThan(12)
  })
  it('centers the fountain in a square and mirrors the four corner gardens and palms', () => {
    const xs = COURTYARD_OUTLINE.map(([x]) => x), zs = COURTYARD_OUTLINE.map(([, z]) => z)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(Math.max(...zs) - Math.min(...zs))
    expect(FOUNTAIN_CENTER).toEqual([0, (Math.max(...zs) + Math.min(...zs)) / 2])
    for (const point of COURTYARD_GARDENS[0]) {
      expect(COURTYARD_GARDENS[1]).toContainEqual([-point[0], point[1]])
      expect(COURTYARD_GARDENS[2]).toContainEqual([point[0], 2 * FOUNTAIN_CENTER[1] - point[1]])
      expect(COURTYARD_GARDENS[3]).toContainEqual([-point[0], 2 * FOUNTAIN_CENTER[1] - point[1]])
    }
    expect(COURTYARD_PALMS[0][0]).toBe(-COURTYARD_PALMS[1][0])
    expect(COURTYARD_PALMS[0][1] + COURTYARD_PALMS[2][1]).toBeCloseTo(2 * FOUNTAIN_CENTER[1])
  })
})

describe('Maxwell roof dragon', () => {
  it('gives its two bat wings mirrored silhouettes and finite geometry within budget', () => {
    const left = createDragonWingGeometry(-1), right = createDragonWingGeometry(1)
    left.computeBoundingBox(); right.computeBoundingBox()
    expect(left.boundingBox!.min.x).toBeCloseTo(-right.boundingBox!.max.x)
    expect(right.boundingBox!.max.x).toBeGreaterThan(8)
    expect(right.boundingBox!.max.y - right.boundingBox!.min.y).toBeGreaterThan(2.5)
    for (const geometry of [left, right]) {
      expect(geometry.getAttribute('position').count).toBeLessThan(3000)
      for (const attribute of ['position', 'normal']) expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true)
      geometry.dispose()
    }
  })
})
