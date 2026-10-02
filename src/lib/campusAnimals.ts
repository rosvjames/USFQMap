import type { Vec2 } from '../types'
import { casitaToCampus } from './casita'
import { hallToCampus } from './hall'
import { miguelToCampus } from './miguel'
import { terrainHeightAt } from './terrain'

export type CampusAnimalId = 'gaston' | 'pancho' | 'pancha'
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
  casitaToCampus([0, 3]), [-50.8, -56.64], [-42.74, -33.17], [-40.12, -26.88],
  // Round the far end of the fence, then use the narrow side walk by Galileo.
  hallToCampus([4.7, 39.5]), hallToCampus([9.6, 39.5]),
  hallToCampus([9.6, 12]), hallToCampus([9.6, 6.5]),
]
const reversedHall = [...casitaHall].reverse().slice(1)
// An occasional lap takes Gastón along the mapped north shore of the Pagoda
// pond and back through the garden. Never send an animal across water/bridges.
const gardenLap: Vec2[] = [
  [-50.8, -56.64], [-42.74, -33.17], [-40.12, -26.88], [-34.79, -29.46],
  [-16.95, -40.82], [-8.25, -46.07], [-4.07, -50.96], [-.98, -46.12],
  [3.94, -42.34], [9.4, -40.92], [18.8, -40], [25, -39.5], [34, -40.8],
  [45.18, -51.03], [47.97, -23.68], [47.09, -17.57], [45.01, -15.27],
  [42.33, -13.94], [34.25, -13.13], [28.05, -14.16], [25.34, -14.53],
  [23.19, -14.34], [-10.7, -.77], [-26.5, 6], [-40.12, -26.88],
  [-42.74, -33.17], [-50.8, -56.64], casitaHall[0],
]

export const ANIMAL_ROUTES: Record<CampusAnimalId, AnimalRoute> = {
  gaston: route('gaston', 'Gastón', [
    ...casitaHall, ...reversedHall,
    ...casitaHall.slice(1), ...reversedHall, ...gardenLap,
  ], .95),
  // Small separate circuits on Miguel's main forecourt, just inside Guardianía.
  pancho: route('pancho', 'Pancho', ([[0, 10], [-17, 10], [-19, 14], [-15, 16], [0, 16], [0, 10]] as Vec2[]).map(miguelToCampus), 1.15),
  pancha: route('pancha', 'Pancha', ([[-2, 8.5], [-15, 8.5], [-17, 12], [-14, 14], [-2, 14], [-2, 8.5]] as Vec2[]).map(miguelToCampus), 1.05),
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
