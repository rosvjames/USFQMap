import { BufferGeometry, Float32BufferAttribute } from 'three'
import { findCampusBuilding } from './campus'
import polygonClipping from 'polygon-clipping'
import { campusBaseHeightAt } from './campusSlope'
import type { Vec2 } from '../types'

// The rectangular pavilion and west entrance follow the existing OSM footprint.
// Heights and ornament are visual estimates from the three supplied photographs.
const building = findCampusBuilding('pagoda')!
const a = building.ring[0], b = building.ring[1], c = building.ring[2]
const width = Math.hypot(b[0] - a[0], b[1] - a[1])
const ux = (b[0] - a[0]) / width, uy = (b[1] - a[1]) / width
export const PAGODA = {
  center: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2] as Vec2,
  angle: Math.atan2(uy, ux),
  width, depth: Math.hypot(c[0] - b[0], c[1] - b[1]),
  floor: 1.4, eave: 4.45, ridge: 6.35,
}
export function pagodaToCampus([x, z]: Vec2): Vec2 {
  return [PAGODA.center[0] + ux * x + uy * z, PAGODA.center[1] + uy * x - ux * z]
}
export function campusToPagoda([x, y]: Vec2): Vec2 {
  const dx = x - PAGODA.center[0], dy = y - PAGODA.center[1]
  return [dx * ux + dy * uy, dx * uy - dy * ux]
}
export const PAGODA_STAIRS = {
  topX: -PAGODA.width / 2 - 4.15,
  bottomX: -PAGODA.width / 2 - 7.35,
  topWidth: 3.6, bottomWidth: 6.0, count: 8,
}
export const PAGODA_STAIR_FOOT = pagodaToCampus([PAGODA_STAIRS.bottomX, 0])
export const PAGODA_STAIR_LEVEL = campusBaseHeightAt(PAGODA_STAIR_FOOT)
export function pagodaStairWidthAt(t: number): number {
  return PAGODA_STAIRS.topWidth + (PAGODA_STAIRS.bottomWidth - PAGODA_STAIRS.topWidth) * t
}
// Match the eight widening stone blocks so graded lawns cannot poke through their treads.
export const PAGODA_STAIR_CUTOUTS: Vec2[][] = Array.from({ length: PAGODA_STAIRS.count }, (_, i) => {
  const run = (PAGODA_STAIRS.topX - PAGODA_STAIRS.bottomX) / PAGODA_STAIRS.count
  const high = PAGODA_STAIRS.topX - i * run + .003, low = high - run - .006
  const halfWidth = pagodaStairWidthAt((i + 1) / PAGODA_STAIRS.count) / 2
  return ([[high, -halfWidth], [high, halfWidth], [low, halfWidth], [low, -halfWidth]] as Vec2[]).map(pagodaToCampus)
})
export function isPagodaStairApproach([x, z]: Vec2, margin = 0): boolean {
  const t = (PAGODA_STAIRS.topX - x) / (PAGODA_STAIRS.topX - PAGODA_STAIRS.bottomX)
  return x <= PAGODA_STAIRS.topX + margin && x >= PAGODA_STAIRS.bottomX - margin && Math.abs(z) <= pagodaStairWidthAt(Math.max(0, Math.min(1, t))) / 2 + margin
}
export function pagodaEntranceHeightAt(point: Vec2): number | undefined {
  const [x, z] = campusToPagoda(point)
  if (isPagodaStairApproach([x, z])) {
    const t = Math.max(0, Math.min(1, (PAGODA_STAIRS.topX - x) / (PAGODA_STAIRS.topX - PAGODA_STAIRS.bottomX)))
    return PAGODA.floor + (PAGODA_STAIR_LEVEL - PAGODA.floor) * t
  }
  const bridgeEnd = -PAGODA.width / 2 + .1
  if (x >= PAGODA_STAIRS.topX && x <= bridgeEnd && Math.abs(z) <= 1.525) return pagodaBridgeHeight((x - PAGODA_STAIRS.topX) / (bridgeEnd - PAGODA_STAIRS.topX))
}

