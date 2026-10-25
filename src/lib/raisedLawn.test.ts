import { describe, expect, it } from 'vitest'
import { ShapeUtils, Vector2, type BufferGeometry } from 'three'
import type { Vec2 } from '../types'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon, pointInPolygonTolerant } from './geo'
import { createPavedShapes } from './architecture'
import { GALILEO_ENTRANCE, GALILEO_LAWNS, galileoHeightAt, galileoLawnHeightAt } from './galileo'
import { NEWTON_ENTRANCE, NEWTON_LAWNS, newtonHeightAt, newtonLawnHeightAt } from './newton'
import { PATH_LEVEL } from './terrain'
import { createCampusGroundShapes, createLandscapePavingGeometry, createLandscapePavingWalls, landscapeHeightAt } from './ground'
import { LANDSCAPE_PATH_CUTOUTS, createEdgeWalls, createGalileoLawn, createNewtonLawn, orientedRings, type RaisedLawn } from './raisedLawn'

const toMillimetres = ([x, y]: Vec2): Vec2 => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]
const f32 = ([x, y]: Vec2): Vec2 => [Math.fround(x), Math.fround(y)]
const positions = (geometry: BufferGeometry) => {
  const p = geometry.getAttribute('position')
  return Array.from({ length: p.count }, (_, i) => ({ point: [p.getX(i), -p.getZ(i)] as Vec2, y: p.getY(i) }))
}
const triangles = (geometry: BufferGeometry) => {
  const p = geometry.getAttribute('position'), index = geometry.index
  const count = index?.count ?? p.count
  const at = (i: number) => index?.getX(i) ?? i
  return Array.from({ length: count / 3 }, (_, t) => [0, 1, 2].map(k => at(t * 3 + k)))
}

const cases = [
  { name: 'Galileo', lawns: GALILEO_LAWNS, create: createGalileoLawn, plane: galileoLawnHeightAt, heightAt: galileoHeightAt, ground: GALILEO_ENTRANCE.ground, level: GALILEO_ENTRANCE.level, obstacles: () => [...CAMPUS_BUILDINGS.map(b => b.ring), ...LANDSCAPE_PATH_CUTOUTS], steepest: (GALILEO_ENTRANCE.level - GALILEO_ENTRANCE.ground) / 9 },
  { name: 'Newton', lawns: NEWTON_LAWNS, create: createNewtonLawn, plane: newtonLawnHeightAt, heightAt: newtonHeightAt, ground: NEWTON_ENTRANCE.ground, level: NEWTON_ENTRANCE.level, obstacles: () => [...CAMPUS_BUILDINGS.map(b => b.ring), ...LANDSCAPE_PATH_CUTOUTS], steepest: (NEWTON_ENTRANCE.level - NEWTON_ENTRANCE.ground) / 3 },
]

