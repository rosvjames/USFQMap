import type { Vec2 } from '../types'
export type WalkAction = 'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight'
export interface WalkInputState { actions:Set<WalkAction>; movement:Vec2 }
export interface WalkInput { current:WalkInputState }

/** Side/forward axes: a resting thumb is neutral and diagonal travel never exceeds full speed. */
export function joystickMovement(dx:number,dy:number,radius:number):Vec2 {
  const length=Math.hypot(dx,dy)
  if(!Number.isFinite(length)||radius<=0||length<radius*.12)return [0,0]
  const scale=Math.min(1,length/radius)/length
  return [dx*scale||0,-dy*scale||0]
}
export function clearWalkInput(input:WalkInputState) {
  input.actions.clear();input.movement=[0,0]
}
