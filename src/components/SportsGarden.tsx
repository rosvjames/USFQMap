import { useLayoutEffect, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'

export const GARDEN_TABLES: Vec2[] = [[-7,-6],[7,-6],[-7,6],[7,6],[0,-10],[0,10]]
type Shrub = [number,number,number,number,number,number]

/** Shared low-poly planting keeps the densely planted garden inexpensive. */
export function SportsPlanting({ shrubs, color = '#718343' }: { shrubs: Shrub[]; color?: string }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new Object3D()
    shrubs.forEach(([x,y,z,sx,sy,sz],i) => {
      object.position.set(x,y,z); object.scale.set(sx,sy,sz); object.rotation.set(0,i*2.4,0); object.updateMatrix()
      ref.current?.setMatrixAt(i,object.matrix)
    })
    if (ref.current) { ref.current.instanceMatrix.needsUpdate=true; ref.current.computeBoundingSphere() }
  },[shrubs])
  return <instancedMesh ref={ref} args={[undefined,undefined,shrubs.length]} castShadow receiveShadow raycast={()=>null}>
    <icosahedronGeometry args={[1,1]} /><meshStandardMaterial color={color} roughness={1} />
  </instancedMesh>
}

const vines: Shrub[] = [], hedges: Shrub[] = [], crowns: Shrub[] = []
for (const [x,z] of GARDEN_TABLES.slice(0,4)) {
  for (const dx of [-2.9,2.9]) for (const dz of [-2.4,2.4]) {
    for (let i=0;i<7;i++) vines.push([x+dx+Math.sin(i*2.2)*.13,.35+i*.43,z+dz,.28,.4,.3])
    for(let i=0;i<6;i++) vines.push([x+dx*.75+i*.3,3.15,z+dz,.38,.18,.4])
  }
}
for (const [x,z,rx,rz] of [[-11,0,1.3,2.2],[11,0,1.3,2.2],[0,0,2.2,1.25],[-7,11.7,2,.65],[7,-11.7,2,.65]]) {
  const count=24
  for(let i=0;i<count;i++) {
    const t=i*Math.PI*2/count
    hedges.push([x+Math.cos(t)*rx,.27,z+Math.sin(t)*rz,.45,.3,.45])
  }
  crowns.push([x,.65,z,rx*.7,.65,rz*.7])
}
for (const [x,z] of [[-12,-10],[12,10],[-12,10],[12,-10]]) {
  crowns.push([x,4.6,z,1.35,1.6,1.3],[x-.75,4.15,z+.2,1,1.25,1])
}

for (const side of [-1,1]) {
  for(let t=-12;t<=12;t+=.65) if(Math.abs(t)>1.8) hedges.push([side*12.5,.35,t,.45,.4,.5],[t,.35,side*12.5,.5,.4,.45])
}

export function GardenTerrace({ materials }: { materials: CampusMaterials }) {
  return <group>
    {/* Open circulation between planting islands and the shaded stone seating pads. */}
    <mesh position={[0,.016,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[25,25]} /><meshStandardMaterial color="#92916a" roughness={1} map={materials.grass.map} /></mesh>
    <mesh position={[0,.035,0]} material={materials.paving} receiveShadow><boxGeometry args={[2.4,.045,26]} /></mesh>
    <mesh position={[0,.04,0]} material={materials.paving} receiveShadow><boxGeometry args={[26,.045,2.1]} /></mesh>
    {GARDEN_TABLES.map(([x,z],i) => <group key={i} position={[x,0,z]}>
      <mesh position={[0,.045,0]} material={materials.entranceStone} receiveShadow><boxGeometry args={[i<4?6.6:4.4,.065,i<4?5.6:4.4]} /></mesh>
      {i<4 ? <group>
        {[-2.9,2.9].flatMap(dx=>[-2.4,2.4].map(dz=><mesh key={`${dx}-${dz}`} position={[dx,1.55,dz]} castShadow><boxGeometry args={[.16,3.1,.16]} /><meshStandardMaterial color="#303b34" roughness={.85} /></mesh>))}
        {[-2.4,2.4].map(dz=><mesh key={dz} position={[0,3.1,dz]} castShadow><boxGeometry args={[6.5,.25,.2]} /><meshStandardMaterial color="#303b34" roughness={.85} /></mesh>)}
        {Array.from({length:13},(_,j)=><mesh key={j} position={[-3+j*.5,3.23,0]} castShadow><boxGeometry args={[.22,.14,5.7]} /><meshStandardMaterial color="#303b34" roughness={.85} /></mesh>)}
      </group> : <group>
        <mesh position={[0,1.45,0]} castShadow><cylinderGeometry args={[.035,.035,2.9,8]} /><meshStandardMaterial color="#444b42" /></mesh>
        <mesh position={[0,2.8,0]} castShadow><coneGeometry args={[2.3,.65,8]} /><meshStandardMaterial color="#bc3336" roughness={.95} /></mesh>
        <mesh position={[0,2.52,0]}><cylinderGeometry args={[2.3,2.3,.09,8,1,true]} /><meshStandardMaterial color="#af3035" /></mesh>
      </group>}
    </group>)}
    <SportsPlanting shrubs={hedges} color="#adb64c" />
    <SportsPlanting shrubs={vines} color="#5c783f" />
    <SportsPlanting shrubs={crowns} color="#4f713f" />
    {[[-12,-10],[12,10],[-12,10],[12,-10]].map(([x,z],i)=><mesh key={i} position={[x,2,z]} castShadow><cylinderGeometry args={[.13,.22,4,8]} /><meshStandardMaterial color="#80755a" /></mesh>)}
    {[[-11,3],[11,-3]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,3.4,0]} castShadow><cylinderGeometry args={[.055,.08,6.8,8]} /><meshStandardMaterial color="#35413b" /></mesh>
      <mesh position={[0,6.8,0]}><boxGeometry args={[.85,.12,.28]} /><meshStandardMaterial color="#e3e4ce" emissive="#d6dfb1" emissiveIntensity={.25} /></mesh>
    </group>)}
  </group>
}

/** Hedge boundary with an opening; dark protective netting sits behind it. */
export function SandCourtPlanting({ width, length }: { width: number; length: number }) {
  const shrubs: Shrub[]=[]
  for(const side of [-1,1]) {
    for(let z=-length/2;z<=length/2;z+=.7) if (!(side===-1 && Math.abs(z)<1.5)) shrubs.push([side*(width/2+.35),.32,z,.48,.35,.48])
    for(let x=-width/2;x<=width/2;x+=.7) shrubs.push([x,.32,side*(length/2+.3),.48,.35,.48])
  }
  return <SportsPlanting shrubs={shrubs} color="#65824c" />
}