describe.each(cases)('$name raised lawn', ({ lawns, create, plane, heightAt, ground, level, obstacles, steepest }) => {
  const lawn: RaisedLawn = create()

  it('keeps every vertex on the lawn slope, also after Float32 and millimetre quantisation', () => {
    let checked = 0
    for (const top of lawn.tops) for (const { point, y } of positions(top)) {
      expect(y).toBeCloseTo(plane(point), 5)
      for (const quantised of [f32(point), toMillimetres(point)]) {
        // The terrain query must agree with the mesh even where the vertex sits on a clipped edge or intersection.
        expect(heightAt(quantised)).toBeDefined()
        expect(Math.abs(heightAt(quantised)! - y)).toBeLessThan(1e-3)
      }
      checked++
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('has no height jumps along any triangle edge', () => {
    for (const top of lawn.tops) {
      const vertices = positions(top)
      for (const [a, b, c] of triangles(top)) for (const [i, j] of [[a, b], [b, c], [c, a]]) {
        const length = Math.hypot(vertices[i].point[0] - vertices[j].point[0], vertices[i].point[1] - vertices[j].point[1])
        expect(Math.abs(vertices[i].y - vertices[j].y)).toBeLessThanOrEqual(steepest * length + 1e-4)
      }
    }
  })

  it('preserves footprint area, building and footway openings', () => {
    const expected = createPavedShapes(lawns, obstacles()).reduce((sum, shape) => {
      const { shape: outer, holes } = shape.extractPoints(1)
      return sum + Math.abs(ShapeUtils.area(outer)) - holes.reduce((s, hole) => s + Math.abs(ShapeUtils.area(hole)), 0)
    }, 0)
    let area = 0
    for (const top of lawn.tops) {
      const vertices = positions(top)
      for (const [a, b, c] of triangles(top)) {
        area += Math.abs(ShapeUtils.area([a, b, c].map(i => new Vector2(...vertices[i].point))))
        const centre: Vec2 = [0, 1].map(k => (vertices[a].point[k] + vertices[b].point[k] + vertices[c].point[k]) / 3) as Vec2
        expect(obstacles().some(ring => pointInPolygon(centre, ring))).toBe(false)
        expect(lawns.some(ring => pointInPolygon(centre, ring))).toBe(true)
      }
    }
    expect(area).toBeCloseTo(expected, 3)
  })

  it('closes every raised edge with outward, finite, vertical walls between the ground and the slope', () => {
    const side = positions(lawn.sides), normal = lawn.sides.getAttribute('normal')
    expect(side.length).toBeGreaterThan(0)
    expect(side.length % 3).toBe(0)
    for (const { y } of side) {
      expect(y).toBeGreaterThanOrEqual(ground - 1e-6)
      expect(y).toBeLessThanOrEqual(level + 1e-6)
    }
    const inTops = (p: Vec2) => lawn.tops.some(top => {
      const vertices = positions(top)
      return triangles(top).some(tri => {
        const [a, b, c] = tri.map(i => vertices[i].point)
        const sign = (p1: Vec2, p2: Vec2, p3: Vec2) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
        const d = [sign(p, a, b), sign(p, b, c), sign(p, c, a)]
        return !(d.some(v => v < -1e-9) && d.some(v => v > 1e-9))
      })
    })
    for (let i = 0; i < side.length; i += 3) {
      const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i)
      expect([nx, ny, nz].every(Number.isFinite)).toBe(true)
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5)
      expect(Math.abs(ny)).toBeLessThan(1e-6)
      const mid: Vec2 = [0, 1, 2].reduce((m, k) => [m[0] + side[i + k].point[0] / 3, m[1] + side[i + k].point[1] / 3], [0, 0]) as Vec2
      // Offset a centimetre along the face normal (campus y is -z): outwards is empty, inwards is lawn.
      expect(inTops([mid[0] + nx * .01, mid[1] - nz * .01])).toBe(false)
      expect(inTops([mid[0] - nx * .01, mid[1] + nz * .01])).toBe(true)
    }

    // Every outline edge that stands above the ground has a wall along it.
    const bases: [Vec2, Vec2][] = []
    for (let i = 0; i < side.length; i += 3) {
      const low = [0, 1, 2].filter(k => Math.abs(side[i + k].y - ground) < 1e-6).map(k => side[i + k].point)
      if (low.length === 2) bases.push([low[0], low[1]])
    }
    const distanceToBase = (p: Vec2) => Math.min(...bases.map(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
    }))
    let raisedEdges = 0
    for (const top of lawn.tops) {
      const vertices = positions(top), uses = new Map<string, [number, number, number]>()
      for (const tri of triangles(top)) for (const [i, j] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
        const key = `${Math.min(i, j)}:${Math.max(i, j)}`
        uses.set(key, [i, j, (uses.get(key)?.[2] ?? 0) + 1])
      }
      for (const [i, j, count] of uses.values()) {
        if (count !== 1) continue
        const mid: Vec2 = [(vertices[i].point[0] + vertices[j].point[0]) / 2, (vertices[i].point[1] + vertices[j].point[1]) / 2]
        if (plane(mid) - ground < 1e-3) continue
        raisedEdges++
        expect(distanceToBase(mid)).toBeLessThan(2e-3)
      }
    }
    expect(raisedEdges).toBeGreaterThan(0)
  })
})

