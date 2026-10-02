import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Vec2 } from '../types'
import { findCampusBuilding } from './campus'

const building=findCampusBuilding('gobe')!
const a=building.ring[3], b=building.ring[2]
const width=Math.hypot(b[0]-a[0],b[1]-a[1]), ux=(b[0]-a[0])/width, uy=(b[1]-a[1])/width
export const CASITA = {
  center:[(a[0]+b[0])/2,(a[1]+b[1])/2] as Vec2,
  angle:Math.atan2(uy,ux), width,
  depth:Math.hypot(building.ring[0][0]-a[0],building.ring[0][1]-a[1]),
  height:6.4, rise:2.25,
}
export function casitaToCampus([x,z]:Vec2):Vec2 {
  return [CASITA.center[0]+ux*x+uy*z,CASITA.center[1]+uy*x-ux*z]
}

/** Two continuous roof planes meeting at a ridge parallel to the house depth. */
export function createCasitaRoof():BufferGeometry {
  const half=CASITA.width/2+.28, front=.3, back=-CASITA.depth-.3, eave=CASITA.height, ridge=eave+CASITA.rise
  const corners=[[-half,eave,front],[0,ridge,front],[0,ridge,back],[-half,eave,back],[half,eave,front],[half,eave,back]]
  const geometry=new BufferGeometry()
  geometry.setAttribute('position',new Float32BufferAttribute(corners.flat(),3))
  geometry.setAttribute('uv',new Float32BufferAttribute(corners.flatMap(([x,,z])=>[x/2.4,z/2.4]),2))
  geometry.setIndex([0,1,2,0,2,3,1,4,5,1,5,2]);geometry.computeVertexNormals();return geometry
}
