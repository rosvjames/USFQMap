import polygonClipping from 'polygon-clipping'
import { findCampusBuilding } from './campus'
import type { Vec2 } from '../types'

const building = findCampusBuilding('miguel-de-santiago')!
export const MIGUEL_ENTRANCE = { center: [-95, -37.8] as Vec2, angle: Math.PI, x: -12.5, ground: .55, level: 1.45, platformFront: 5.5, stairFront: 7.5 }
export function miguelToCampus([x,z]:Vec2):Vec2 { return [MIGUEL_ENTRANCE.center[0]-x,MIGUEL_ENTRANCE.center[1]+z] }
export const MIGUEL_FORECOURT: Vec2[] = [[-24,.4],[23,.4],[23,18],[-24,18]]
export const MIGUEL_WORLD_FORECOURT = MIGUEL_FORECOURT.map(miguelToCampus)
// The student places the campus gate between the first two windows facing Miguel.
const gateBuilding = findCampusBuilding('guardiania-norte')!
const gateA = gateBuilding.ring[2], gateB = gateBuilding.ring[3]
export const CAMPUS_GATE = {
  center: [(gateA[0]+gateB[0])/2,(gateA[1]+gateB[1])/2] as Vec2,
  angle: Math.atan2(gateB[1]-gateA[1],gateB[0]-gateA[0]),
  width: 2.8, lintel: 3.15,
}
export const CAMPUS_GATE_CUTOUT = ([[2.8,7.75],[12,7.75],[12,10.55],[2.8,10.55]] as Vec2[]).map(miguelToCampus)
export const CAMPUS_GATE_LINTEL = polygonClipping.intersection([gateBuilding.ring],[CAMPUS_GATE_CUTOUT])
// Preserve OSM's perimeter; the photograph supplies the stepped wing heights.
export const MIGUEL_VOLUMES = [
  {left:-119,right:-94,height:10.5,rise:1.35},
  {left:-94,right:-86.8,height:12.4,rise:1.6},
  {left:-86.8,right:-79.8,height:10.5,rise:1.35},
  {left:-79.8,right:-71,height:7,rise:0},
].flatMap(section=>polygonClipping.intersection([building.ring],[[[section.left,-70],[section.right,-70],[section.right,-30],[section.left,-30]]]).map(polygon=>({...section,ring:polygon[0] as Vec2[]})))
export function isMiguelExteriorEdge(a:Vec2,b:Vec2):boolean {
  const p:Vec2=[(a[0]+b[0])/2,(a[1]+b[1])/2]
  return building.ring.some((start,i)=>{
    const end=building.ring[(i+1)%building.ring.length],dx=end[0]-start[0],dy=end[1]-start[1], l=Math.hypot(dx,dy)
    if(l<.01)return false
    const t=((p[0]-start[0])*dx+(p[1]-start[1])*dy)/(l*l)
    return t>=0&&t<=1&&Math.hypot(p[0]-start[0]-t*dx,p[1]-start[1]-t*dy)<.01
  })
}
export function miguelEntranceHeightAt(point:Vec2):number|undefined {
  const [x,y]=point,z=y-MIGUEL_ENTRANCE.center[1],localX=MIGUEL_ENTRANCE.center[0]-x,h=MIGUEL_ENTRANCE
  if(localX>=-22&&localX<=-7.6&&z>=.4&&z<=h.platformFront)return h.level
  if(Math.abs(localX-h.x)<=5&&z>h.platformFront&&z<=h.stairFront)return h.level+(h.ground-h.level)*(z-h.platformFront)/(h.stairFront-h.platformFront)
}
