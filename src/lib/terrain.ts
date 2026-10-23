import { CAMPUS_AREAS, CAMPUS_WALKWAYS, CAMPUS_BOUNDARY, CAMPUS_STREET_CUTOUTS, type CampusArea, type CampusWalkway } from './campus'
import { CAMPUS_ELEVATION, cityBaseHeightAt } from './elevation'
import { pointInPolygon } from './geo'
import { maxwellEntranceHeightAt } from './maxwell'
import { PAGODA_POND, pagodaEntranceHeightAt } from './pagoda'
import { campusBaseHeightAt } from './campusSlope'
import { hallEntranceHeightAt } from './hall'
import { HAYEK_ENTRANCE, hayekLandingHeightAt } from './hayek'
import { hallPassageHeightAt } from './hallPassage'
import { miguelEntranceHeightAt } from './miguel'
import { daVinciPassageHeightAt } from './daVinci'
import { daVinciFrontHeightAt } from './daVinciPlaza'
import { hallPlazaHeightAt } from './hallPlaza'
import { epicuroHeightAt, isEpicuroForecourt } from './epicuro'
import { newtonHeightAt } from './newton'
import { galileoHeightAt } from './galileo'
import type { Vec2 } from '../types'
import polygonClipping from 'polygon-clipping'
import { COLISEO_GARDEN_STAIRS, COLISEO_ANNEX_APRON, COLISEO_LOWER_FORECOURT, COLISEO_PLATFORM, COLISEO_ROAD_OUTLINES, COLISEO, campusToColiseo, coliseoToCampus } from './coliseo'

