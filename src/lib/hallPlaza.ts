import polygonClipping from 'polygon-clipping'
import { findCampusBuilding } from './campus'
import type { Vec2 } from '../types'

const hall=findCampusBuilding('hall-principal')!
const start=hall.ring[5],end=hall.ring[6]
const length=Math.hypot(end[0]-start[0],end[1]-start[1]),ux=(end[0]-start[0])/length,uy=(end[1]-start[1])/length
// The student identifies this previously red wing as the yellow arched facade in the fountain photo.
export const HALL_PLAZA_FACE={start,length,angle:Math.atan2(uy,ux),height:7.5,door:24.4,level:1.45,ground:.58}
export function hallPlazaToCampus([x,z]:Vec2):Vec2{return [start[0]+ux*x+uy*z,start[1]+uy*x-ux*z]}
const wing:Vec2[]=([[0,-5],[length,-5],[length,0],[0,0]] as Vec2[]).map(hallPlazaToCampus)
export const HALL_PLAZA_WING=polygonClipping.intersection([hall.ring],[wing])
export const HALL_PLAZA_REMAINDER=polygonClipping.difference([hall.ring],HALL_PLAZA_WING)
export function isHallPlazaEdge(a:Vec2,b:Vec2):boolean {return Math.hypot(a[0]-start[0],a[1]-start[1])<.01&&Math.hypot(b[0]-end[0],b[1]-end[1])<.01}
export function hallPlazaHeightAt(point:Vec2):number|undefined {
  const dx=point[0]-start[0],dy=point[1]-start[1],x=dx*ux+dy*uy,z=dx*uy-dy*ux
  if(Math.abs(x-HALL_PLAZA_FACE.door)>2.5||z<.1||z>5.7)return
  if(z<=3)return HALL_PLAZA_FACE.level
  return HALL_PLAZA_FACE.level+(.58-HALL_PLAZA_FACE.level)*(z-3)/2.7
}
