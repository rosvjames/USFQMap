import { CAMPUS_AREAS, CAMPUS_BUILDINGS, CAMPUS_WALKWAYS, findCampusBuilding } from './campus'
import { NEWTON_LAWNS } from './newton'
import { centroid, pointInPolygon } from './geo'
import type { Vec2 } from '../types'

// Lake-facing edge of the existing footprint. Heights and portal dimensions are
// visual estimates from the student's diagonal photograph, not surveyed dimensions.
const building = findCampusBuilding('galileo')!
const a = building.ring[2], b = building.ring[3]
const length = Math.hypot(b[0]-a[0],b[1]-a[1])
const ux = (b[0]-a[0])/length, uy = (b[1]-a[1])/length
export const GALILEO_ENTRANCE = {
  center:[(a[0]+b[0])/2,(a[1]+b[1])/2] as Vec2,
  angle:Math.atan2(uy,ux),width:length,x:-3.6,
  ground:.55,level:1.6,platformFront:3,stairFront:5.52,steps:6,stairWidth:6.4,portalWidth:7.4,
}
export function galileoToCampus([x,z]:Vec2):Vec2 {
  return [GALILEO_ENTRANCE.center[0]+ux*x+uy*z,GALILEO_ENTRANCE.center[1]+uy*x-ux*z]
}
export function campusToGalileo([x,y]:Vec2):Vec2 {
  const dx=x-GALILEO_ENTRANCE.center[0],dy=y-GALILEO_ENTRANCE.center[1]
  return [dx*ux+dy*uy,dx*uy-dy*ux]
}
export function isGalileoFrontEdge(start:Vec2,end:Vec2):boolean {
  return Math.hypot(start[0]-a[0],start[1]-a[1])<.01&&Math.hypot(end[0]-b[0],end[1]-b[1])<.01
}
const h=GALILEO_ENTRANCE
export const GALILEO_LAWNS:Vec2[][] = [
  [[-length/2,.3],[h.x-3.65,.3],[h.x-3.65,6],[-length/2,9]],
  [[h.x+3.65,.3],[length/2,.3],[length/2,9],[h.x+3.65,6]],
].map(r=>r.map(p=>galileoToCampus(p as Vec2)))
export function galileoHeightAt(point:Vec2):number|undefined {
  const [x,z]=campusToGalileo(point)
  if(Math.abs(x-h.x)<=h.stairWidth/2&&z>=0&&z<=h.stairFront) {
    return z<=h.platformFront?h.level:h.level+(h.ground-h.level)*(z-h.platformFront)/(h.stairFront-h.platformFront)
  }
  if(GALILEO_LAWNS.some(r=>pointInPolygon(point,r)))return h.ground+(h.level-h.ground)*(1-z/9)
}
export const GALILEO_DOOR_APPROACH=galileoToCampus([h.x,h.stairFront])
// Attach the photographed access to the existing mapped footway at its nearest point.
const footway=CAMPUS_WALKWAYS.find(w=>w.osmId==='way/1036865905')!
const [p,q]=footway.line
const dx=q[0]-p[0],dy=q[1]-p[1],t=Math.max(0,Math.min(1,((GALILEO_DOOR_APPROACH[0]-p[0])*dx+(GALILEO_DOOR_APPROACH[1]-p[1])*dy)/(dx*dx+dy*dy)))
export const GALILEO_ACCESS_PATH:Vec2[]=[p,[p[0]+dx*t,p[1]+dy*t],GALILEO_DOOR_APPROACH]

export const GALILEO_LAGOON=CAMPUS_AREAS.find(a=>a.osmId==='way/447597128')!
const lakeCenter=centroid(GALILEO_LAGOON.ring)
// A planted margin replaces the pavement directly against the main lake; retain its OSM water outline.
export const LAGOON_GARDEN=GALILEO_LAGOON.ring.map(([x,y]):Vec2=>[lakeCenter[0]+(x-lakeCenter[0])*1.14,lakeCenter[1]+(y-lakeCenter[1])*1.2])
export const LAGOON_PALMS:Vec2[]=[[-10.5,-31.6],[-2.5,-37.6],[10,-37.3],[27,-37.6],[39,-31.8],[44.8,-25.3],[38.5,-17.3],[24,-17.5],[11,-22.5]]
export function isGalileoLandscape(point:Vec2):boolean {
  return [...GALILEO_LAWNS,...NEWTON_LAWNS].some(r=>pointInPolygon(point,r))||pointInPolygon(point,LAGOON_GARDEN)
}
export function clearLagoonPlant(point:Vec2,clearance=.8):boolean {
  if(CAMPUS_BUILDINGS.some(b=>pointInPolygon(point,b.ring))||pointInPolygon(point,GALILEO_LAGOON.ring))return false
  return !CAMPUS_WALKWAYS.some(w=>w.line.some((b,i)=>{
    if(!i)return false
    const a=w.line[i-1],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy)))
    return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)<w.width/2+clearance
  }))
}
