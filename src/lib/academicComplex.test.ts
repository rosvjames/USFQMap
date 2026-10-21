import { describe, expect, it } from 'vitest'
import { ACADEMIC_COMPLEX_FLOORS } from '../data/academicComplexWalls'
import { ACADEMIC_COMPLEX, complexFloorElevation } from './academicComplex'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

const footprints = CAMPUS_BUILDINGS.filter((b) => ACADEMIC_COMPLEX.buildings.includes(b.info?.id ?? '') || ACADEMIC_COMPLEX.extraFootprints.includes(b.osmId)).map((b) => b.ring)
const middle = ([x0, y0, x1, y1]: number[]): Vec2 => [(x0 + x1) / 2, (y0 + y1) / 2]
function distanceToRing([x, y]: Vec2, ring: Vec2[]) {
  return Math.min(...ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t)
  }))
}
const area = (ring: Vec2[]) => Math.abs(ring.reduce((sum, a, i) => { const b = ring[(i + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1] }, 0)) / 2

describe('Galileo–Einstein–Darwin–Newton interior', () => {
  it('traces the three floors of the evacuation plans', () => {
    expect(ACADEMIC_COMPLEX.floors).toEqual([1, 2, 3])
    for (const floor of ACADEMIC_COMPLEX.floors) expect(ACADEMIC_COMPLEX_FLOORS[floor].walls.length).toBeGreaterThan(100)
    expect(complexFloorElevation(2) - complexFloorElevation(1)).toBeCloseTo(ACADEMIC_COMPLEX.storey, 9)
  })

  it('lands the georeferenced walls on the mapped footprints', () => {
    // The plans are fitted to satellite imagery, not to OSM; the two agree within a few metres.
    for (const floor of ACADEMIC_COMPLEX.floors) {
      const walls = ACADEMIC_COMPLEX_FLOORS[floor].walls
      const near = walls.filter((wall) => { const p = middle(wall); return footprints.some((ring) => pointInPolygon(p, ring) || distanceToRing(p, ring) < 4) })
      expect(near.length / walls.length).toBeGreaterThan(0.95)
    }
  })

  it('stacks the upper floors over the ground floor', () => {
    const ground = ACADEMIC_COMPLEX_FLOORS[1].slabs
    for (const floor of [2, 3]) {
      const walls = ACADEMIC_COMPLEX_FLOORS[floor].walls
      const over = walls.filter((wall) => ground.some((ring) => pointInPolygon(middle(wall), ring) || distanceToRing(middle(wall), ring) < 3))
      expect(over.length / walls.length).toBeGreaterThan(0.9)
    }
  })

  it('keeps wall thickness and plate sizes plausible', () => {
    for (const floor of ACADEMIC_COMPLEX.floors) {
      for (const [, , , , thickness] of ACADEMIC_COMPLEX_FLOORS[floor].walls) expect(thickness).toBeGreaterThanOrEqual(0.15), expect(thickness).toBeLessThanOrEqual(0.3)
      const plate = ACADEMIC_COMPLEX_FLOORS[floor].slabs.reduce((sum, ring) => sum + area(ring), 0)
      // The four mapped footprints cover about 4,000 m²; floor 3 only spans part of the complex.
      expect(plate).toBeGreaterThan(1200)
      expect(plate).toBeLessThan(6500)
    }
  })
})
