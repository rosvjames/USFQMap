import { ExtrudeGeometry, Shape } from 'three'
import { findCampusBuilding } from './campus'
import type { Vec2 } from '../types'

// User identified the west facade facing the Darwin/Galileo courtyard in the map screenshot.
// Its middle is an approximate anchor, not a surveyed door coordinate.
const maxwell = findCampusBuilding('maxwell')!
const a = maxwell.ring[23], b = maxwell.ring[24]
const length = Math.hypot(b[0] - a[0], b[1] - a[1])
const ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length
export const MAXWELL_ENTRANCE = {
  center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Vec2,
  angle: Math.atan2(uy, ux), ground: 0.55, level: 1.24,
  spring: 3.76, innerRadius: 1.36, outerRadius: 4.12,
  width: 11.4, platformFront: 2.5, stairFront: 4.75, steps: 5,
}
export function maxwellToCampus([x, z]: Vec2): Vec2 {
  return [MAXWELL_ENTRANCE.center[0] + ux * x + uy * z, MAXWELL_ENTRANCE.center[1] + uy * x - ux * z]
}
export function isMaxwellFrontEdge(start: Vec2, end: Vec2): boolean {
  return Math.hypot(start[0] - a[0], start[1] - a[1]) < 0.01 && Math.hypot(end[0] - b[0], end[1] - b[1]) < 0.01
}
/** Keep illustrative planting clear of the entrance and its view from the courtyard. */
export function isMaxwellApproach(point: Vec2): boolean {
  const dx = point[0] - MAXWELL_ENTRANCE.center[0], dy = point[1] - MAXWELL_ENTRANCE.center[1]
  const x = dx * ux + dy * uy, z = dx * uy - dy * ux
  return Math.abs(x) < 6.8 && z > 0 && z < 23
}

export function maxwellEntranceHeightAt(point: Vec2): number | undefined {
  const dx = point[0] - MAXWELL_ENTRANCE.center[0], dy = point[1] - MAXWELL_ENTRANCE.center[1]
  const x = dx * ux + dy * uy, z = dx * uy - dy * ux, h = MAXWELL_ENTRANCE
  if (Math.abs(x) > h.width / 2 || z < 0 || z > h.stairFront) return
  if (z <= h.platformFront) return h.level
  return h.level + (h.ground - h.level) * (z - h.platformFront) / (h.stairFront - h.platformFront)
}

export function createArchBand(inner: number, outer: number, depth: number, start = 0, end = Math.PI): ExtrudeGeometry {
  const shape = new Shape()
  shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer)
  shape.absarc(0, 0, outer, start, end, false)
  shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner)
  shape.absarc(0, 0, inner, end, start, true)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: Math.max(4, Math.ceil((end - start) / Math.PI * 48)) })
}