describe('landscape paving next to the lawns', () => {
  const geometry = createLandscapePavingGeometry(createCampusGroundShapes().landscapePaving)
  const regions: { ring: Vec2[]; plane: (p: Vec2) => number }[] = [
    ...GALILEO_LAWNS.map(ring => ({ ring, plane: galileoLawnHeightAt })),
    ...NEWTON_LAWNS.map(ring => ({ ring, plane: newtonLawnHeightAt })),
  ]

  it('rises with the same slope as the lawn along every shared edge and corner', () => {
    const p = geometry.getAttribute('position')
    let shared = 0
    for (let i = 0; i < p.count; i++) {
      const point: Vec2 = [p.getX(i), p.getY(i)], height = p.getZ(i) + PATH_LEVEL
      const region = regions.find(r => pointInPolygonTolerant(point, r.ring, 3e-3))
      if (!region) continue
      shared++
      expect(Math.abs(height - region.plane(point))).toBeLessThan(2e-3)
    }
    expect(shared).toBeGreaterThan(50)
  })

  it('does not jump between neighbouring vertices of the same triangle', () => {
    const p = geometry.getAttribute('position')
    for (let i = 0; i < p.count; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const length = Math.hypot(p.getX(i + a) - p.getX(i + b), p.getY(i + a) - p.getY(i + b))
      // Steepest lawn plane is Newton's 0.2; allow the 1 m grading step and rounding.
      expect(Math.abs(p.getZ(i + a) - p.getZ(i + b))).toBeLessThanOrEqual(.2 * length + 2e-3)
    }
  })
})

const wallTriangles = (walls: BufferGeometry) => {
  const p = walls.getAttribute('position')
  return Array.from({ length: p.count / 3 }, (_, t) => [0, 1, 2].map(k => [p.getX(t * 3 + k), p.getY(t * 3 + k), p.getZ(t * 3 + k)] as [number, number, number]))
}
const triangleArea = ([a, b, c]: [number, number, number][]) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2
}

describe('createEdgeWalls', () => {
  const square: Vec2[] = [[0, 0], [2, 0], [2, 2], [0, 2]], base = 1
  const slope = (p: Vec2) => base + p[0] * .5

  it('emits one triangle where an end sits exactly on the base, and nothing where both do', () => {
    const triangles = wallTriangles(createEdgeWalls([square], slope, base))
    expect(triangles).toHaveLength(4)
    for (const t of triangles) expect(triangleArea(t)).toBeGreaterThan(1e-6)
  })
  it('splits edges into the requested pieces and honours the edge filter', () => {
    expect(wallTriangles(createEdgeWalls([square], slope, base, { maxSegment: 1 }))).toHaveLength(10)
    expect(wallTriangles(createEdgeWalls([square], slope, base, { wanted: () => false }))).toHaveLength(0)
  })
  it('faces away from the interior with finite unit normals', () => {
    const walls = createEdgeWalls([square], slope, base), normal = walls.getAttribute('normal'), position = walls.getAttribute('position')
    for (let i = 0; i < position.count; i += 3) {
      const mid: Vec2 = [(position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3, -(position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3]
      const out: Vec2 = [mid[0] + normal.getX(i) * .01, mid[1] - normal.getZ(i) * .01]
      expect(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))).toBeCloseTo(1, 5)
      expect(out[0] < 0 || out[0] > 2 || out[1] < 0 || out[1] > 2).toBe(true)
    }
  })
})

