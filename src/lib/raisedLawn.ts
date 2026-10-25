import { BufferGeometry, Float32BufferAttribute, type Shape } from 'three'
import { VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import type { Vec2 } from '../types'
import { CAMPUS_BUILDINGS, CAMPUS_WALKWAYS } from './campus'
import { createPavedShapes, createRoofGeometry, walkwayOutlines } from './architecture'
import { GALILEO_ENTRANCE, GALILEO_LAGOON, GALILEO_LAWNS, galileoLawnHeightAt } from './galileo'
import { NEWTON_ENTRANCE, NEWTON_LAWNS, newtonLawnHeightAt } from './newton'

export interface RaisedLawn {
  /** One sloped surface per clipped lawn island. */
  tops: BufferGeometry[]
  /** Vertical earth faces from every lawn edge down to the surrounding ground. */
  sides: BufferGeometry
}

/** Footway openings the lawns leave for the paved landscape (slightly wider than the paths themselves). */
export const LANDSCAPE_PATH_CUTOUTS: Vec2[][] = CAMPUS_WALKWAYS.filter(w => !w.bridge)
  .flatMap(w => walkwayOutlines(w.line, (w.mappedWidth ?? VISUAL_PATH_WIDTHS[w.osmId] ?? w.width) + .24))

const signedArea = (ring: Vec2[]) => ring.reduce((sum, a, i) => {
  const b = ring[(i + 1) % ring.length]
  return sum + a[0] * b[1] - b[0] * a[1]
}, 0) / 2

const openRing = (ring: { x: number; y: number }[]) => {
  const result = ring.map((p): Vec2 => [p.x, p.y])
  if (result.length > 1 && Math.hypot(result[0][0] - result.at(-1)![0], result[0][1] - result.at(-1)![1]) < .01) result.pop()
  return result
}

/** Outline and holes of a clipped shape, wound so the interior is on the left of every edge (outer counter-clockwise, holes clockwise). */
export function orientedRings(shape: Shape): { outer: Vec2[]; holes: Vec2[][]; oriented: Vec2[][] } {
  const points = shape.extractPoints(1), outer = openRing(points.shape), holes = points.holes.map(openRing)
  const oriented = [outer, ...holes].map((ring, i) => (signedArea(ring) > 0) === (i === 0) ? ring : ring.slice().reverse())
  return { outer, holes, oriented }
}

export interface EdgeWallOptions {
  /** Longest wall piece along an edge; pieces follow the heights sampled at their ends. Whole edges by default. */
  maxSegment?: number
  /** Decides per outline edge (interior on its left) whether it gets a wall, given its outward unit direction. */
  wanted?: (a: Vec2, b: Vec2, outward: Vec2) => boolean
}

/**
 * Vertical faces from each edge of `rings` (interior on the left) down to `base`, facing outwards. Pieces that
 * already sit on the base are skipped, and a piece with one end on the base is a single triangle, never a degenerate one.
 * Positions are in world axes (x, height, -y).
 */
export function createEdgeWalls(rings: Vec2[][], heightAt: (point: Vec2) => number, base: number, options: EdgeWallOptions = {}): BufferGeometry {
  const { maxSegment = Infinity, wanted = () => true } = options
  const vertices: number[] = [], uv: number[] = []
  for (const ring of rings) ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 1e-4 || !wanted(a, b, [(b[1] - a[1]) / length, -(b[0] - a[0]) / length])) return
    const count = Math.max(1, Math.ceil(length / maxSegment))
    const at = (j: number): Vec2 => [a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count]
    for (let j = 0; j < count; j++) {
      const p = at(j), q = at(j + 1), ph = heightAt(p), qh = heightAt(q), along = length / count * j, next = length / count * (j + 1)
      const wall: [Vec2, number, number][][] = []
      if (qh - base >= 1e-4) wall.push([[p, base, along], [q, base, next], [q, qh, next]])
      if (ph - base >= 1e-4) wall.push([[p, base, along], [q, qh, next], [p, ph, along]])
      for (const [point, y, u] of wall.flat()) { vertices.push(point[0], y, -point[1]); uv.push(u / 2.4, y / 2.4) }
    }
  })
  const walls = new BufferGeometry()
  walls.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  walls.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  walls.computeVertexNormals()
  return walls
}

/**
 * Lawn islands lifted by their own slope function, so every vertex (including clipped edges and intersections)
 * follows the same plane regardless of rounding. Edges standing above `base` get a closing wall.
 */
export function createRaisedLawn(regions: Vec2[][], obstacles: Vec2[][], heightAt: (point: Vec2) => number, base: number): RaisedLawn {
  const tops: BufferGeometry[] = [], rings: Vec2[][] = []
  for (const shape of createPavedShapes(regions, obstacles)) {
    const { outer, holes, oriented } = orientedRings(shape)
    const top = createRoofGeometry(outer, 0, 0, holes)
    const position = top.getAttribute('position')
    for (let i = 0; i < position.count; i++) position.setY(i, heightAt([position.getX(i), -position.getZ(i)]))
    top.computeVertexNormals()
    tops.push(top)
    rings.push(...oriented)
  }
  return { tops, sides: createEdgeWalls(rings, heightAt, base) }
}

export const createGalileoLawn = () => createRaisedLawn(GALILEO_LAWNS,
  [...CAMPUS_BUILDINGS.map(b => b.ring), ...LANDSCAPE_PATH_CUTOUTS, GALILEO_LAGOON.ring], galileoLawnHeightAt, GALILEO_ENTRANCE.ground)
export const createNewtonLawn = () => createRaisedLawn(NEWTON_LAWNS,
  [...CAMPUS_BUILDINGS.map(b => b.ring), ...LANDSCAPE_PATH_CUTOUTS], newtonLawnHeightAt, NEWTON_ENTRANCE.ground)
