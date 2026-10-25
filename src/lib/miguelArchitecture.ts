import polygonClipping from 'polygon-clipping'
import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, ShapeUtils, Vector2 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Vec2 } from '../types'
import { MIGUEL_VOLUMES, isMiguelExteriorEdge } from './miguel'
import { isMiguelGardenTowerFace, isMiguelGlazedGardenFace } from './miguelGarden'

export type MiguelWindow = { x: number; y: number; width: number; height: number }
export const MIGUEL_FACADES = MIGUEL_VOLUMES.flatMap((volume, index) => volume.ring.slice(1).map((b, edge) => {
  const a = volume.ring[edge], length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const kind = !isMiguelExteriorEdge(a, b) ? 'internal'
    : isMiguelGardenTowerFace(a, b) || (index === 1 && (a[1] + b[1]) / 2 > -39) ? 'tower'
    : isMiguelGlazedGardenFace(a, b) ? 'curtain' : 'windows'
  const count = Math.max(1, Math.floor(length / 4.7)), floors = Math.floor(volume.height / 3.5)
  const windows: MiguelWindow[] = kind === 'windows' && length > 2.4 ? Array.from({ length: floors }, (_, floor) =>
    Array.from({ length: count }, (_, col) => ({ x: -length / 2 + (col + .5) * length / count, y: floor * 3.5 + 1.98, width: 1.8, height: 2.25 }))).flat() : []
  return { a, b, length, height: volume.height, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), kind, windows }
}).filter(face => face.length > .1))

type Point = [number, number, number]
type Surface = { positions: number[]; uvs: number[]; colors: number[] }
const surface = (): Surface => ({ positions: [], uvs: [], colors: [] })
function quad(target: Surface, points: Point[], shade: number | ((p: Point) => number)) {
  for (const i of [0, 1, 2, 0, 2, 3]) {
    const p = points[i], light = typeof shade === 'number' ? shade : shade(p)
    target.positions.push(...p); target.uvs.push(p[0] / 2.4, p[1] / 2.4)
    target.colors.push(light, light, light)
  }
}
function geometry(data: Surface) {
  const result = new BufferGeometry()
  result.setAttribute('position', new Float32BufferAttribute(data.positions, 3))
  result.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2))
  result.setAttribute('color', new Float32BufferAttribute(data.colors, 3))
  result.computeVertexNormals()
  return result
}

/** Real apertures with 32 cm reveals; static corner/eave occlusion is baked into vertex colors. */
export function createRecessedMiguelWall(width: number, height: number, windows: MiguelWindow[], redBase = true) {
  const plaster = surface(), red = surface(), depth = .32
  const xs = [-width / 2, width / 2, ...Array.from({ length: Math.ceil(width) }, (_, i) => -width / 2 + i)]
  const ys = [0, height, 3.3, ...Array.from({ length: Math.ceil(height) }, (_, i) => i)]
  for (const w of windows) {
    for (const d of [-.25, 0, .25]) xs.push(w.x - w.width / 2 + d, w.x + w.width / 2 + d)
    ys.push(w.y - w.height / 2, w.y + w.height / 2, w.y + w.height / 2 + .2)
  }
  for (const y of [3.5, 7, height]) ys.push(y - .5, y - .15)
  const sorted = (values: number[], min: number, max: number) => [...new Set(values.filter(v => v >= min && v <= max).map(v => +v.toFixed(5)))].sort((a, b) => a - b)
  const xx = sorted(xs, -width / 2, width / 2), yy = sorted(ys, 0, height)
  const finish = (y: number) => redBase && y < 3.3 ? red : plaster
  const occlusion = ([x, y]: Point) => {
    let light = 1 - .3 * Math.exp(-(height - y) / .35) - .09 * Math.exp(-(width / 2 - Math.abs(x)) / .22)
    for (const level of [3.5, 7]) if (y < level) light -= .15 * Math.exp(-(level - y) / .15)
    for (const w of windows) {
      const distance = Math.hypot(Math.max(0, Math.abs(x - w.x) - w.width / 2), Math.max(0, Math.abs(y - w.y) - w.height / 2))
      light -= .18 * Math.exp(-distance / .13)
    }
    return Math.max(.48, light)
  }
  for (let i = 1; i < xx.length; i++) for (let j = 1; j < yy.length; j++) {
    const x0 = xx[i - 1], x1 = xx[i], y0 = yy[j - 1], y1 = yy[j], x = (x0 + x1) / 2, y = (y0 + y1) / 2
    if (windows.some(w => Math.abs(x - w.x) < w.width / 2 && Math.abs(y - w.y) < w.height / 2)) continue
    quad(finish(y), [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], occlusion)
  }
  for (const w of windows) {
    const l = w.x - w.width / 2, r = w.x + w.width / 2, b = w.y - w.height / 2, t = w.y + w.height / 2, target = finish(w.y)
    quad(target, [[l, b, 0], [l, t, 0], [l, t, -depth], [l, b, -depth]], .68)
    quad(target, [[r, t, 0], [r, b, 0], [r, b, -depth], [r, t, -depth]], .68)
    quad(target, [[l, t, 0], [r, t, 0], [r, t, -depth], [l, t, -depth]], .56)
    quad(target, [[r, b, 0], [l, b, 0], [l, b, -depth], [r, b, -depth]], .86)
  }
  return { plaster: geometry(plaster), terracotta: geometry(red) }
}

