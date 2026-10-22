import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

// The second photograph identifies the stepped south face of Miguel de Santiago.
const ring=findCampusBuilding('miguel-de-santiago')!.ring
const a=ring[20],b=ring[18],width=Math.hypot(b[0]-a[0],b[1]-a[1])
const ux=(b[0]-a[0])/width,uy=(b[1]-a[1])/width
export const MIGUEL_GARDEN_ENTRANCE={center:[(a[0]+b[0])/2,(a[1]+b[1])/2] as Vec2,angle:Math.atan2(uy,ux),width,height:15.5,depth:5.2,ground:.57}
export function miguelGardenToCampus([x,z]:Vec2):Vec2 {
  return [MIGUEL_GARDEN_ENTRANCE.center[0]+ux*x+uy*z,MIGUEL_GARDEN_ENTRANCE.center[1]+uy*x-ux*z]
}
export function campusToMiguelGarden([x,y]:Vec2):Vec2 {
  const dx=x-MIGUEL_GARDEN_ENTRANCE.center[0],dy=y-MIGUEL_GARDEN_ENTRANCE.center[1]
  return [dx*ux+dy*uy,dx*uy-dy*ux]
}
export const MIGUEL_GARDEN_TOWER_RING:Vec2[]=([[-width/2+.2,.0],[width/2-.2,.0],[width/2-.2,-5.2],[-width/2+.2,-5.2]] as Vec2[]).map(miguelGardenToCampus)
// Cut the original pitched roof back from the complete glazed shaft.
export const MIGUEL_GARDEN_ROOF_CUT:Vec2[]=([[-width/2-.2,.15],[width/2+.2,.15],[width/2+.2,-5.45],[-width/2-.2,-5.45]] as Vec2[]).map(miguelGardenToCampus)
export const MIGUEL_GARDEN_FORECOURT:Vec2[]=([[-6,.3],[22,.3],[22,23],[-6,23]] as Vec2[]).map(miguelGardenToCampus)
export const MIGUEL_GARDEN_APPROACH:Vec2[]=([[0,.45],[.19,7],[.05,14]] as Vec2[]).map(miguelGardenToCampus)
// Photo-derived dimensions: keep the exhibit and furniture clear of the mapped approach.
export const MIGUEL_ROCKET={at:[8.5,8] as Vec2,base:4.2,height:19,radius:.86}
export const MIGUEL_GARDEN_BIN={at:[10,16] as Vec2,width:2.1,depth:.85}
export const MIGUEL_GARDEN_TABLES:Vec2[]=[[16,16],[18,20]]
export const MIGUEL_ROCKET_BASE:Vec2[]=([[-1,-1],[1,-1],[1,1],[-1,1]] as Vec2[]).map(([x,z])=>miguelGardenToCampus([MIGUEL_ROCKET.at[0]+x*MIGUEL_ROCKET.base/2,MIGUEL_ROCKET.at[1]+z*MIGUEL_ROCKET.base/2]))
/** Recessed south/east glazed wings visible behind the rocket, including split volume edges. */
export function isMiguelGlazedGardenFace(a:Vec2,b:Vec2):boolean {
  const p:Vec2=[(a[0]+b[0])/2,(a[1]+b[1])/2]
  return ring.slice(12,20).some((start,i)=>{
    const end=ring[i+13],dx=end[0]-start[0],dy=end[1]-start[1],length=dx*dx+dy*dy
    const t=((p[0]-start[0])*dx+(p[1]-start[1])*dy)/length
    return t>=0&&t<=1&&Math.hypot(p[0]-start[0]-t*dx,p[1]-start[1]-t*dy)<.06
  })
}
export function isMiguelGardenTowerFace(a:Vec2,b:Vec2):boolean {
  const [x,z]=campusToMiguelGarden([(a[0]+b[0])/2,(a[1]+b[1])/2])
  return Math.abs(z)<.06&&Math.abs(x)<=width/2+.1
}
export function isMiguelGardenForecourt(point:Vec2):boolean{return pointInPolygon(point,MIGUEL_GARDEN_FORECOURT)}
