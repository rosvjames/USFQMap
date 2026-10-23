import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeUtils, Vector2 } from 'three'
import polygonClipping from 'polygon-clipping'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec2 } from '../types'

/** Polygon strips let junctions be united before triangulation, rather than stacked. */
export function walkwayOutlines(line: Vec2[], width: number): Vec2[][] {
  const strips = line.slice(1).flatMap((b, i): Vec2[][] => {
    const a = line[i], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
    if (length < .001) return []
    const nx = -dy / length * width / 2, ny = dx / length * width / 2
    return [[[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]]]
  })
  const joins = line.slice(1, -1).map(([x, y]): Vec2[] => Array.from({ length: 16 }, (_, i) => [x + Math.cos(i * Math.PI / 8) * width / 2, y + Math.sin(i * Math.PI / 8) * width / 2]))
  return [...strips, ...joins]
}

export function shapesFromPolygons(polygons: polygonClipping.MultiPolygon): Shape[] {
  return polygons.map((polygon) => {
    const shape = new Shape(polygon[0].map(([x, y]) => new Vector2(x, y)))
    shape.holes = polygon.slice(1).map((ring) => new Path(ring.map(([x, y]) => new Vector2(x, y))))
    return shape
  })
}

export function createTerrainShapes(outline: Vec2[], cutouts: Vec2[][]): Shape[] {
  return shapesFromPolygons(polygonClipping.difference([outline], ...cutouts.map((ring) => [ring])))
}

/** Plazas overlap at junctions, but must never fill buildings, ponds or garden islands. */
export function createPavedShapes(outlines: Vec2[][], cutouts: Vec2[][]): Shape[] {
  if (!outlines.length) return []
  const polygons = outlines.map((ring) => [ring] as polygonClipping.Polygon)
  const paved = polygonClipping.union(polygons[0], ...polygons.slice(1))
  return shapesFromPolygons(polygonClipping.difference(paved, ...cutouts.map((ring) => [ring] as polygonClipping.Polygon)))
}

/** Narrow pitched sections beside a recessed courtyard, clipped to the actual building outline. */
export function createRoofBandGeometry(outline: Vec2[], edges: number[], width: number, height: number): BufferGeometry {
  const strips = edges.flatMap((i): polygonClipping.Polygon[] => {
    const a = outline[i], b = outline[(i + 1) % outline.length]
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
    if (length < 0.01) return []
    const nx = -dy / length * width, ny = dx / length * width
    return [[[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]]]
  })
  if (!strips.length) return new BufferGeometry()
  const clipped = polygonClipping.intersection([outline], polygonClipping.union(strips[0], ...strips.slice(1)))
  const pieces = clipped.map((polygon) => createRoofGeometry(polygon[0], height, 1.2, polygon.slice(1)))
  if (!pieces.length) return new BufferGeometry()
  const geometry = mergeGeometries(pieces)!
  pieces.forEach((piece) => piece.dispose())
  return geometry
}

function distanceToEdge(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** Continuous hipped surface, preserving concave outlines rather than filling their bounding box. */
export function createRoofGeometry(outline: Vec2[], height: number, maxRise = 3.5, holes: Vec2[][] = []): BufferGeometry {
  const rings = [outline, ...holes].map((input) => {
    const ring = input.slice()
    if (ring.length > 1 && Math.hypot(ring[0][0] - ring.at(-1)![0], ring[0][1] - ring.at(-1)![1]) < 0.01) ring.pop()
    return ring
  })
  const points = rings.flat()
  const faces = ShapeUtils.triangulateShape(rings[0].map(([x, y]) => new Vector2(x, y)), rings.slice(1).map((ring) => ring.map(([x, y]) => new Vector2(x, y))))
  const vertices: number[] = [], uv: number[] = [], indices: number[] = []
  const shared = new Map<string, number>()
  function vertex(p: Vec2) {
    const key = `${p[0].toFixed(5)},${p[1].toFixed(5)}`
    let index = shared.get(key)
    if (index === undefined) {
      index = vertices.length / 3
      shared.set(key, index)
      const inset = Math.min(...rings.flatMap((ring) => ring.map((a, i) => distanceToEdge(p, a, ring[(i + 1) % ring.length]))))
      vertices.push(p[0], height + 0.06 + Math.min(maxRise, inset * 0.45), -p[1])
      uv.push(p[0] / 2.4, p[1] / 2.4)
    }
    return index
  }
  const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  function triangle(a: Vec2, b: Vec2, c: Vec2, depth: number) {
    if (depth === 0) { indices.push(vertex(a), vertex(b), vertex(c)); return }
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
    triangle(a, ab, ca, depth - 1); triangle(ab, b, bc, depth - 1)
    triangle(ca, bc, c, depth - 1); triangle(ab, bc, ca, depth - 1)
  }
  faces.forEach(([a, b, c]) => triangle(points[a], points[b], points[c], 4))
  const roof = new BufferGeometry()
  roof.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  roof.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  roof.setIndex(indices)
  roof.computeVertexNormals()
  return roof
}

/** Paving is a lit surface that receives shadows, instead of a screen-space line. */
export function createWalkwayGeometry(line: Vec2[], width: number, height: number | ((point: Vec2) => number)): BufferGeometry {
  const vertices: number[] = [], uv: number[] = []
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i]
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
    if (length < 0.001) continue
    const nx = -dy / length * width / 2, ny = dx / length * width / 2
    const corners = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]]
    for (const index of [0, 1, 2, 0, 2, 3]) {
      vertices.push(corners[index][0], typeof height === 'function' ? height(corners[index] as Vec2) : height, -corners[index][1])
      uv.push(corners[index][0] / 2.4, corners[index][1] / 2.4)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}
