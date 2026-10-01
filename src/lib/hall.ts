import { findCampusBuilding } from './campus'
import type { Vec2 } from '../types'

// This existing OSM edge faces the quadrangle. Dimensions of the entrance details
// are estimated from the user's photographs, not architectural measurements.
const hall = findCampusBuilding('hall-principal')!
const a = hall.ring.at(-3)!, b = hall.ring.at(-2)!
const length = Math.hypot(b[0] - a[0], b[1] - a[1])
const ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length
export const HALL_ENTRANCE = {
  center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Vec2,
  angle: Math.atan2(uy, ux),
  width: length,
  ground: 0.55,
  level: 1.57,
  platformFront: 4.9,
  stairFront: 7.9,
  stairWidth: 16.3,
  steps: 6,
}

/** Entrance-local coordinates: x along the facade; z outward into the quadrangle. */
export function hallToCampus([x, z]: Vec2): Vec2 {
  return [HALL_ENTRANCE.center[0] + ux * x + uy * z, HALL_ENTRANCE.center[1] + uy * x - ux * z]
}

export function campusToHall([x, y]: Vec2): Vec2 {
  const dx = x - HALL_ENTRANCE.center[0], dy = y - HALL_ENTRANCE.center[1]
  return [dx * ux + dy * uy, dx * uy - dy * ux]
}

export function hallEntranceHeightAt(point: Vec2): number | undefined {
  const [x, z] = campusToHall(point), h = HALL_ENTRANCE
  if (Math.abs(x) <= 9.4 && z >= 0 && z <= h.platformFront) return h.level
  if (Math.abs(x) <= h.stairWidth / 2 && z > h.platformFront && z <= h.stairFront) {
    return h.level + (h.ground - h.level) * (z - h.platformFront) / (h.stairFront - h.platformFront)
  }
}

export function isHallFrontEdge(start: Vec2, end: Vec2): boolean {
  return Math.hypot(start[0] - a[0], start[1] - a[1]) < 0.01 && Math.hypot(end[0] - b[0], end[1] - b[1]) < 0.01
}
