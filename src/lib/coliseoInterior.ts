import type { Vec2 } from '../types'
import { findCampusBuilding } from './campus'

// Ground floor read from a photo of the "Mapa de recursos y evacuación · Coliseo / Pagoda · Piso 1"
// sign. The OSM footprint fixes the size; partitions, doors and courts are placed by eye on it,
// so every dimension below is approximate and no space has been identified on site yet.
// The strip of rooms the sign draws beyond the east wall is outside the footprint and not modelled.
const building = findCampusBuilding('coliseo')!
// ring: NW, NE, NE notch, SE, SW. The frame sits on the south wall, x east and y north.
const origin = building.ring[4], southEast = building.ring[3], northWest = building.ring[0]
const width = Math.hypot(southEast[0] - origin[0], southEast[1] - origin[1])
const ux = (southEast[0] - origin[0]) / width, uy = (southEast[1] - origin[1]) / width
const depth = Math.hypot(northWest[0] - origin[0], northWest[1] - origin[1])

export const COLISEO = {
  origin, angle: Math.atan2(uy, ux), width, depth,
  // The floor sits level on the upper campus grade; the lawn falls away below its south-west corner,
  // so the slab and outer walls continue `footing` metres down to stay closed there.
  floor: 0.6, footing: 2, outerWall: 3.4, innerWall: 2.5,
  /** Changing rooms and offices line the west wall; the stands line the south one. */
  service: width * 0.205, stands: depth * 0.157,
}
export function coliseoToCampus([x, y]: Vec2): Vec2 {
  return [origin[0] + ux * x - uy * y, origin[1] + uy * x + ux * y]
}
export const COLISEO_CENTER = coliseoToCampus([width / 2, depth / 2])
/** Hidden from the app, like the academic complex: a photo of the sign is too rough a source. */
export const COLISEO_INTERIOR_VISIBLE: boolean = false

export interface Door { at: number; width: number }
export interface Wall { from: Vec2; to: Vec2; outer?: boolean; doors?: Door[] }

const W = width, D = depth, S = COLISEO.service
// Entrance lobby between the two changing rooms, where the sign says "usted está aquí".
const LOBBY: Vec2 = [D * 0.2, D * 0.3]
const CHANGING_END = D * 0.48, OFFICE_SPLIT = D * 0.63
export const COLISEO_WALLS: Wall[] = [
  { from: [0, 0], to: [0, D], outer: true, doors: [{ at: (LOBBY[0] + LOBBY[1]) / 2, width: 2.2 }] },
  { from: [0, D], to: [W, D], outer: true, doors: [{ at: S + 2.2, width: 2 }, { at: W - 3.5, width: 2 }] },
  { from: [W, D], to: [W, 0], outer: true, doors: [{ at: D - 2.6, width: 2 }] },
  { from: [W, 0], to: [0, 0], outer: true },
  { from: [S, 0], to: [S, D], doors: [{ at: (LOBBY[0] + LOBBY[1]) / 2, width: 2.6 }, { at: D * 0.55, width: 1.1 }, { at: D * 0.82, width: 1.1 }] },
  { from: [0, LOBBY[0]], to: [S, LOBBY[0]], doors: [{ at: S - 1.2, width: 1 }] },
  { from: [0, LOBBY[1]], to: [S, LOBBY[1]], doors: [{ at: S - 1.2, width: 1 }] },
  { from: [0, CHANGING_END], to: [S, CHANGING_END] },
  { from: [0, OFFICE_SPLIT], to: [S, OFFICE_SPLIT] },
  // Cubicles against the west wall of each changing room.
  ...[0.04, 0.08, 0.12, 0.16, 0.34, 0.38, 0.42].map((s): Wall => ({ from: [0, D * s], to: [S * 0.42, D * s] })),
]

/** Solid stretches of a wall, as distances from its start, once the doors are cut out. */
export function wallPieces(wall: Wall): [number, number][] {
  const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
  const pieces: [number, number][] = []
  let start = 0
  for (const door of [...(wall.doors ?? [])].sort((a, b) => a.at - b.at)) {
    const open = Math.max(start, door.at - door.width / 2)
    if (open > start) pieces.push([start, open])
    start = Math.min(length, door.at + door.width / 2)
  }
  if (length > start) pieces.push([start, length])
  return pieces
}

export interface Court { center: Vec2; length: number; width: number }
// Regulation sizes, long side east–west as drawn on the sign.
const courtX = S + (W - S) * 0.5
export const BASKETBALL: Court = { center: [courtX, D * 0.64], length: 28, width: 15 }
export const VOLLEYBALL: Court = { center: [courtX, D * 0.3], length: 18, width: 9 }

// Reading of the row of small squares along the south wall as the frame of a stepped stand.
export const COLISEO_STANDS = { from: S + (W - S) * 0.2, to: W - 1.5, tiers: 4, tread: (COLISEO.stands - 0.6) / 4, riser: 0.42 }
export const COLISEO_STAIR = { from: S + 0.4, to: S + (W - S) * 0.14, steps: 8, depth: 2.4, riser: 0.2 }
