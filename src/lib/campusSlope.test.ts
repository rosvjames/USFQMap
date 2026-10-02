import { describe, expect, it } from 'vitest'
import { Path, Shape, ShapeGeometry, Vector2 } from 'three'
import { CAMPUS_SLOPE, campusBaseHeightAt, campusSlopeOffsetAt, createGradedSurfaceGeometry } from './campusSlope'
import { ELEVATED_WALKWAYS, SPORT_ZONES, bridgeVertexHeight, terrainHeightAt } from './terrain'
import { PAGODA, PAGODA_POND, PAGODA_STAIRS, PAGODA_STAIR_LEVEL, PAGODA_STAIR_FOOT, pagodaToCampus, pagodaStairWidthAt, createPagodaStairWall } from './pagoda'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

const at = (t: number): Vec2 => [CAMPUS_SLOPE.start[0] + (CAMPUS_SLOPE.end[0] - CAMPUS_SLOPE.start[0]) * t, CAMPUS_SLOPE.start[1] + (CAMPUS_SLOPE.end[1] - CAMPUS_SLOPE.start[1]) * t]

describe('Pagoda to campus-side bridge grade', () => {
  it('descends continuously from the original Pagoda approach to the mapped ramp foot', () => {
    expect(campusBaseHeightAt(PAGODA_STAIR_FOOT)).toBeCloseTo(.55)
    expect(campusBaseHeightAt(CAMPUS_SLOPE.end)).toBeCloseTo(.55 - CAMPUS_SLOPE.drop)
    let previous = campusBaseHeightAt(at(0))
    for (let i = 1; i <= 1000; i++) {
      const height = campusBaseHeightAt(at(i / 1000))
      expect(height).toBeLessThanOrEqual(previous)
      expect(previous - height).toBeLessThan(.01)
      previous = height
    }
    const epsilon = 1e-4
    expect(Math.abs(campusBaseHeightAt(at(1 - epsilon)) - campusBaseHeightAt(at(1 + epsilon)))).toBeLessThan(1e-4)
  })
  it('joins the campus ramp ground endpoint without changing any deck or far ramp level', () => {
    for (const way of ELEVATED_WALKWAYS) way.line.forEach((point, i) => {
      const last = i === way.line.length - 1
      const ramp = ['way/1032704764', 'way/1032704766'].includes(way.osmId)
      const expected = last && ramp ? way.osmId === CAMPUS_SLOPE.campusRampId ? campusBaseHeightAt(point) : .55 : 6
      expect(bridgeVertexHeight(way, i)).toBeCloseTo(expected)
      expect(terrainHeightAt(point)).toBeCloseTo(expected)
    })
  })
  it('keeps the grade local and retains sport recess precedence', () => {
    for (const p of [[0, 90], [60, 95], [-80, -30], [150, -100]] as Vec2[]) expect(campusSlopeOffsetAt(p)).toBe(0)
    for (const zone of SPORT_ZONES) {
      const ring = zone.area.ring
      const center: Vec2 = [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length]
      expect(terrainHeightAt(center)).toBeCloseTo(zone.height)
    }
  })
  it('keeps stairs dry, widens treads, and descends to the shared approach level', () => {
    const { topX, bottomX, count } = PAGODA_STAIRS
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = topX + (bottomX - topX) * t
      for (const side of [-.48, 0, .48]) {
        const point = pagodaToCampus([x, side * pagodaStairWidthAt(t)])
        expect(pointInPolygon(point, PAGODA_POND)).toBe(false)
        expect(terrainHeightAt(point)).toBeCloseTo(PAGODA.floor + (PAGODA_STAIR_LEVEL - PAGODA.floor) * t)
      }
    }
    expect(terrainHeightAt(PAGODA_STAIR_FOOT)).toBeCloseTo(campusBaseHeightAt(PAGODA_STAIR_FOOT))
    expect(pagodaStairWidthAt(1)).toBeGreaterThan(pagodaStairWidthAt(0))
    for (const side of [-1, 1]) {
      const geometry = createPagodaStairWall(side, true), p = geometry.getAttribute('position')
      const high = Array.from({ length: p.count }, (_, i) => p.getX(i) > topX ? p.getY(i) : 0)
      const low = Array.from({ length: p.count }, (_, i) => p.getX(i) < bottomX ? p.getY(i) : 0)
      expect(Math.max(...high)).toBeGreaterThan(Math.max(...low))
      geometry.dispose()
    }
  })
  it('densifies the surface and evaluates grade inside original triangles', () => {
    const shape = new Shape([CAMPUS_SLOPE.start, CAMPUS_SLOPE.end, [CAMPUS_SLOPE.end[0] + 8, CAMPUS_SLOPE.end[1]]].map(p => new Vector2(...p)))
    const flat = new ShapeGeometry(shape), graded = createGradedSurfaceGeometry(flat)
    const p = graded.getAttribute('position')
    expect(p.count).toBeGreaterThan(flat.getAttribute('position').count)
    for (let i = 0; i < p.count; i++) expect(p.getZ(i)).toBeCloseTo(campusSlopeOffsetAt([p.getX(i), p.getY(i)]), 5)
    expect(flat.getAttribute('position').getZ(0)).toBe(0)
    flat.dispose(); graded.dispose()
  })
  it('preserves holes when subdividing a graded plaza', () => {
    const [x, y] = at(.5)
    const outline: Vec2[] = [[x - 10, y - 10], [x + 10, y - 10], [x + 10, y + 10], [x - 10, y + 10]]
    const hole: Vec2[] = [[x - 2, y - 2], [x - 2, y + 2], [x + 2, y + 2], [x + 2, y - 2]]
    const shape = new Shape(outline.map(p => new Vector2(...p)))
    shape.holes.push(new Path(hole.map(p => new Vector2(...p))))
    const flat = new ShapeGeometry(shape), graded = createGradedSurfaceGeometry(flat)
    const p = graded.getAttribute('position')
    for (let i = 0; i < p.count; i += 3) {
      const centroid: Vec2 = [(p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3]
      expect(pointInPolygon(centroid, outline)).toBe(true)
      expect(pointInPolygon(centroid, hole)).toBe(false)
    }
    flat.dispose(); graded.dispose()
  })

})
