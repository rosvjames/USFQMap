import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

// The student's view from Da Vinci locates this east face and its northern tower.
// Dimensions and the street stairs are visual estimates, pending the second photo.
const ring=findCampusBuilding('epicuro')!.ring
const a=ring[0],b=ring[2],length=Math.hypot(b[0]-a[0],b[1]-a[1])
const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length
export const EPICURO_FRONT={start:a,angle:Math.atan2(uy,ux),length,height:14,raised:3.2,ground:.58,towerX:24,towerWidth:6.2,towerDepth:7,towerHeight:18.8}
export function epicuroToCampus([x,z]:Vec2):Vec2{return [a[0]+ux*x+uy*z,a[1]+uy*x-ux*z]}
export function campusToEpicuro([x,y]:Vec2):Vec2 {
  const dx=x-a[0],dy=y-a[1];return [dx*ux+dy*uy,dx*uy-dy*ux]
}
export function isEpicuroFrontEdge(p:Vec2,q:Vec2):boolean {
  return [0,1].some(i=>Math.hypot(p[0]-ring[i][0],p[1]-ring[i][1])<.01&&Math.hypot(q[0]-ring[i+1][0],q[1]-ring[i+1][1])<.01)
}
export const EPICURO_TOWER_RING:Vec2[]=([[20.9,-.08],[27.1,-.08],[27.1,-7],[20.9,-7]] as Vec2[]).map(epicuroToCampus)
export const EPICURO_FORECOURT:Vec2[]=([[0,.3],[33.4,.3],[33.4,7.8],[27,12],[0,12]] as Vec2[]).map(epicuroToCampus)
export const EPICURO_FOUNTAIN={x:21.6,z:6.5,radius:2.8}
// The upper landing faces Pampite; the run descends south into the Da Vinci court.
export const EPICURO_STREET_STAIRS={top:33,z:5.3,width:4.4,landing:1.8,steps:8,run:.42,level:2.15,ground:.58}
export const EPICURO_STAIR_FOOT=EPICURO_STREET_STAIRS.top-EPICURO_STREET_STAIRS.landing-EPICURO_STREET_STAIRS.steps*EPICURO_STREET_STAIRS.run
export function epicuroHeightAt(point:Vec2):number|undefined {
  const [x,z]=campusToEpicuro(point),s=EPICURO_STREET_STAIRS
  if(Math.abs(z-s.z)<=s.width/2&&x>=EPICURO_STAIR_FOOT-1e-6&&x<=s.top+1e-6) {
    if(x>=s.top-s.landing)return s.level
    return s.ground+(s.level-s.ground)*Math.max(0,Math.min(1,(x-EPICURO_STAIR_FOOT)/(s.steps*s.run)))
  }
}
export function isEpicuroForecourt(point:Vec2):boolean{return pointInPolygon(point,EPICURO_FORECOURT)}
