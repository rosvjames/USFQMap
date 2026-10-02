import { CAMPUS_WALKWAYS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

const building = findCampusBuilding('hayek')!
// The student identifies the facade reached by the elevated crossing. Use that
// mapped endpoint to anchor the photograph, instead of guessing from the centroid.
export const HAYEK_BRIDGE_END = CAMPUS_WALKWAYS.find(w => w.osmId === 'way/390625920')!.line[0]
const a = building.ring[26], b = building.ring[25]
const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
const ux = dx / length, uy = dy / length
const t = ((HAYEK_BRIDGE_END[0] - a[0]) * dx + (HAYEK_BRIDGE_END[1] - a[1]) * dy) / (length * length)
export const HAYEK_ENTRANCE = {
  center: [a[0] + dx * t, a[1] + dy * t] as Vec2,
  angle: Math.atan2(uy, ux), level: 6,
  // Looking at the facade, the small door sits just left of the bridge end.
  door: [-2, 1.2] as Vec2,
  portalX: -12.3,
  facadeHeight: building.heightMeters ?? building.levels * 3.5,
  facadeLength: length,
  facadeMidpoint: (0.5 - t) * length,
}
export const HAYEK_LANDING: Vec2[] = [[-21, 0], [19, 0], [19, 4.5], [-21, 4.5]]
// Floor numbering supplied by the student; this is building information, not an indoor plan.
export const HAYEK_LOWER_FLOORS = [
  { floor: 0, label: 'Ápice', use: 'Cafetería y punto de encuentro' },
  { floor: -1, label: 'Subsuelo 1', use: 'Aulas' },
  { floor: -2, label: 'Subsuelo 2', use: 'Aulas' },
] as const
export const HAYEK_APICE = { floor: 0, ground: .55, ceiling: HAYEK_ENTRANCE.level - .32, center: HAYEK_ENTRANCE.portalX, left: -20.8, right: 2.4 }
export function hayekToCampus([x, z]: Vec2): Vec2 {
  return [HAYEK_ENTRANCE.center[0] + ux * x + uy * z, HAYEK_ENTRANCE.center[1] + uy * x - ux * z]
}
export function hayekLandingHeightAt(point: Vec2): number | undefined {
  const dx = point[0] - HAYEK_ENTRANCE.center[0], dy = point[1] - HAYEK_ENTRANCE.center[1]
  if (pointInPolygon([dx * ux + dy * uy, dx * uy - dy * ux], HAYEK_LANDING)) return HAYEK_ENTRANCE.level
}
export function isHayekFrontEdge(start: Vec2, end: Vec2): boolean {
  return Math.hypot(start[0] - b[0], start[1] - b[1]) < 0.01 && Math.hypot(end[0] - a[0], end[1] - a[1]) < 0.01
}