describe('landscape paving walls', () => {
  const shapes = createCampusGroundShapes().landscapePaving
  const walls = createLandscapePavingWalls(shapes)
  const triangles = wallTriangles(walls)
  const waterOrBuildings = [...CAMPUS_BUILDINGS.map(b => b.ring), ...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => a.ring)]
  const lawnRings = [...GALILEO_LAWNS, ...NEWTON_LAWNS]
  const onLawnOutline = (p: Vec2) => lawnRings.some(ring => ring.some((a, i) => {
    const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) < 3e-3
  }))

  // Walls are discovered from the triangles: base segments and the height standing over each of their ends.
  const column = (x: number, z: number) => `${x.toFixed(4)},${z.toFixed(4)}`
  const tops = new Map<string, number>()
  for (const t of triangles) for (const [x, y, z] of t) tops.set(column(x, z), Math.max(tops.get(column(x, z)) ?? -Infinity, y))
  const segments = triangles.flatMap(t => {
    const low = t.filter(v => v[1] <= PATH_LEVEL + 1e-4)
    return low.length === 2 ? [{ a: [low[0][0], -low[0][2]] as Vec2, b: [low[1][0], -low[1][2]] as Vec2, ah: tops.get(column(low[0][0], low[0][2]))!, bh: tops.get(column(low[1][0], low[1][2]))! }] : []
  })
  const wallAt = (p: Vec2) => {
    let best: { distance: number; height: number } | undefined
    for (const { a, b, ah, bh } of segments) {
      const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
      const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
      if (!best || distance < best.distance) best = { distance, height: ah + (bh - ah) * t }
    }
    return best
  }
  // Outline edges of the paving that run along a lawn's outer boundary and drop to level ground beside it.
  const exposedEdges = shapes.flatMap(shape => orientedRings(shape).oriented.flatMap(ring => ring.flatMap((a, i) => {
    const b = ring[(i + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const mid: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], probe: Vec2 = [mid[0] + (b[1] - a[1]) / length * .01, mid[1] - (b[0] - a[0]) / length * .01]
    const raised = (galileoHeightAt(mid) ?? newtonHeightAt(mid) ?? PATH_LEVEL) - PATH_LEVEL > .005
    const open = !lawnRings.some(r => pointInPolygon(probe, r)) && !waterOrBuildings.some(r => pointInPolygon(probe, r))
    return length > 1e-3 && raised && open && onLawnOutline(a) && onLawnOutline(b) && onLawnOutline(mid) ? [{ a, b, mid }] : []
  })))

  it('closes every raised outer edge down to PATH_LEVEL, at the height of the edge', () => {
    expect(exposedEdges.length).toBeGreaterThan(3)
    for (const { mid } of exposedEdges) {
      const wall = wallAt(mid)!
      expect(wall.distance).toBeLessThan(2e-3)
      expect(Math.abs(wall.height - landscapeHeightAt(mid))).toBeLessThan(3e-3)
    }
  })

  it('stands exactly under the upper edge of the paving mesh, whatever its segmentation', () => {
    const position = createLandscapePavingGeometry(shapes).getAttribute('position')
    let beside = 0
    for (let i = 0; i < position.count; i++) {
      const point: Vec2 = [position.getX(i), position.getY(i)], height = position.getZ(i) + PATH_LEVEL
      const edge = exposedEdges.find(({ a, b }) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)))
        return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy) < 1e-3
      })
      if (!edge || height - PATH_LEVEL < .005) continue
      beside++
      const wall = wallAt(point)!
      expect(wall.distance).toBeLessThan(2e-3)
      expect(Math.abs(wall.height - height)).toBeLessThan(3e-3)
    }
    expect(beside).toBeGreaterThan(10)
  })

  it('only follows lawn outlines, never buildings, water, the garden or the paths themselves', () => {
    expect(segments.length).toBeGreaterThan(0)
    for (const { a, b } of segments) {
      const mid: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      expect(onLawnOutline(mid)).toBe(true)
    }
  })

  it('is finite, non-degenerate, vertical and faces outwards from the paving', () => {
    const inPaving = (p: Vec2) => shapes.some(shape => {
      const { shape: outer, holes } = shape.extractPoints(1)
      const ring = (r: { x: number; y: number }[]) => r.map((v): Vec2 => [v.x, v.y])
      return pointInPolygon(p, ring(outer)) && !holes.some(hole => pointInPolygon(p, ring(hole)))
    })
    const normal = walls.getAttribute('normal')
    expect(triangles.length).toBeGreaterThan(0)
    triangles.forEach((t, k) => {
      expect(t.flat().every(Number.isFinite)).toBe(true)
      expect(triangleArea(t)).toBeGreaterThan(1e-6)
      for (const [, y] of t) {
        expect(y).toBeGreaterThanOrEqual(PATH_LEVEL - 1e-6)
        expect(y).toBeLessThanOrEqual(Math.max(GALILEO_ENTRANCE.level, NEWTON_ENTRANCE.level) + 1e-6)
      }
      const n = [normal.getX(k * 3), normal.getY(k * 3), normal.getZ(k * 3)]
      expect(Math.hypot(...n)).toBeCloseTo(1, 5)
      expect(Math.abs(n[1])).toBeLessThan(1e-6)
      const mid: Vec2 = [(t[0][0] + t[1][0] + t[2][0]) / 3, -(t[0][2] + t[1][2] + t[2][2]) / 3]
      expect(inPaving([mid[0] + n[0] * .01, mid[1] - n[2] * .01])).toBe(false)
      expect(inPaving([mid[0] - n[0] * .01, mid[1] + n[2] * .01])).toBe(true)
    })
  })
})
