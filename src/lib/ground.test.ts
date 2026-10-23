import { describe, expect, it } from 'vitest'
import polygonClipping from 'polygon-clipping'
import { ShapeGeometry, type Shape } from 'three'
import { createCampusGroundShapes, LANDMARK_GROUND } from './ground'
import { walkwayOutlines } from './architecture'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS } from './campus'
import { TERRAIN_CUTOUTS, SPORT_ZONES } from './terrain'

function polygons(shapes: Shape[]): polygonClipping.MultiPolygon {
  return shapes.map(shape => {
    const { shape: outer, holes } = shape.extractPoints(1)
    return [outer, ...holes].map(ring => ring.map(p => [p.x, p.y] as polygonClipping.Pair))
  })
}
function area(polygons: polygonClipping.MultiPolygon) {
  return polygons.reduce((sum, polygon) => sum + polygon.reduce((total, ring, i) => total + (i ? -1 : 1) * Math.abs(ring.reduce((s, p, j) => {
    const q = ring[(j + 1) % ring.length]
    return s + p[0] * q[1] - q[0] * p[1]
  }, 0)) / 2, 0), 0)
}

describe('campus ground coverage', () => {
  it('has no overlapping grass, pavement, ponds, sports floors or landmark floors', () => {
    const { paving, grass } = createCampusGroundShapes()
    const paved = polygons(paving), lawns = polygons(grass)
    expect(area(polygonClipping.intersection(paved, lawns))).toBeLessThan(1e-6)
    const reserved = [
      ...CAMPUS_BUILDINGS.map(b => b.ring), ...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => a.ring),
      ...TERRAIN_CUTOUTS, ...SPORT_ZONES.map(zone => zone.area.ring), ...LANDMARK_GROUND,
    ]
    for (const ring of reserved) {
      // Ground boundaries are rounded to millimetres; allow only sub-millimetre edge slivers.
      const perimeter = ring.reduce((s, p, i) => s + Math.hypot(p[0] - ring[(i + 1) % ring.length][0], p[1] - ring[(i + 1) % ring.length][1]), 0)
      expect(area(polygonClipping.intersection(paved, [ring]))).toBeLessThan(perimeter * .001)
      expect(area(polygonClipping.intersection(lawns, [ring]))).toBeLessThan(perimeter * .001)
    }
    for (const shapes of [paving, grass]) {
      const g = new ShapeGeometry(shapes)
      expect(g.index!.count).toBeGreaterThan(0)
      expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true)
      g.dispose()
    }
  })

  it('joins paths at bends without filling the inside of the corner', () => {
    const strips = walkwayOutlines([[0, 0], [10, 0], [10, 0], [10, 10]], 2)
    const union = polygonClipping.union([strips[0]], ...strips.slice(1).map(r => [r]))
    expect(area(union)).toBeCloseTo(39.7654, 3)
  })
})
