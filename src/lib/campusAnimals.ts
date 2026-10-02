import type { Vec2 } from '../types'
import { casitaToCampus } from './casita'
import { hallToCampus } from './hall'
import { miguelToCampus } from './miguel'
import { terrainHeightAt } from './terrain'
import { isAnimalTravelClear } from './animalObstacles'

export type CampusAnimalId = 'gaston' | 'pancho' | 'pancha'
// Enclose animated heads, tails and feet at every orientation, plus a margin.
export const ANIMAL_CLEARANCE: Record<CampusAnimalId, number> = { gaston: 1.25, pancho: 1.6, pancha: 1.6 }
export interface AnimalRoute {
  id: CampusAnimalId
  name: string
  /** Closed walking circuit, in the same east/north metre frame as campus paths. */
  points: Vec2[]
  speed: number
  length: number
  segmentLengths: number[]
}

function route(id: CampusAnimalId, name: string, points: Vec2[], speed: number): AnimalRoute {
  const segmentLengths = points.slice(1).map((b, i) => Math.hypot(b[0] - points[i][0], b[1] - points[i][1]))
  return { id, name, points, speed, segmentLengths, length: segmentLengths.reduce((a, b) => a + b, 0) }
}

// Follow the Casita's mapped lane to the quadrangle. The final approach goes
// around the Hall lawn along its east side, leaving the new fence untouched.
const casitaHall: Vec2[] = [
  casitaToCampus([0, 3.8]), [-47, -56.64], [-42.74, -33.17], [-40.12, -26.88],
  // Stay on the open side of the lawn, with room to turn before Hall's stairs.
  hallToCampus([4.7, 39.5]), hallToCampus([4.7, 12]), hallToCampus([4.7, 10]),
]
const reversedHall = [...casitaHall].reverse().slice(1)
// Occasionally visit the Pagoda gardens along the spacious lake-side path.
// Return by that path: the strip between Newton/Casa Blanca and the pond is
// too narrow for the full turning clearance, especially at its corners.
const gardenApproach: Vec2[] = [
  [-47, -56.64], [-42.74, -33.17], [-40.12, -26.88], [-34.79, -29.46],
  [-16.95, -40.82], [-8.25, -46.07], [-4.07, -50.96], [-.98, -46.12],
  [3.94, -42.34], [9.4, -40.92], [18.8, -40], [25, -39.5], [34, -40.8],
  [45.18, -51.03], [47.97, -23.68],
]
const gardenLap = [...gardenApproach, ...gardenApproach.slice(0,-1).reverse(), casitaHall[0]]

export const ANIMAL_ROUTES: Record<CampusAnimalId, AnimalRoute> = {
  gaston: route('gaston', 'Gastón', [
    ...casitaHall, ...reversedHall,
    ...casitaHall.slice(1), ...reversedHall, ...gardenLap,
  ], .95),
  // Small separate circuits on Miguel's main forecourt, just inside Guardianía.
  pancho: route('pancho', 'Pancho', ([[1.5, 9.3], [-10.5, 9.3], [-10.5, 11.8], [1.5, 11.8], [1.5, 9.3]] as Vec2[]).map(miguelToCampus), 1.15),
  pancha: route('pancha', 'Pancha', ([[0, 9.5], [-9, 9.5], [-9, 11.5], [0, 11.5], [0, 9.5]] as Vec2[]).map(miguelToCampus), 1.05),
}

/** Deterministic, distance-based travel: no random jumps or accumulated frame drift. */
export function sampleAnimalPosition(id: CampusAnimalId, seconds: number) {
  const path = ANIMAL_ROUTES[id]
  const distance = ((seconds * path.speed % path.length) + path.length) % path.length
  let remaining = distance
  let segment = 0
  while (segment < path.segmentLengths.length - 1 && remaining > path.segmentLengths[segment]) {
    remaining -= path.segmentLengths[segment++]
  }
  const a = path.points[segment], b = path.points[segment + 1]
  const t = remaining / path.segmentLengths[segment]
  const point: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  return { point, height: terrainHeightAt(point), yaw: Math.atan2(b[1] - a[1], b[0] - a[0]), distance }
}

/** Fail closed: a blocked move never advances this animal's clock. Subsequent
 * frames cannot skip the obstruction or teleport to the far side of a wall. */
export function advanceAnimalTime(id: CampusAnimalId, seconds: number, delta: number): number {
  if(!Number.isFinite(delta) || delta<=0) return seconds
  const next=seconds+Math.min(delta,.1)
  const from=sampleAnimalPosition(id,seconds).point, to=sampleAnimalPosition(id,next).point
  return isAnimalTravelClear(from,to,ANIMAL_CLEARANCE[id]) ? next : seconds
}
