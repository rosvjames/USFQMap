import { describe, expect, it } from 'vitest'
import { createRoofGeometry, createWalkwayGeometry, createTerrainShapes, createPavedShapes, createRoofBandGeometry } from './architecture'
import { ShapeGeometry } from 'three'
import { CAMPUS_BUILDINGS, findCampusBuilding } from './campus'
import type { Vec2 } from '../types'
import { ROOF_SKYLIGHTS } from '../data/siteAppearance'
import { pointInPolygon } from './geo'

describe('architectural surfaces', () => {
  it('places every satellite-referenced skylight within its building footprint', () => {
    for (const [id, skylights] of Object.entries(ROOF_SKYLIGHTS)) {
      const building = findCampusBuilding(id)!
      for (const skylight of skylights) for (const x of [-skylight.width / 2, skylight.width / 2]) for (const z of [-skylight.depth / 2, skylight.depth / 2]) {
        const point: Vec2 = [
          building.center[0] + skylight.offset[0] + x * Math.cos(skylight.angle) + z * Math.sin(skylight.angle),
          building.center[1] + skylight.offset[1] + x * Math.sin(skylight.angle) - z * Math.cos(skylight.angle),
        ]
        expect(pointInPolygon(point, building.ring), `${id}: skylight outside roof at ${point}`).toBe(true)
      }
    }
  })
  it('unites plaza paving while leaving buildings and water uncovered', () => {
    const shapes = createPavedShapes([
      [[0, 0], [8, 0], [8, 10], [0, 10]], [[4, 0], [10, 0], [10, 10], [4, 10]],
    ], [
      [[2, 2], [4, 2], [4, 4], [2, 4]], [[6, 6], [9, 6], [9, 9], [6, 9]],
    ])
    const geometry = new ShapeGeometry(shapes)
    const p = geometry.getAttribute('position'), index = geometry.index!
    let area = 0
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
      area += Math.abs((p.getX(b) - p.getX(a)) * (p.getY(c) - p.getY(a)) - (p.getY(b) - p.getY(a)) * (p.getX(c) - p.getX(a))) / 2
    }
    expect(area).toBeCloseTo(87)
    geometry.dispose()
  })

  it('keeps pitched roof bands inside Hayek without bridging its courtyard notch', () => {
    const ring: Vec2[] = [[0, 0], [10, 0], [10, 10], [7, 10], [7, 3], [3, 3], [3, 10], [0, 10], [0, 0]]
    const geometry = createRoofBandGeometry(ring, [3, 4, 5], 2, 14)
    const p = geometry.getAttribute('position'), index = geometry.index!
    expect(index.count).toBeGreaterThan(0)
    for (let i = 0; i < index.count; i += 3) {
      const ids = [0, 1, 2].map((offset) => index.getX(i + offset))
      const x = ids.reduce((s, id) => s + p.getX(id), 0) / 3
      const y = ids.reduce((s, id) => s - p.getZ(id), 0) / 3
      expect(x > 3 && x < 7 && y > 3).toBe(false)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(10)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(10)
    }
    geometry.dispose()
  })
  it('cuts overlapping recessed areas out of the ground without duplicate holes', () => {
    const shapes = createTerrainShapes([[0, 0], [10, 0], [10, 10], [0, 10]], [
      [[2, 2], [6, 2], [6, 6], [2, 6]], [[4, 4], [8, 4], [8, 8], [4, 8]],
    ])
    const mesh = new ShapeGeometry(shapes)
    const pos = mesh.getAttribute('position'), index = mesh.index!
    let area = 0
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
      area += Math.abs((pos.getX(b) - pos.getX(a)) * (pos.getY(c) - pos.getY(a)) - (pos.getY(b) - pos.getY(a)) * (pos.getX(c) - pos.getX(a))) / 2
    }
    expect(area).toBeCloseTo(72)
    mesh.dispose()
  })
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

  it('keeps the same tile alignment on crossing and reversed paths', () => {
    const paths = [
      createWalkwayGeometry([[0, 0], [10, 0]], 2.4, .55),
      createWalkwayGeometry([[5, -5], [5, 5]], 2.4, .55),
      createWalkwayGeometry([[10, 0], [0, 0]], 2.4, .55),
    ]
    for (const path of paths) {
      const p = path.getAttribute('position'), uv = path.getAttribute('uv')
      for (let i = 0; i < p.count; i++) {
        expect(uv.getX(i)).toBeCloseTo(p.getX(i) / 2.4)
        expect(uv.getY(i)).toBeCloseTo(-p.getZ(i) / 2.4)
      }
      path.dispose()
    }
  })
})
