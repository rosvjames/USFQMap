import { HALL_EINSTEIN_GAP, HALL_EINSTEIN_OPEN_LENGTH } from './campus'
import { campusToHall, hallToCampus, HALL_ENTRANCE } from './hall'
import type { Vec2 } from '../types'

// User identifies the stairs beside the right entrance pillar as the passage to Einstein.
// The passage lies OUTSIDE the Hall, beyond its right pillar and intact side wall.
const hallSide = HALL_ENTRANCE.width/2
export const HALL_PASSAGE = { left:hallSide+.15,right:hallSide+HALL_EINSTEIN_GAP-.15,back:-HALL_EINSTEIN_OPEN_LENGTH,steps:6,stairBack:-2.7,center:hallSide+HALL_EINSTEIN_GAP/2 }
const {center} = HALL_PASSAGE
export const HALL_TUNNEL = {mouth:HALL_PASSAGE.back,back:-32,left:HALL_PASSAGE.left+.2,right:HALL_PASSAGE.right-.2,ceiling:4.2,lower:HALL_ENTRANCE.ground,upper:HALL_ENTRANCE.level}
// The photo confirms Einstein's entrance on the right, just before the tunnel.
// Rendering and routing share this position so arrivals stay beside the doorway.
export const EINSTEIN_ENTRANCE = {wall:hallSide+HALL_EINSTEIN_GAP,z:HALL_TUNNEL.mouth+2.2,width:2.7,height:3.05,ground:HALL_ENTRANCE.ground}
export const HALL_TUNNEL_CUTOUT:Vec2[]=([[HALL_TUNNEL.left,HALL_TUNNEL.mouth+.08],[HALL_TUNNEL.right,HALL_TUNNEL.mouth+.08],[HALL_TUNNEL.right,HALL_TUNNEL.back],[HALL_TUNNEL.left,HALL_TUNNEL.back]] as Vec2[]).map(hallToCampus)
export function hallTunnelHeightAt(point:Vec2):number|undefined {
  const [x,z]=campusToHall(point),t=HALL_TUNNEL
  if(x<t.left-1e-6||x>t.right+1e-6||z>t.mouth+1e-6||z<t.back-1e-6)return
  return t.lower+(t.upper-t.lower)*(t.mouth-z)/(t.mouth-t.back)
}
export function isHallTunnelMouthEdge(a:Vec2,b:Vec2):boolean {
  return [a,b].every(p=>{const [x,z]=campusToHall(p);return Math.abs(z-HALL_TUNNEL.mouth)<.05&&x>hallSide-.3&&x<hallSide+HALL_EINSTEIN_GAP+.3})
}
export const HALL_EINSTEIN_PATH:Vec2[]=([[0,8.4],[2,4],[9.05,2],[center,2],[center,0],[center,-2.7],[center,EINSTEIN_ENTRANCE.z],[EINSTEIN_ENTRANCE.wall-.4,EINSTEIN_ENTRANCE.z]] as Vec2[]).map(hallToCampus)
export const EINSTEIN_HALL_DOOR = HALL_EINSTEIN_PATH.at(-1)!
export function hallPassageHeightAt(point:Vec2):number|undefined {
  const ramp=hallTunnelHeightAt(point)
  if(ramp!==undefined)return ramp
  const [x,z]=campusToHall(point),p=HALL_PASSAGE,h=HALL_ENTRANCE
  if(x<p.left||x>p.right||z>2.8||z<p.back)return
  if(z>=0)return h.level
  if(z<p.stairBack)return h.ground
  return h.ground+(h.level-h.ground)*(z-p.stairBack)/(-p.stairBack)
}
export function isEinsteinHallDoor(point:Vec2):boolean {
  const [x,z]=campusToHall(point)
  return Math.abs(x-EINSTEIN_ENTRANCE.wall)<.5&&Math.abs(z-EINSTEIN_ENTRANCE.z)<EINSTEIN_ENTRANCE.width/2+.65
}
