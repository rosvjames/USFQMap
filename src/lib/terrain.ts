import { CAMPUS_AREAS, CAMPUS_WALKWAYS, type CampusArea, type CampusWalkway } from './campus'
import { pointInPolygon } from './geo'
import { hallEntranceHeightAt } from './hall'
import type { Vec2 } from '../types'

export const PATH_LEVEL = 0.55
export const BRIDGE_LEVEL = 6
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
export const SPORT_ZONES: SportZone[] = CAMPUS_AREAS.filter((area) => corrections[area.osmId]).map((area) => ({ area, ...corrections[area.osmId] }))
export interface StairRun { top: Vec2; bottom: Vec2; width: number; low: number }
export const SPORT_STAIRS: StairRun[] = [
  { top: [-60, -80], bottom: [-56.5, -80], width: 2.4, low: -1.45 },
  { top: [-63.3, -104], bottom: [-63.65, -111], width: 1.7, low: -3.25 },
  { top: [-3.5, -121], bottom: [0.5, -121], width: 2.8, low: -3.8 },
]
export const TENNIS_LANDING: Vec2[] = [[-64.5, -110.3], [-59.4, -110.3], [-59.4, -112.2], [-64.5, -112.2]]
// Approximate pedestrian entrance between tennis and the fenced pitch.
export const SPORT_GATE: Vec2[] = [[-29, -116.4], [-25, -116.4], [-25, -113.6], [-29, -113.6]]
export const SPORT_ACCESS_AREAS: Vec2[][] = [
  [[-64.15, -99], [-62.45, -99], [-62.45, -135], [-64.15, -135]],
  [[-4.04, -108.03], [-4.98, -139.32], [-2.73, -139.67], [-1.14, -108.59]],
]
export const ELEVATED_WALKWAYS = CAMPUS_WALKWAYS.filter((way) => way.bridge)

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
  const openings = [...SPORT_STAIRS.map(stairOutline), TENNIS_LANDING, SPORT_GATE]
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
  if (way.osmId === 'way/1032704764') return index === 0 ? BRIDGE_LEVEL : PATH_LEVEL
  if (way.osmId === 'way/1032704766') return index === 0 ? BRIDGE_LEVEL : PATH_LEVEL
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

export function terrainHeightAt(point: Vec2): number {
  const entrance = hallEntranceHeightAt(point)
  if (entrance !== undefined) return entrance
  const bridge = bridgeHeightAt(point)
  if (bridge !== undefined) return bridge
  for (const stair of SPORT_STAIRS) {
    const { t, distance } = segmentProjection(point, stair.top, stair.bottom)
    if (distance <= stair.width / 2 && t >= -0.02 && t <= 1.02) return PATH_LEVEL + (stair.low - PATH_LEVEL) * Math.max(0, Math.min(1, t))
  }
  if (pointInPolygon(point, TENNIS_LANDING) || pointInPolygon(point, SPORT_GATE)) return -3.25
  return SPORT_ZONES.find((zone) => pointInPolygon(point, zone.area.ring))?.height ?? PATH_LEVEL
}

/** Top terrain must be cut away so recessed floors remain visible from above and at eye level. */
export const TERRAIN_CUTOUTS: Vec2[][] = [
  ...SPORT_ZONES.filter((zone) => zone.height < 0).map((zone) => zone.area.ring),
  ...SPORT_STAIRS.map(stairOutline), TENNIS_LANDING, SPORT_GATE,
]