export const PATH_LEVEL = 0.55
export const BRIDGE_LEVEL = HAYEK_ENTRANCE.level
export type SportKind = 'sand' | 'terrace' | 'tennis' | 'synthetic' | 'football'
export interface SportZone { kind: SportKind; area: CampusArea; height: number; label: string }
// Uses existing OSM footprints. Use/terraces corrected from the student's on-site description.
const corrections: Record<string, { kind: SportKind; height: number; label: string }> = {
  'way/1036860085': { kind: 'sand', height: 0.4, label: 'Vóley de playa · 2 canchas' },
  'way/1036862312': { kind: 'terrace', height: -1.45, label: 'Terraza de mesas' },
  'way/447598657': { kind: 'tennis', height: -3.25, label: 'Tenis · 2 canchas' },
  'way/447598676': { kind: 'synthetic', height: -3.25, label: 'Fútbol · césped sintético' },
  'way/447598730': { kind: 'football', height: -3.8, label: 'Fútbol · césped natural' },
}
export const SPORT_ZONES: SportZone[] = CAMPUS_AREAS.filter((area) => corrections[area.osmId]).map((area) => {
  const correction = corrections[area.osmId]
  // The mapped pitches touch the lane; leave its full width clear for floors, fences and walking.
  const ring = ['synthetic', 'football'].includes(correction.kind)
    ? polygonClipping.difference([area.ring], ...COLISEO_ROAD_OUTLINES.map(ring => [ring]))[0][0] as Vec2[]
    : area.ring
  return { area: { ...area, ring }, ...correction }
})
export interface StairRun { top: Vec2; bottom: Vec2; width: number; low: number }
export const SPORT_STAIRS: StairRun[] = [
  { top: [-60, -80], bottom: [-56.5, -80], width: 2.4, low: -1.45 },
]
export function sportStairTopHeight(stair: StairRun): number {
  return campusBaseHeightAt(stair.top)
}
// Steps built against a retaining wall, from a to b with the lower floor on the left.
// Step 0 sits against the wall; each step drops one rise toward the floor at `low`.
// `upper` defaults to the ground at the top of the wall; `sides` closes steps cut into a lawn.
export interface WallSteps { a: Vec2; b: Vec2; count: number; tread: number; maxRise: number; low: number | ((p: Vec2) => number); upper?: (p: Vec2) => number; sides?: boolean }
export function wallStepsLevels(run: WallSteps, p: Vec2) {
  return { low: typeof run.low === 'number' ? run.low : run.low(p), upper: run.upper ? run.upper(p) : campusBaseHeightAt(p) }
}
// Student's description: a railing, not stairs, separates the lane from the natural pitch;
// the descent is the full flight behind its north goal. Four large seating steps line the lane
// wall and the synthetic pitch's wall shared with tennis. The tennis bleachers climb all the
// way to the straight walkway above them, and big steps rise from the gym's flat forecourt
// to the Obelisk lawn.
export const NATURAL_PITCH_STAIRS: WallSteps = { a: [30.8, -108.6], b: [1.5, -108.6], count: 10, tread: .4, maxRise: Infinity, low: -3.8 }
export const SPORT_SEATING: WallSteps[] = [
  { a: [1.73, -112.6], b: [1, -139.8], count: 4, tread: .55, maxRise: .45, low: -3.8 },
  { a: [1, -139.8], b: [-1.5, -155.6], count: 4, tread: .55, maxRise: .45, low: -3.8 },
  { a: [-26.9, -100], b: [-28.3, -138.6], count: 4, tread: .45, maxRise: .45, low: -3.25 },
]
export const TENNIS_BLEACHERS: WallSteps = { a: [-60.9, -94.2], b: [-62.8, -133.3], count: 9, tread: .4, maxRise: Infinity, low: -3.25 }
export const COLISEO_BLEACHERS: WallSteps = {
  a: coliseoToCampus([COLISEO.stairX - COLISEO.stairWidth / 2, COLISEO.stairTop]), b: coliseoToCampus([COLISEO.stairX + COLISEO.stairWidth / 2, COLISEO.stairTop]),
  count: 4, tread: (COLISEO.stairTop - COLISEO.stairBottom) / 4, maxRise: Infinity, sides: true,
  low: p => campusBaseHeightAt(coliseoToCampus([campusToColiseo(p)[0], 3.6])) + .02, upper: () => COLISEO.platformLevel,
}
/** Steps people walk on; walkers follow each as a ramp. */
export const SPORT_STAIRWAYS = [NATURAL_PITCH_STAIRS, TENNIS_BLEACHERS, COLISEO_BLEACHERS]
// The lane's edge above the natural pitch, from the foot of its stairs to the south corner.
export const NATURAL_PITCH_RAILING: Vec2[] = [[1.73, -112.6], [1, -139.8], [.9, -140.2], [-1.5, -155.6]]
export function wallStepsOutline({ a, b, count, tread }: WallSteps): Vec2[] {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]), depth = count * tread
  const nx = -(b[1] - a[1]) / length * depth, ny = (b[0] - a[0]) / length * depth
  return [a, b, [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]]
}
function sportStairwayHeightAt(point: Vec2): number | undefined {
  for (const run of SPORT_STAIRWAYS) {
    const { a, b, count, tread } = run
    const { t, length } = segmentProjection(point, a, b)
    const depth = ((point[0] - a[0]) * -(b[1] - a[1]) + (point[1] - a[1]) * (b[0] - a[0])) / length
    if (t < 0 || t > 1 || depth < 0 || depth > count * tread) continue
    const { low, upper } = wallStepsLevels(run, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    return upper + (low - upper) * depth / (count * tread)
  }
}
export const SPORT_ACCESS_AREAS: Vec2[][] = [
  [[-64.15, -99], [-62.45, -99], [-62.45, -135], [-64.15, -135]],
  [[-4.04, -108.03], [-4.98, -139.32], [-2.73, -139.67], [-1.14, -108.59]],
]
export const ELEVATED_WALKWAYS = [...CAMPUS_WALKWAYS.filter((way) => way.bridge).map(way => {
  if (!['way/1032704764','way/1032704766'].includes(way.osmId)) return way
  const [a,b] = way.line, length = Math.hypot(b[0]-a[0],b[1]-a[1]), t = Math.min(3.2/length,0.25)
  // A short flat landing joins the deck before the ramp descends to the street.
  return {...way,line:[a,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as Vec2,...way.line.slice(1)]}
})]

export function segmentProjection(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (length * length || 1)
  const distance = Math.hypot(p[0] - a[0] - Math.max(0, Math.min(1, t)) * dx, p[1] - a[1] - Math.max(0, Math.min(1, t)) * dy)
  return { t, distance, length }
}

export function stairOutline(stair: StairRun): Vec2[] {
  const dx = stair.bottom[0] - stair.top[0], dy = stair.bottom[1] - stair.top[1], length = Math.hypot(dx, dy)
  const nx = -dy / length * stair.width / 2, ny = dx / length * stair.width / 2
  return [[stair.top[0] + nx, stair.top[1] + ny], [stair.bottom[0] + nx, stair.bottom[1] + ny],
    [stair.bottom[0] - nx, stair.bottom[1] - ny], [stair.top[0] - nx, stair.top[1] - ny]]
}

/** Split retaining edges at pedestrian openings so stairs never run through a wall. */
export function boundarySegments(zone: SportZone): [Vec2, Vec2][] {
  const openings = SPORT_STAIRS.map(stairOutline)
  return zone.area.ring.flatMap((a, i) => {
    const b = zone.area.ring[(i + 1) % zone.area.ring.length]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    if (Math.hypot(dx, dy) < 0.1) return []
    const at = (t: number): Vec2 => [a[0] + dx * t, a[1] + dy * t]
    const cuts = [0, 1]
    for (const ring of openings) for (let j = 0; j < ring.length; j++) {
      const p = ring[j], q = ring[(j + 1) % ring.length]
      const ex = q[0] - p[0], ey = q[1] - p[1], cross = dx * ey - dy * ex
      if (Math.abs(cross) < 1e-8) continue
      const px = p[0] - a[0], py = p[1] - a[1]
      const t = (px * ey - py * ex) / cross, u = (px * dy - py * dx) / cross
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t)
    }
    cuts.sort((x, y) => x - y)
    return cuts.slice(1).flatMap((t, j): [Vec2, Vec2][] =>
      t - cuts[j] < 1e-5 || openings.some((ring) => pointInPolygon(at((t + cuts[j]) / 2), ring)) ? [] : [[at(cuts[j]), at(t)]],
    )
  })
}