// Pond wraps the pavilion and bridge, with a dry notch beneath the stone stairs.
const pondOutline: Vec2[] = [
  [-15.4, -3.8], [-13.8, -5.3], [-11.5, -8], [-8, -9.3],
  [8.5, -9.2], [11.7, -8], [12.8, -4], [12.5, 4.8],
  [10.9, 8.4], [7.8, 9.1], [-8.7, 9.2], [-11.4, 7.1],
  [-14.2, 4.4], [-15.5, 2.2],
]
const stairNotch: Vec2[] = [
  [PAGODA_STAIRS.topX + .02, PAGODA_STAIRS.topWidth / 2 + .25],
  [PAGODA_STAIRS.bottomX - 1, PAGODA_STAIRS.bottomWidth / 2 + .4],
  [PAGODA_STAIRS.bottomX - 1, -PAGODA_STAIRS.bottomWidth / 2 - .4],
  [PAGODA_STAIRS.topX + .02, -PAGODA_STAIRS.topWidth / 2 - .25],
]
export const PAGODA_POND_OUTLINE = polygonClipping.difference([pondOutline], [stairNotch])[0][0] as Vec2[]
export const PAGODA_POND = PAGODA_POND_OUTLINE.map(pagodaToCampus)

/** Tapered side walls and their continuous green coping follow the stair descent. */
export function createPagodaStairWall(side: number, coping = false): BufferGeometry {
  const { topX, bottomX, topWidth, bottomWidth } = PAGODA_STAIRS
  const top = PAGODA.floor + .3, bottom = PAGODA_STAIR_LEVEL + .82
  const thickness = coping ? .44 : .34
  const sections = [[topX + .05, topWidth / 2 + .23, top, PAGODA.floor - .3], [bottomX - .25, bottomWidth / 2 + .23, bottom, PAGODA_STAIR_LEVEL - .15]]
  const points = sections.flatMap(([x, z, height, base]) => [
    [x, coping ? height + .12 : height, side * z - thickness / 2],
    [x, coping ? height + .12 : height, side * z + thickness / 2],
    [x, coping ? height : base, side * z - thickness / 2],
    [x, coping ? height : base, side * z + thickness / 2],
  ])
  const vertices: number[] = []
  for (const quad of [[0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3], [0, 1, 3, 2], [4, 6, 7, 5]]) {
    for (const i of [quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]]) vertices.push(...points[i])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}

export function pagodaBridgeHeight(t: number): number {
  return PAGODA.floor + 0.65 * Math.sin(Math.PI * t)
}

/** Four swept roof slopes meeting a short ridge; the eaves turn up at the corners. */
export function createPagodaRoof(): BufferGeometry {
  const hx = PAGODA.width / 2 + 1.5, hz = PAGODA.depth / 2 + 1.45
  const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]
  const ridge = [[-4.3, 0], [4.3, 0], [4.3, 0], [-4.3, 0]]
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  const columns = 48, rows = 20
  for (let side = 0; side < 4; side++) {
    const offset = positions.length / 3, next = (side + 1) % 4
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      const s = i / columns, t = j / rows * 0.99999
      const ex = corners[side][0] * (1 - s) + corners[next][0] * s
      const ez = corners[side][1] * (1 - s) + corners[next][1] * s
      const rx = ridge[side][0] * (1 - s) + ridge[next][0] * s
      const rz = ridge[side][1] * (1 - s) + ridge[next][1] * s
      const x = ex * (1 - t) + rx * t, z = ez * (1 - t) + rz * t
      const y = 4.12 + 2.23 * t ** 1.55 + (0.19 + 0.22 * Math.abs(2 * s - 1) ** 6) * (1 - t) ** 8
      positions.push(x, y, z); uvs.push(ex / 3 * (1 - t) + rx / 3 * t, ez / 3 * (1 - t) + rz / 3 * t)
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const k = offset + j * (columns + 1) + i
      indices.push(k, k + columns + 1, k + 1, k + 1, k + columns + 1, k + columns + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}
