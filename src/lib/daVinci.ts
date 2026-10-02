import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

const building = findCampusBuilding('da-vinci')!
const start = building.ring[3], end = building.ring[2]
const length = Math.hypot(end[0] - start[0], end[1] - start[1])
const ux = (end[0] - start[0]) / length, uy = (end[1] - start[1]) / length
// Photo taken along the southwest facade, toward Maxwell and its fountain garden.
export const DA_VINCI_PASSAGE = { start, length, angle: Math.atan2(uy, ux), height: 1.05, floorHeight: 3.5, columns: Math.floor(length / 4.3) }
export const DA_VINCI_PAVING: Vec2[] = [[0, .65], [length, .65], [length, 8.8], [0, 8.8]]
export function daVinciToCampus([x, z]: Vec2): Vec2 {
  return [start[0] + ux * x + uy * z, start[1] + uy * x - ux * z]
}
export const DA_VINCI_WORLD_PAVING = DA_VINCI_PAVING.map(daVinciToCampus)
export function daVinciPassageHeightAt(point: Vec2): number | undefined {
  const dx = point[0] - start[0], dy = point[1] - start[1]
  const x = dx * ux + dy * uy, z = dx * uy - dy * ux
  if (z < .65 || z > 8.8) return
  if (x >= 0 && x <= length) return DA_VINCI_PASSAGE.height
  if (x > -1.2 && x < 0) return .55 + .5 * Math.ceil((x + 1.2) / .4) / 3
  if (x > length && x < length + 1.2) return 1.05 - .5 * Math.floor((x - length) / .4 + 1) / 3
}
export function isDaVinciPassage(point: Vec2): boolean { return pointInPolygon(point, DA_VINCI_WORLD_PAVING) }
export function daVinciWindowAt(x: number, height: number): boolean {
  const { columns, floorHeight } = DA_VINCI_PASSAGE
  return Array.from({length: columns}, (_,col) => (col + .5) * length / columns).some(center =>
    Math.abs(center - x) < .98 && [0,1,2].some(floor => Math.abs(floor * floorHeight + floorHeight * .56 - height) < 1.34))
}
export function daVinciIvy() {
  const leaves: {x:number;y:number;size:number;angle:number;tone:number}[] = []
  let seed = 927
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let x = .4; x < length - .3; x += .31) for (let y = .85; y < 10.2; y += .3) {
    const px = x + (random() - .5) * .23, py = y + (random() - .5) * .22
    // Sparse warm wall near the photographer, dense growth farther along the passage.
    const coverage = px < 5 ? .19 : .85 + Math.sin(px * 1.8 + py * 1.1) * .1
    if (random() > coverage || daVinciWindowAt(px, py)) continue
    leaves.push({x:px,y:py,size:.62 + random() * .2,angle:random() * Math.PI * 2,tone:random()})
  }
  return leaves
}
