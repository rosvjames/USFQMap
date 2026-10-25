import { CAMPUS_BOUNDARY, CAMPUS_WALKWAYS, findCampusBuilding } from './campus'
import polygonClipping from 'polygon-clipping'
import type { Vec2 } from '../types'
import { walkwayOutlines } from './architecture'

// Existing footprint; facade proportions and relative levels follow the student's photos.
const building = findCampusBuilding('coliseo')!
const a = building.ring[0], b = building.ring[4]
const width = Math.hypot(b[0] - a[0], b[1] - a[1])
const ux = (b[0] - a[0]) / width, uy = (b[1] - a[1]) / width
export const COLISEO = {
  center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Vec2,
  angle: Math.atan2(uy, ux), width, depth: 42.1,
  eave: 5.7, doorX: 11.6, doorWidth: 3.8,
  // Large steps climb from the flat forecourt into the Obelisk lawn.
  stairX: 6.3, stairWidth: 10.5, stairBottom: 7.6, stairTop: 9.8,
  // The lawn reaches the synthetic pitch, which clips it; a thinner gap would slope into the pit.
  platformFront: 7.6, platformLevel: .4, southEdge: 14, roadWidth: 6.8,
}
export function coliseoToCampus([x, z]: Vec2): Vec2 {
  return [COLISEO.center[0] + ux * x + uy * z, COLISEO.center[1] + uy * x - ux * z]
}
export function campusToColiseo([x, y]: Vec2): Vec2 {
  const dx = x - COLISEO.center[0], dy = y - COLISEO.center[1]
  return [dx * ux + dy * uy, dx * uy - dy * ux]
}
export const COLISEO_GARDEN_STAIRS: Vec2[] = ([
  [COLISEO.stairX - COLISEO.stairWidth / 2, COLISEO.stairBottom], [COLISEO.stairX + COLISEO.stairWidth / 2, COLISEO.stairBottom],
  [COLISEO.stairX + COLISEO.stairWidth / 2, COLISEO.stairTop], [COLISEO.stairX - COLISEO.stairWidth / 2, COLISEO.stairTop],
] as Vec2[]).map(coliseoToCampus)
export const COLISEO_PLATFORM: Vec2[] = ([[-24,COLISEO.platformFront],[COLISEO.southEdge,COLISEO.platformFront],[COLISEO.southEdge,23],[-24,23]] as Vec2[]).map(coliseoToCampus)

// Meet the lane inside its angled edge; the lane mesh is clipped against this same footprint.
export const COLISEO_LOWER_FORECOURT: Vec2[] = ([[-24,3.2],[COLISEO.southEdge,3.2],[COLISEO.southEdge,COLISEO.platformFront],[-24,COLISEO.platformFront]] as Vec2[]).map(coliseoToCampus)

const annexLocal = findCampusBuilding('banos-deportes')!.ring.map(campusToColiseo)
export const SPORTS_ANNEX = {
  left: Math.min(...annexLocal.map(p=>p[0])), right: Math.max(...annexLocal.map(p=>p[0])),
  front: Math.min(...annexLocal.map(p=>p[1])), back: Math.max(...annexLocal.map(p=>p[1])),
}
export const COLISEO_ANNEX_APRON: Vec2[] = ([
  [SPORTS_ANNEX.left-.35,3.6],[SPORTS_ANNEX.right+.35,3.6],
  [SPORTS_ANNEX.right+.35,COLISEO.platformFront],[SPORTS_ANNEX.left-.35,COLISEO.platformFront],
] as Vec2[]).map(coliseoToCampus)

export function isColiseoRetainingEdge(point: Vec2): boolean {
  const [x, z] = campusToColiseo(point)
  return x >= -24.3 && x <= COLISEO.southEdge + .3 && Math.abs(z - COLISEO.platformFront) < .6 && Math.abs(x - COLISEO.stairX) > COLISEO.stairWidth / 2
}

/** Raised lawn supporting both the Obelisk and annex, with graded outer joins. */
export function coliseoPlatformBaseAt(point: Vec2, surrounding: number): number {
  const [x,z] = campusToColiseo(point)
  const strength = smooth((z - 5.4) / 2.2) * (1 - smooth((z - 23) / 5)) * smooth((x + 28) / 4) * (1 - smooth((x - 17) / 8))
  return surrounding + Math.max(0, COLISEO.platformLevel - surrounding) * strength
}

// Grade the mapped lane from above the Pagoda to the campus corner of the bridge deck.
// Keeping this separate from campusSlope avoids a terrain/landmark import cycle.
const lane = CAMPUS_WALKWAYS.find(w => w.osmId === 'way/395853824')!
export const COLISEO_LANE: Vec2[] = lane.line
const laneStrips = walkwayOutlines(COLISEO_LANE, COLISEO.roadWidth).map(r => [r] as polygonClipping.Polygon)
export const COLISEO_ROAD_OUTLINES = polygonClipping.intersection(
  polygonClipping.union(laneStrips[0], ...laneStrips.slice(1)),
  [CAMPUS_BOUNDARY],
).map(p => p[0] as Vec2[])
const lengths = COLISEO_LANE.slice(1).map((b, i) => Math.hypot(b[0] - COLISEO_LANE[i][0], b[1] - COLISEO_LANE[i][1]))
const total = lengths.reduce((sum, n) => sum + n, 0)
const smooth = (t: number) => { const s = Math.max(0, Math.min(1, t)); return s * s * (3 - 2 * s) }

/** The lane drops earlier than the broad lawn, leaving the grass above its edge. */
export function coliseoLaneHeightAt(point: Vec2, upper: number, drop: number, surrounding: number): number {
  let nearest = Infinity, weightedHeight = 0, weights = 0, travelled = 0
  for (let i = 0; i < lengths.length; i++) {
    const a = COLISEO_LANE[i], b = COLISEO_LANE[i + 1]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (lengths[i] ** 2 || 1)))
    const distance = Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dy * t)
    const laneHeight = upper - drop * smooth((travelled + lengths[i] * t) / total)
    // Blend adjoining segments at a bend. Choosing just the nearest segment
    // makes the terrain jump along their equal-distance boundary.
    const weight = Math.exp(-((distance / 2.5) ** 2))
    weightedHeight += laneHeight * weight; weights += weight
    nearest = Math.min(nearest, distance)
    travelled += lengths[i]
  }
  if (nearest >= COLISEO.roadWidth / 2 + 3.3 || weights < 1e-12) return surrounding
  const influence = 1 - smooth((nearest - COLISEO.roadWidth / 2) / 3.3)
  return surrounding + (Math.min(surrounding, weightedHeight / weights) - surrounding) * influence
}

export function isColiseoLane(point: Vec2, margin = 0): boolean {
  return COLISEO_LANE.slice(1).some((b, i) => {
    const a = COLISEO_LANE[i], dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dy * t) < COLISEO.roadWidth / 2 + margin
  })
}
