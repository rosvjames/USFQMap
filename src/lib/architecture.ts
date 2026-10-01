import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import type { Vec2 } from '../types'

function distanceToEdge(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** Continuous hipped surface, preserving concave outlines rather than filling their bounding box. */
export function createRoofGeometry(outline: Vec2[], height: number): BufferGeometry {
  const ring = outline.slice()
  if (ring.length > 1 && Math.hypot(ring[0][0] - ring.at(-1)![0], ring[0][1] - ring.at(-1)![1]) < 0.01) ring.pop()
  const faces = ShapeUtils.triangulateShape(ring.map(([x, y]) => new Vector2(x, y)), [])
  const vertices: number[] = [], uv: number[] = [], indices: number[] = []
  const shared = new Map<string, number>()
  function vertex(p: Vec2) {
    const key = `${p[0].toFixed(5)},${p[1].toFixed(5)}`
    let index = shared.get(key)
    if (index === undefined) {
      index = vertices.length / 3
      shared.set(key, index)
      const inset = Math.min(...ring.map((a, i) => distanceToEdge(p, a, ring[(i + 1) % ring.length])))
      vertices.push(p[0], height + 0.06 + Math.min(3.5, inset * 0.45), -p[1])
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
  faces.forEach(([a, b, c]) => triangle(ring[a], ring[b], ring[c], 4))
  const roof = new BufferGeometry()
  roof.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  roof.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  roof.setIndex(indices)
  roof.computeVertexNormals()
  return roof
}

/** Paving is a lit surface that receives shadows, instead of a screen-space line. */
export function createWalkwayGeometry(line: Vec2[], width: number, height: number): BufferGeometry {
  const vertices: number[] = [], uv: number[] = []
  let distance = 0
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i]
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
    if (length < 0.001) continue
    const nx = -dy / length * width / 2, ny = dx / length * width / 2
    const corners = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]]
    const coords = [[0, distance], [0, distance + length], [width, distance + length], [width, distance]]
    for (const index of [0, 1, 2, 0, 2, 3]) {
      vertices.push(corners[index][0], height, -corners[index][1])
      uv.push(coords[index][0] / 2.4, coords[index][1] / 2.4)
    }
    distance += length
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}