export function createMiguelBuildingGeometry() {
  const plaster: BufferGeometry[] = [], terracotta: BufferGeometry[] = []
  for (const face of MIGUEL_FACADES) {
    const parts = createRecessedMiguelWall(face.length, face.height, face.windows, face.kind === 'windows')
    for (const [name, part] of Object.entries(parts)) {
      part.rotateY(face.angle).translate((face.a[0] + face.b[0]) / 2, 0, -(face.a[1] + face.b[1]) / 2)
      if (part.getAttribute('position').count) (name === 'plaster' ? plaster : terracotta).push(part)
      else part.dispose()
    }
  }
  for (const volume of MIGUEL_VOLUMES) {
    const cap = new ShapeGeometry(new Shape(volume.ring.map(([x, y]) => new Vector2(x, y)))).toNonIndexed()
    cap.rotateX(-Math.PI / 2).translate(0, volume.height, 0)
    cap.setAttribute('color', new Float32BufferAttribute(Array(cap.getAttribute('position').count * 3).fill(1), 3))
    plaster.push(cap)
  }
  const result = { plaster: mergeGeometries(plaster)!, terracotta: mergeGeometries(terracotta)! }
  ;[...plaster, ...terracotta].forEach(part => part.dispose())
  return result
}

/** Clip the footprint into exact planar hip faces, keeping the garden shaft open. */
export function createPlanarMiguelRoof(outline: Vec2[], height: number, rise: number, holes: Vec2[][] = []) {
  const ring = outline.slice(), roof = surface(), fascia = surface()
  if (Math.hypot(ring[0][0] - ring.at(-1)![0], ring[0][1] - ring.at(-1)![1]) < .001) ring.pop()
  const edge = ring.map((a, i) => ({ a, b: ring[(i + 1) % ring.length] })).sort((a, b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) - Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]))[0]
  const angle = Math.atan2(edge.b[1] - edge.a[1], edge.b[0] - edge.a[0]), c = Math.cos(angle), s = Math.sin(angle)
  const local = ([x, y]: Vec2): Vec2 => [x * c + y * s, -x * s + y * c]
  const world = ([x, y]: Vec2): Vec2 => [x * c - y * s, x * s + y * c]
  const rings = [ring, ...holes].map(r => r.map(local)), all = rings[0]
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0])), minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]))
  const planes = [[.45, 0, -minX * .45], [-.45, 0, maxX * .45], [0, .45, -minY * .45], [0, -.45, maxY * .45], [0, 0, rise]]
  const value = (p: number[], [x, y]: Vec2) => p[0] * x + p[1] * y + p[2]
  for (const [index, plane] of planes.entries()) {
    let region: Vec2[] = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]]
    for (const other of planes) {
      const clipped: Vec2[] = []
      region.forEach((a, i) => {
        const b = region[(i + 1) % region.length], da = value(plane, a) - value(other, a), db = value(plane, b) - value(other, b)
        if (da <= 1e-8) clipped.push(a)
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); clipped.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]) }
      })
      region = clipped
    }
    if (region.length < 3) continue
    for (const polygon of polygonClipping.intersection(rings, [region])) {
      const loops = polygon.map(r => r.slice(0, -1) as Vec2[]), points = loops.flat()
      const triangles = ShapeUtils.triangulateShape(loops[0].map(p => new Vector2(...p)), loops.slice(1).map(r => r.map(p => new Vector2(...p))))
      for (const triangle of triangles) for (const i of triangle) {
        const p = points[i], [x, y] = world(p)
        roof.positions.push(x, height + .06 + Math.max(0, value(plane, p)), -y)
        roof.uvs.push((index < 2 ? p[1] : p[0]) / 2.4, (index < 2 ? p[0] : p[1]) / 2.4)
        roof.colors.push(1, 1, 1)
      }
    }
  }
  for (const loop of [ring, ...holes]) loop.forEach((a, i) => {
    const b = loop[(i + 1) % loop.length], count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .4))
    for (let j = 0; j < count; j++) {
      const p: Vec2 = [a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count]
      const q: Vec2 = [a[0] + (b[0] - a[0]) * (j + 1) / count, a[1] + (b[1] - a[1]) * (j + 1) / count]
      const top = (v: Vec2) => height + .06 + Math.max(0, Math.min(...planes.map(plane => value(plane, local(v)))))
      quad(fascia, [[p[0], height - .12, -p[1]], [q[0], height - .12, -q[1]], [q[0], top(q), -q[1]], [p[0], top(p), -p[1]]], .9)
    }
  })
  return { roof: geometry(roof), fascia: geometry(fascia) }
}
