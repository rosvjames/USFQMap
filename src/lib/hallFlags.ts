import { CAMPUS_AREAS } from './campus'
import { hallToCampus, campusToHall } from './hall'
import { pointInPolygon } from './geo'
import type { Vec2 } from '../types'

export const HALL_FLAG_LAWN = CAMPUS_AREAS.find(a=>a.osmId==='way/1369166967')!.ring
export const HALL_FLAG_GARDEN={left:-11.5,right:2.25,front:73.45,back:14.8,ground:.55}
export const HALL_FLAGS=([-1,1] as const).flatMap(side=>Array.from({length:5},(_,i)=>({
  side, at:[side<0?-10.3:1.1,69.6-i*2.6] as Vec2,
  colors: (side<0 ? [['#198abe','#7d6041'],['#254735','#d4be55'],['#b64e53','#3b3438'],['#294680','#bd5660'],['#be9b49','#294779']] : [['#2a97b9','#6a665e'],['#2d346a','#d3a451'],['#b35d59','#d6bb54'],['#c1994c','#2c8294'],['#78707d','#324788']])[i],
  letters:(side<0?['GV','CP','SO','BF','GM']:['MV','DF','JL','DG','PS'])[i],
})))
export function isHallFlagGarden(point:Vec2):boolean {
  if(pointInPolygon(point,HALL_FLAG_LAWN))return true
  // Remove crowns that would overhang the open lawn from its previous planted edge.
  const [x,z]=campusToHall(point),g=HALL_FLAG_GARDEN
  return x>=g.left-1.5&&x<=g.right+1.5&&z>=g.back&&z<=g.front+1.5
}
export const HALL_FLAGS_VIEW=hallToCampus([-4.65,63])
