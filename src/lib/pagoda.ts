import { BufferGeometry, Float32BufferAttribute } from 'three'
import { findCampusBuilding } from './campus'
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
export const PAGODA_POND = [
  [-15.4, -3.8], [-13.8, -5.3], [-9.3, -5.5], [-8.8, -3.5],
  [-8.8, 3.8], [-10.3, 5.2], [-14.2, 4.4], [-15.5, 2.2],
].map((p) => pagodaToCampus(p as Vec2))

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
