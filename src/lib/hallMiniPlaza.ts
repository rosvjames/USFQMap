import { hallToCampus } from './hall'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

// Fit the cropped photo symmetrically into the empty pocket left of the Hall.
// Keep clear of Eugenio Espejo, the Hall walls and the main entrance platform.
export const HALL_MINI_PLAZA={left:-23.25,right:-9.8,back:-9.1,front:.3,ground:.57,gateWidth:2.1}
const p=HALL_MINI_PLAZA
export const HALL_MINI_CENTER:Vec2=[(p.left+p.right)/2,(p.back+p.front)/2]
export const HALL_MINI_OUTLINE:Vec2[]=[[p.left,p.back],[p.right,p.back],[p.right,p.front],[p.left,p.front]]
export const HALL_MINI_WORLD_OUTLINE=HALL_MINI_OUTLINE.map(hallToCampus)
const [cx,cz]=HALL_MINI_CENTER
export const HALL_MINI_BEDS:Vec2[][]=([-1,1] as const).flatMap(sx=>([-1,1] as const).map(sz=>{
  const x=cx+sx*4.6,z=cz+sz*2.8
  return [[x-1.5,z-1.1],[x+1.5,z-1.1],[x+1.5,z+1.1],[x-1.5,z+1.1]] as Vec2[]
}))
export const HALL_MINI_TREES:Vec2[]=[[cx-4.6,cz],[cx+4.6,cz]]
export function isHallMiniPlaza(point:Vec2):boolean{return pointInPolygon(point,HALL_MINI_WORLD_OUTLINE)}
