import { CAMPUS_WALKWAYS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

// Photographic proportions on the existing OSM footprint, not surveyed dimensions.
const ring=findCampusBuilding('newton')!.ring
const a=ring[6],b=ring[5],width=Math.hypot(b[0]-a[0],b[1]-a[1])
const ux=(b[0]-a[0])/width,uy=(b[1]-a[1])/width
export const NEWTON_ENTRANCE={center:[(a[0]+b[0])/2,(a[1]+b[1])/2] as Vec2,angle:Math.atan2(uy,ux),width,
  height:7.4,floors:2,x:1.8,ground:.55,level:1.15,platformFront:1.2,stairFront:2.46,steps:4,stairWidth:4.4,portalWidth:5}
export function newtonToCampus([x,z]:Vec2):Vec2 {
  return [NEWTON_ENTRANCE.center[0]+ux*x+uy*z,NEWTON_ENTRANCE.center[1]+uy*x-ux*z]
}
export function campusToNewton([x,y]:Vec2):Vec2 {
  const dx=x-NEWTON_ENTRANCE.center[0],dy=y-NEWTON_ENTRANCE.center[1]
  return [dx*ux+dy*uy,dx*uy-dy*ux]
}
export function isNewtonFrontEdge(start:Vec2,end:Vec2) {
  return Math.hypot(start[0]-b[0],start[1]-b[1])<.01&&Math.hypot(end[0]-a[0],end[1]-a[1])<.01
}
const h=NEWTON_ENTRANCE
export const NEWTON_LAWNS:Vec2[][]=[
  [[-width/2,.3],[h.x-h.stairWidth/2-.4,.3],[h.x-h.stairWidth/2-.4,3],[-width/2,3]],
  [[h.x+h.stairWidth/2+.4,.3],[width/2,.3],[width/2,3],[h.x+h.stairWidth/2+.4,3]],
].map(r=>r.map(p=>newtonToCampus(p as Vec2)))
export function newtonHeightAt(point:Vec2):number|undefined {
  const [x,z]=campusToNewton(point)
  if(Math.abs(x-h.x)<=h.stairWidth/2&&z>=0&&z<=h.stairFront)return z<=h.platformFront?h.level:h.level+(h.ground-h.level)*(z-h.platformFront)/(h.stairFront-h.platformFront)
  if(NEWTON_LAWNS.some(r=>pointInPolygon(point,r)))return h.ground+(h.level-h.ground)*Math.max(0,1-z/3)
}
export const NEWTON_DOOR_APPROACH=newtonToCampus([h.x,h.stairFront])
// Attach to the nearest segment of the existing connected lagoon footway.
const footway=CAMPUS_WALKWAYS.find(w=>w.osmId==='way/1036865904')!
const joins=footway.line.slice(1).map((q,i)=>{
  const p=footway.line[i],dx=q[0]-p[0],dy=q[1]-p[1]
  const t=Math.max(0,Math.min(1,((NEWTON_DOOR_APPROACH[0]-p[0])*dx+(NEWTON_DOOR_APPROACH[1]-p[1])*dy)/(dx*dx+dy*dy)))
  const point:Vec2=[p[0]+t*dx,p[1]+t*dy]
  return {p,q,point,gap:Math.hypot(point[0]-NEWTON_DOOR_APPROACH[0],point[1]-NEWTON_DOOR_APPROACH[1])}
})
const join=joins.reduce((best,j)=>j.gap<best.gap?j:best)
export const NEWTON_ACCESS_PATH:Vec2[]=[join.p,join.point,NEWTON_DOOR_APPROACH]
export const NEWTON_ACCESS_JOIN_END=join.q
