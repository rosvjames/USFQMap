import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_PATHS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { boundarySegments, bridgeHeightAt, segmentProjection, SPORT_ZONES, terrainHeightAt } from './terrain'
import type { Vec2 } from '../types'
import { HALL_APPROACH, HALL_OBSTACLES } from './hall'

const obstacles = [...CAMPUS_BUILDINGS.map((b) => b.ring), ...CAMPUS_AREAS.filter((a) => a.kind === 'water').map((a) => a.ring), ...HALL_OBSTACLES]
const clearance: Vec2[] = [[0, 0], [0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]]
const fence = SPORT_ZONES.filter((zone) => zone.kind === 'synthetic').flatMap(boundarySegments)

/** Exterior simulation only: footprints and water are solid, interiors are not surveyed. */
export function isWalkable(point: Vec2): boolean {
  if (fence.some(([a, b]) => segmentProjection(point, a, b).distance < 0.55)) return false
  return clearance.every(([dx, dy]) => {
    const sample: Vec2 = [point[0] + dx, point[1] + dy]
    return (pointInPolygon(sample, CAMPUS_BOUNDARY) || bridgeHeightAt(sample) !== undefined) && !obstacles.some((ring) => pointInPolygon(sample, ring))
  })
}

export function walkingStart(buildingId = 'hall-principal'): Vec2 {
  if (buildingId === 'hall-principal' && isWalkable(HALL_APPROACH)) return [...HALL_APPROACH]
  const target = findCampusBuilding(buildingId)?.center ?? [0, 0]
  // Leave enough space to see the building rather than spawn against its wall.
  const candidates = CAMPUS_PATHS.flat().filter((point) =>
    Math.hypot(point[0] - target[0], point[1] - target[1]) >= 20 && isWalkable(point),
  )
  candidates.sort((a, b) => Math.hypot(a[0] - target[0], a[1] - target[1]) - Math.hypot(b[0] - target[0], b[1] - target[1]))
  if (candidates[0]) return [...candidates[0]]
  throw new Error('No hay un punto exterior disponible para iniciar el recorrido.')
}

/** Small substeps stop fast frames from tunnelling through narrow walls. */
export function moveWalker(start: Vec2, movement: Vec2): Vec2 {
  let point: Vec2 = [...start]
  const steps = Math.max(1, Math.ceil(Math.hypot(...movement) / 0.25))
  const dx = movement[0] / steps
  const dy = movement[1] / steps
  for (let i = 0; i < steps; i++) {
    const next: Vec2 = [point[0] + dx, point[1] + dy]
    if (!isWalkable(next) || Math.abs(terrainHeightAt(next) - terrainHeightAt(point)) > 0.38) break
    point = next
  }
  return point
}
