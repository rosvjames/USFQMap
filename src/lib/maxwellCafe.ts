import type { Vec2 } from '../types'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
import { pointInPolygon } from './geo'
import { findCampusBuilding } from './campus'

// The photo is taken from the passage beside the dragon, looking into Maxwell's
// west notch. Measurements are illustrative; its perimeter follows the mapped walls.
export const CAFE_OUTLINE: Vec2[] = [[-37, -11.7], [-18.5, -10], [-18.5, 1.35], [-37.4, 0.3], [-37.4, -3.7]]
export const CAFE_TURF: Vec2[] = [[-34.3, -10.4], [-20, -9.1], [-20, -5.1], [-34.3, -5.1]]
export const CAFE_BUS = { center: [-27.4, -2.1] as Vec2, length: 8.8, width: 2.5 }
export const CAFE_OBELISK: Vec2 = [-34.6, -2.1]
export const CAFE_TABLES: Vec2[] = [[-31.7, -7.4], [-27.1, -7.2], [-22.6, -7]]
export const CAFE_PLANTERS: Vec2[] = [[-34.3, -4.5], [-29.4, -4.5], [-24.8, -4.5], [-20.2, -4.5]]
export const CAFE_WORLD_OUTLINE = CAFE_OUTLINE.map(maxwellToCampus)
const maxwell = findCampusBuilding('maxwell')!
export const CAFE_FACADE_HEIGHT = maxwell.heightMeters ?? maxwell.levels * 3.5
export function isMaxwellCafe(point: Vec2): boolean {
  const dx = point[0] - MAXWELL_ENTRANCE.center[0], dy = point[1] - MAXWELL_ENTRANCE.center[1]
  const ux = Math.cos(MAXWELL_ENTRANCE.angle), uy = Math.sin(MAXWELL_ENTRANCE.angle)
  return pointInPolygon([dx * ux + dy * uy, dx * uy - dy * ux], CAFE_OUTLINE)
}
