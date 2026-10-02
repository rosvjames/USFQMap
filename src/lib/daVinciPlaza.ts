import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

const ring=findCampusBuilding('da-vinci')!.ring
const start=ring[0],end=ring[3]
const length=Math.hypot(end[0]-start[0],end[1]-start[1])
const ux=(end[0]-start[0])/length,uy=(end[1]-start[1])/length
// The two model captures identify the northwest front and the plaza facing it.
export const DA_VINCI_FRONT={start,length,angle:Math.atan2(uy,ux),portico:22,level:1.45,ground:.58,platformFront:5.1,stairFront:7.8}
export function daVinciFrontToCampus([x,z]:Vec2):Vec2{return [start[0]+ux*x+uy*z,start[1]+uy*x-ux*z]}
export function campusToDaVinciFront([x,y]:Vec2):Vec2 {
  const dx=x-start[0],dy=y-start[1]
  return [dx*ux+dy*uy,dx*uy-dy*ux]
}
export const DA_VINCI_PLAZA:Vec2[]=[[1,.4],[40,.4],[40,24],[1,40]]
export const DA_VINCI_WORLD_PLAZA=DA_VINCI_PLAZA.map(daVinciFrontToCampus)
export const DA_VINCI_FOUNTAIN={center:[19,16] as Vec2,radius:5.3}
export const DA_VINCI_PLAZA_TREES=[{at:[5,18] as Vec2,palm:false},{at:[32,12] as Vec2,palm:true}]
// The new side photograph shows grass surrounding the circular stone steps,
// with the route from the colonnade and a crosswalk kept paved.
export const DA_VINCI_LAWNS:Vec2[][]=[([[2,8.4],[37,8.4],[37,24],[2,24]] as Vec2[]).map(daVinciFrontToCampus)]
const circle:Vec2[]=Array.from({length:64},(_,i)=>[fountainPoint(0,i),fountainPoint(1,i)])
function fountainPoint(axis:0|1,i:number):number{return DA_VINCI_FOUNTAIN.center[axis]+5.95*(axis===0?Math.cos(i*Math.PI/32):Math.sin(i*Math.PI/32))}
export const DA_VINCI_GARDEN_PATHS:Vec2[][]=([circle,[[20.1,7.7],[24,7.7],[24,25],[20.1,25]],[[1,22],[39,22],[39,24],[1,24]]] as Vec2[][]).map(ring=>ring.map(daVinciFrontToCampus))
export function isDaVinciPlaza(point:Vec2):boolean{return pointInPolygon(point,DA_VINCI_WORLD_PLAZA)}
export function daVinciFrontHeightAt(point:Vec2):number|undefined {
  const [x,z]=campusToDaVinciFront(point),p=DA_VINCI_FRONT
  if(Math.abs(x-p.portico)<=7.4&&z>=.4&&z<=p.platformFront)return p.level
  if(Math.abs(x-p.portico)<=7.4&&z>p.platformFront&&z<=p.stairFront)return p.level+(p.ground-p.level)*(z-p.platformFront)/(p.stairFront-p.platformFront)
  if(isDaVinciPlaza(point))return p.ground
}
