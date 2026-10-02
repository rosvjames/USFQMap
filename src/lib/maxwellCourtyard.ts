import type { Vec2 } from '../types'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
import { pointInPolygon } from './geo'

// Photo-based garden composition, fitted to the mapped space between the buildings.
// Local x follows Maxwell's facade; local z points out into the courtyard.
export const COURTYARD_OUTLINE: Vec2[] = [[-7.2, 7.6], [7.2, 7.6], [7.2, 22], [-7.2, 22]]
export const FOUNTAIN_CENTER: Vec2 = [0, 14.8]
const cornerGarden: Vec2[] = [[-6.3, 8.5], [-1.4, 8.5], [-1.4, 11.1], [-3.5, 13.1], [-6.3, 10.9]]
export const COURTYARD_GARDENS: Vec2[][] = [
  cornerGarden,
  cornerGarden.map(([x, z]) => [-x, z]),
  cornerGarden.map(([x, z]) => [x, 2 * FOUNTAIN_CENTER[1] - z]),
  cornerGarden.map(([x, z]) => [-x, 2 * FOUNTAIN_CENTER[1] - z]),
]
export const COURTYARD_PALMS: Vec2[] = [[-4.6, 9.7], [4.6, 9.7], [-4.6, 19.9], [4.6, 19.9]]
export const COURTYARD_WORLD_OUTLINE = COURTYARD_OUTLINE.map(maxwellToCampus)
export function isMaxwellCourtyard(point: Vec2): boolean {
  const dx = point[0] - MAXWELL_ENTRANCE.center[0], dy = point[1] - MAXWELL_ENTRANCE.center[1]
  const ux = Math.cos(MAXWELL_ENTRANCE.angle), uy = Math.sin(MAXWELL_ENTRANCE.angle)
  return pointInPolygon([dx * ux + dy * uy, dx * uy - dy * ux], COURTYARD_OUTLINE)
}
