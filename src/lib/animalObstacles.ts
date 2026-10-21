import type { Vec2 } from '../types'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { casitaToCampus } from './casita'
import { hallToCampus } from './hall'
import { HALL_FLAG_GARDEN } from './hallFlags'
import { HALL_MINI_WORLD_OUTLINE } from './hallMiniPlaza'
import { galileoToCampus, GALILEO_ENTRANCE, GALILEO_LAGOON } from './galileo'
import { miguelToCampus, MIGUEL_DRINKING_WALL, MIGUEL_FORECOURT_RAILS, MIGUEL_RAIL_Z, MIGUEL_PLANTER_X } from './miguel'
import { PAGODA_POND } from './pagoda'
import { COLISEO_GARDEN_STAIRS, COLISEO, SPORTS_ANNEX, coliseoToCampus } from './coliseo'
import { MIGUEL_ROCKET_BASE, MIGUEL_GARDEN_BIN, MIGUEL_GARDEN_TABLES, miguelGardenToCampus } from './miguelGarden'

function rectangle(x: number, z: number, width: number, depth: number, transform: (p: Vec2) => Vec2): Vec2[] {
  return ([[x-width/2,z-depth/2],[x+width/2,z-depth/2],[x+width/2,z+depth/2],[x-width/2,z+depth/2]] as Vec2[]).map(transform)
}

const wall = MIGUEL_DRINKING_WALL, garden = HALL_FLAG_GARDEN, galileo = GALILEO_ENTRANCE
// Roofs and canopies above the animals are deliberately absent. At animal
// height, stairs, fences, counters and pedestals are solid too, beyond OSM walls.
const rings = [
  ...CAMPUS_BUILDINGS.map(b => b.ring),
  ...CAMPUS_AREAS.filter(a => a.kind === 'water' || a.osmId === 'way/1369166967').map(a => a.ring),
  PAGODA_POND, GALILEO_LAGOON.ring, HALL_MINI_WORLD_OUTLINE,
  COLISEO_GARDEN_STAIRS,
  MIGUEL_ROCKET_BASE,
  rectangle(...MIGUEL_GARDEN_BIN.at, MIGUEL_GARDEN_BIN.width, MIGUEL_GARDEN_BIN.depth, miguelGardenToCampus),
  ...MIGUEL_GARDEN_TABLES.map(([x,z])=>rectangle(x,z,3.4,3.4,miguelGardenToCampus)),
  ...[[-24, SPORTS_ANNEX.left-.35], [SPORTS_ANNEX.right+.35, COLISEO.stairX - COLISEO.stairWidth / 2 - .4], [COLISEO.stairX + COLISEO.stairWidth / 2 + .4, 20]].map(([a, b]) => rectangle((a + b) / 2, COLISEO.platformFront, b - a, .3, coliseoToCampus)),
  rectangle(wall.x, wall.z, wall.width, wall.depth, miguelToCampus),
  rectangle(-16.3, 11.08, 2.8, .8, miguelToCampus),
  ...MIGUEL_FORECOURT_RAILS.map(([a,b]) => rectangle((a+b)/2, MIGUEL_RAIL_Z, b-a, .12, miguelToCampus)),
  ...MIGUEL_PLANTER_X.map(x => rectangle(x, 14.2, 2.8, .9, miguelToCampus)),
  rectangle(-12.5, 4, 14.4, 7, miguelToCampus),
  ...[-8.65, 8.65].map(x => rectangle(x, 5.5, 1.36, 1.75, hallToCampus)),
  rectangle(0, 3.95, 16.8, 7.9, hallToCampus),
  rectangle((garden.left+garden.right)/2, garden.front, garden.right-garden.left, .12, hallToCampus),
  ...[garden.left,garden.right].map(x => rectangle(x, garden.front-3.2, .12, 6.4, hallToCampus)),
  ...[-2.55,2.55].map(x => rectangle(x, 1.55, 2.6, .3, casitaToCampus)),
  ...[-3.75,-1.25,1.25,3.75].map(x => rectangle(x, 1.55, .52, .52, casitaToCampus)),
  ...[-1,1].flatMap(side => [
    rectangle(galileo.x+side*3.4, 2.8, .55, 4.5, galileoToCampus),
    rectangle(galileo.x+side*3.7, 4.9, 1.05, 1.05, galileoToCampus),
  ]),
]
const obstacles = rings.map(ring => ({
  ring, minX: Math.min(...ring.map(p=>p[0])), maxX: Math.max(...ring.map(p=>p[0])),
  minY: Math.min(...ring.map(p=>p[1])), maxY: Math.max(...ring.map(p=>p[1])),
}))

function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx=b[0]-a[0], dy=b[1]-a[1], length=dx*dx+dy*dy
  const t=length ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) : 0
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
}
function segmentDistance(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number {
  const cross=(p: Vec2,q: Vec2,r: Vec2)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
  // Collinear edges use the distance fallback, which also handles stationary animals.
  if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) return 0
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))
}

/** Sweep the entire body clearance along the move, including thin fences
 * between frames. A circular envelope keeps head/tail safe while turning. */
export function isAnimalTravelClear(from: Vec2, to: Vec2, radius: number): boolean {
  const minX=Math.min(from[0],to[0])-radius, maxX=Math.max(from[0],to[0])+radius
  const minY=Math.min(from[1],to[1])-radius, maxY=Math.max(from[1],to[1])+radius
  return !obstacles.some(o => {
    if(o.maxX<minX || o.minX>maxX || o.maxY<minY || o.minY>maxY) return false
    return pointInPolygon(from,o.ring) || pointInPolygon(to,o.ring) ||
      o.ring.some((a,i) => segmentDistance(from,to,a,o.ring[(i+1)%o.ring.length]) <= radius)
  })
}