export function bridgeVertexHeight(way: CampusWalkway, index: number): number {
  if (way.osmId === 'way/1032704764' || way.osmId === 'way/1032704766') return index === way.line.length - 1 ? PATH_LEVEL : BRIDGE_LEVEL
  return BRIDGE_LEVEL
}

export function bridgeHeightAt(point: Vec2): number | undefined {
  let nearest = Infinity, height: number | undefined
  for (const way of ELEVATED_WALKWAYS) for (let i = 1; i < way.line.length; i++) {
    const { t, distance } = segmentProjection(point, way.line[i - 1], way.line[i])
    if (distance < nearest && distance <= Math.max(way.width, 2.8) / 2 && t >= -0.015 && t <= 1.015) {
      const a = bridgeVertexHeight(way, i - 1), b = bridgeVertexHeight(way, i)
      nearest = distance
      height = a + (b - a) * Math.max(0, Math.min(1, t))
    }
  }
  return height
}

export function terrainHeightAt(point: Vec2, referenceHeight?: number): number {
  const bridge = bridgeHeightAt(point)
  if (bridge !== undefined && referenceHeight === undefined) return bridge
  const hayek = hayekLandingHeightAt(point)
  if (hayek !== undefined) return hayek
  const local = campusTerrainHeightAt(point)
  const ground = CAMPUS_STREET_CUTOUTS.some(ring => pointInPolygon(point, ring)) ? PATH_LEVEL
    : !pointInPolygon(point, CAMPUS_BOUNDARY) && local === campusBaseHeightAt(point) ? cityBaseHeightAt(point) : local + CAMPUS_ELEVATION
  if (bridge === undefined) return ground
  // A walker below a deck stays on the lower approach; a reachable ramp can be stepped onto.
  return Math.abs(bridge - referenceHeight!) <= .38 || Math.abs(bridge - referenceHeight!) < Math.abs(ground - referenceHeight!) ? bridge : ground
}

/** Campus components use local elevations; the walking camera and routes use world elevations. */
export function campusTerrainHeightAt(point: Vec2): number {
  if (!pointInPolygon(point,COLISEO_GARDEN_STAIRS) && (pointInPolygon(point,COLISEO_ANNEX_APRON) || pointInPolygon(point,COLISEO_LOWER_FORECOURT))) return campusBaseHeightAt(coliseoToCampus([campusToColiseo(point)[0],3.6]))+.02
  const stairway = sportStairwayHeightAt(point)
  if (stairway !== undefined) return stairway
  if (pointInPolygon(point, COLISEO_PLATFORM)) return COLISEO.platformLevel
  const pagoda = pagodaEntranceHeightAt(point)
  if (pagoda !== undefined) return pagoda
  const epicuro = epicuroHeightAt(point)
  if (epicuro !== undefined) return epicuro
  const newton = newtonHeightAt(point)
  if (newton !== undefined) return newton
  const galileo = galileoHeightAt(point)
  if (galileo !== undefined) return galileo
  const passage = hallPassageHeightAt(point)
  if (passage !== undefined) return passage
  const miguel = miguelEntranceHeightAt(point)
  if (miguel !== undefined) return miguel
  const plazaDoor = hallPlazaHeightAt(point)
  if (plazaDoor !== undefined) return plazaDoor
  const plaza = daVinciFrontHeightAt(point)
  if (plaza !== undefined) return plaza
  const daVinci = daVinciPassageHeightAt(point)
  if (daVinci !== undefined) return daVinci
  const maxwell = maxwellEntranceHeightAt(point)
  if (maxwell !== undefined) return maxwell
  const entrance = hallEntranceHeightAt(point)
  if (entrance !== undefined) return entrance
  if (isEpicuroForecourt(point)) return .58
  for (const stair of SPORT_STAIRS) {
    const { t, distance } = segmentProjection(point, stair.top, stair.bottom)
    const top = sportStairTopHeight(stair)
    if (distance <= stair.width / 2 && t >= -0.02 && t <= 1.02) return top + (stair.low - top) * Math.max(0, Math.min(1, t))
  }
  return SPORT_ZONES.find((zone) => pointInPolygon(point, zone.area.ring))?.height ?? campusBaseHeightAt(point)
}

/** Top terrain must be cut away so recessed floors remain visible from above and at eye level. */
export const TERRAIN_CUTOUTS: Vec2[][] = [
  ...CAMPUS_STREET_CUTOUTS,
  PAGODA_POND,
  COLISEO_GARDEN_STAIRS, COLISEO_ANNEX_APRON, COLISEO_LOWER_FORECOURT,
  ...SPORT_ZONES.filter((zone) => zone.height < 0).map((zone) => zone.area.ring),
  ...SPORT_STAIRS.map(stairOutline),
]
