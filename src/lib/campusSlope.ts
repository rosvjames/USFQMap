import { BufferGeometry, Float32BufferAttribute } from 'three'
import { CAMPUS_WALKWAYS, findCampusBuilding } from './campus'
import type { Vec2 } from '../types'
import { COLISEO_LANE, coliseoLaneHeightAt, coliseoPlatformBaseAt } from './coliseo'

const pagoda = findCampusBuilding('pagoda')!
const a = pagoda.ring[0], b = pagoda.ring[1], c = pagoda.ring[2]
const width = Math.hypot(b[0] - a[0], b[1] - a[1])
const ux = (b[0] - a[0]) / width, uy = (b[1] - a[1]) / width
const center: Vec2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]
const entryX = -width / 2 - 7.5
// The campus ramp's ground endpoint, not the elevated crossing or Hayek facade.
const campusRamp = CAMPUS_WALKWAYS.find(way => way.osmId === 'way/1032704764')!
export const CAMPUS_SLOPE = {
  start: [center[0] + ux * entryX, center[1] + uy * entryX] as Vec2,
  end: campusRamp.line.at(-1)!,
  upperLevel: .55,
  // A visual estimate of the downhill fall supplied in the reference description;
  // these are relative model heights, not a surveyed topographic measurement.
  drop: 3.2,
  plateau: 14,
  upperHalfWidth: 32,
  lowerHalfWidth: 11,
  shoulder: 16,
  campusRampId: campusRamp.osmId,
}
const dx = CAMPUS_SLOPE.end[0] - CAMPUS_SLOPE.start[0]
const dy = CAMPUS_SLOPE.end[1] - CAMPUS_SLOPE.start[1]
const length = Math.hypot(dx, dy)
const smooth = (t: number) => { const s = Math.max(0, Math.min(1, t)); return s * s * (3 - 2 * s) }

/** Continuous local grade. Landmark floors, sports recesses and bridge decks override it. */
export function campusBaseHeightAt(point: Vec2): number {
  const px = point[0] - CAMPUS_SLOPE.start[0], py = point[1] - CAMPUS_SLOPE.start[1]
  const along = (px * dx + py * dy) / length
  const across = Math.abs((px * dy - py * dx) / length)
  const t = Math.max(0, Math.min(1, (along - CAMPUS_SLOPE.plateau) / (length - CAMPUS_SLOPE.plateau)))
  const halfWidth = CAMPUS_SLOPE.upperHalfWidth + (CAMPUS_SLOPE.lowerHalfWidth - CAMPUS_SLOPE.upperHalfWidth) * smooth(t)
  const side = 1 - smooth((across - halfWidth) / CAMPUS_SLOPE.shoulder)
  // Fade back into existing terrain beyond the approach; the crossing itself remains raised.
  const end = 1 - smooth((along - length - 4) / 16)
  const surrounding = CAMPUS_SLOPE.upperLevel - CAMPUS_SLOPE.drop * smooth(t) * side * end
  return coliseoPlatformBaseAt(point, coliseoLaneHeightAt(point, CAMPUS_SLOPE.upperLevel, CAMPUS_SLOPE.drop, surrounding))
}

export function campusSlopeOffsetAt(point: Vec2): number {
  return campusBaseHeightAt(point) - CAMPUS_SLOPE.upperLevel
}

/** Subdivide existing triangles before grading, preserving their pond/building holes.
 * Shape frame: x/y are map coordinates and z is mesh depth before -PI/2 rotation.
 * Scene frame: x/z are world coordinates and y is height. The input is left intact.
 */
export function createGradedSurfaceGeometry(input: BufferGeometry, frame: 'shape' | 'scene' = 'shape', maxEdge = 3): BufferGeometry {
  const position = input.getAttribute('position'), sourceUv = input.getAttribute('uv'), index = input.index
  const vertices: number[] = [], uvs: number[] = []
  type Vertex = { p: [number, number, number]; uv: Vec2 }
  const read = (i: number): Vertex => ({ p: [position.getX(i), position.getY(i), position.getZ(i)], uv: sourceUv ? [sourceUv.getX(i), sourceUv.getY(i)] : [position.getX(i) / 2.4, position.getY(i) / 2.4] })
  const map = (v: Vertex): Vec2 => frame === 'shape' ? [v.p[0], v.p[1]] : [v.p[0], -v.p[2]]
  const mid = (a: Vertex, b: Vertex): Vertex => ({ p: a.p.map((n, i) => (n + b.p[i]) / 2) as Vertex['p'], uv: [(a.uv[0] + b.uv[0]) / 2, (a.uv[1] + b.uv[1]) / 2] })
  const emit = (v: Vertex) => {
    const p = [...v.p], offset = campusSlopeOffsetAt(map(v))
    p[frame === 'shape' ? 2 : 1] += offset
    vertices.push(...p); uvs.push(...v.uv)
  }
  const bounds = {
    minX: Math.min(CAMPUS_SLOPE.start[0], ...COLISEO_LANE.map(p => p[0])) - 52,
    maxX: Math.max(CAMPUS_SLOPE.start[0], ...COLISEO_LANE.map(p => p[0])) + 52,
    minY: Math.min(CAMPUS_SLOPE.start[1], ...COLISEO_LANE.map(p => p[1])) - 52,
    maxY: Math.max(CAMPUS_SLOPE.start[1], ...COLISEO_LANE.map(p => p[1])) + 52,
  }
  const triangle = (a: Vertex, b: Vertex, c: Vertex, depth: number) => {
    const points = [a, b, c].map(map)
    const outside = Math.max(...points.map(p => p[0])) < bounds.minX || Math.min(...points.map(p => p[0])) > bounds.maxX || Math.max(...points.map(p => p[1])) < bounds.minY || Math.min(...points.map(p => p[1])) > bounds.maxY
    const longest = Math.max(...points.map((p, i) => Math.hypot(p[0] - points[(i + 1) % 3][0], p[1] - points[(i + 1) % 3][1])))
    if (outside || longest <= maxEdge || depth === 0) { emit(a); emit(b); emit(c); return }
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
    triangle(a, ab, ca, depth - 1); triangle(ab, b, bc, depth - 1)
    triangle(ca, bc, c, depth - 1); triangle(ab, bc, ca, depth - 1)
  }
  const count = index?.count ?? position.count
  for (let i = 0; i < count; i += 3) triangle(read(index?.getX(i) ?? i), read(index?.getX(i + 1) ?? i + 1), read(index?.getX(i + 2) ?? i + 2), 9)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}
