import { useEffect,useMemo } from 'react'
import { MeshStandardMaterial,Vector2 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { HALL_ENTRANCE as hall } from '../lib/hall'
import { HALL_MINI_PLAZA as plaza,HALL_MINI_CENTER as center,HALL_MINI_BEDS,HALL_MINI_TREES } from '../lib/hallMiniPlaza'
import { foliageTexture } from './LandscapeDetails'

type Point=[number,number,number]
const noRaycast=()=>null
const lowerBowl=[[.62,0],[1.04,.16],[1.15,.43],[1.13,.52],[1.02,.52],[.95,.43],[.6,.17]].map(p=>new Vector2(...p as [number,number]))
const upperBowl=[[.18,0],[.55,.19],[.61,.34],[.58,.4],[.49,.4],[.4,.23],[.18,.13]].map(p=>new Vector2(...p as [number,number]))
const pedestal=[[.35,0],[.35,.12],[.24,.23],[.13,.65],[.21,.82],[.3,.92]].map(p=>new Vector2(...p as [number,number]))
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
/** Symmetric, enclosed fountain garden in the pocket left of the main Hall portal. */
export function HallMiniPlaza({materials}:{materials:CampusMaterials}) {
  const texture=useMemo(foliageTexture,[])
  const finish=useMemo(()=>({
    iron:new MeshStandardMaterial({color:'#344138',roughness:.65,metalness:.45}),
    leaves:new MeshStandardMaterial({color:'#60753f',map:texture,alphaTest:.45,roughness:1}),
    hedge:new MeshStandardMaterial({color:'#637b39',roughness:1}),
    flowers:new MeshStandardMaterial({color:'#9c426d',roughness:1}),
    bark:new MeshStandardMaterial({color:'#7a715b',roughness:1}),
    water:new MeshStandardMaterial({color:'#799b8e',roughness:.23,metalness:.25}),
  }),[texture])
  useEffect(()=>()=>{Object.values(finish).forEach(m=>m.dispose());texture.dispose()},[finish,texture])
  const [cx,cz]=center,width=plaza.right-plaza.left,depth=plaza.front-plaza.back
  return <group position={[hall.center[0],0,-hall.center[1]]} rotation={[0,hall.angle,0]}>
    <Block at={[cx,plaza.ground-.04,cz]} size={[width,.08,depth]} material={materials.paving}/>
    {/* Four planted corners leave an axial walk and circulation around the fountain. */}
    {HALL_MINI_BEDS.map((ring,i)=>{
      const [x,z]=[(ring[0][0]+ring[2][0])/2,(ring[0][1]+ring[2][1])/2]
      return <group key={i}>
        <Block at={[x,plaza.ground+.025,z]} size={[3,.05,2.2]} material={materials.garden}/>
        {[-1,1].map(s=><group key={s}>
          <Block at={[x+s*1.52,plaza.ground+.08,z]} size={[.09,.16,2.3]} material={materials.entranceStone}/>
          <Block at={[x,plaza.ground+.08,z+s*1.12]} size={[3.12,.16,.09]} material={materials.entranceStone}/>
          <Block at={[x,plaza.ground+.24,z+s*.98]} size={[2.9,.36,.3]} material={finish.hedge}/>
          {Array.from({length:9},(_,j)=><mesh key={j} position={[x-1.3+j*.325,plaza.ground+.39,z+s*.98]} scale={[.18,.12,.17]} material={finish.flowers} raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>)}
        </group>)}
        {[-.85,0,.85].map(dx=><mesh key={dx} position={[x+dx,plaza.ground+.45,z]} scale={[.3,.45,.3]} material={finish.hedge} castShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>)}
      </group>
    })}
    <group position={[cx,plaza.ground,cz]}>
      <mesh position={[0,.09,0]} material={materials.entranceStone} receiveShadow raycast={noRaycast}><cylinderGeometry args={[1.5,1.5,.18,48]}/></mesh>
      <mesh position={[0,.22,0]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><cylinderGeometry args={[.45,.58,.25,32]}/></mesh>
      <mesh position={[0,.32,0]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><latheGeometry args={[pedestal,32]}/></mesh>
      <mesh position={[0,1.12,0]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><latheGeometry args={[lowerBowl,48]}/></mesh>
      <mesh position={[0,1.57,0]} rotation={[-Math.PI/2,0,0]} material={finish.water} raycast={noRaycast}><circleGeometry args={[.98,48]}/></mesh>
      <mesh position={[0,1.85,0]} material={materials.cream} castShadow raycast={noRaycast}><cylinderGeometry args={[.12,.18,.6,24]}/></mesh>
      <mesh position={[0,2.05,0]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><latheGeometry args={[upperBowl,40]}/></mesh>
      <mesh position={[0,2.4,0]} rotation={[-Math.PI/2,0,0]} material={finish.water} raycast={noRaycast}><circleGeometry args={[.48,40]}/></mesh>
      <mesh position={[0,2.6,0]} material={materials.cream} raycast={noRaycast}><cylinderGeometry args={[.065,.12,.55,20]}/></mesh>
      <mesh position={[0,2.88,0]} material={materials.cream} castShadow raycast={noRaycast}><sphereGeometry args={[.12,16,12]}/></mesh>
    </group>
    {HALL_MINI_TREES.map(([x,z],i)=><group key={i} position={[x,plaza.ground,z]}>
      <mesh position={[0,2.4,0]} material={finish.bark} castShadow raycast={noRaycast}><cylinderGeometry args={[.13,.24,4.8,12]}/></mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*.45,3.85,0]} rotation={[0,0,-s*.5]} material={finish.bark} castShadow raycast={noRaycast}><cylinderGeometry args={[.07,.12,2,8]}/></mesh>)}
      {Array.from({length:7},(_,j)=>{
        const angle=j*2.4,r=j?1.25:0
        return <mesh key={j} position={[Math.cos(angle)*r,5.15+Math.sin(j*2)*.4,Math.sin(angle)*r]} scale={[1.5,1.1,1.4]} material={finish.leaves} castShadow raycast={noRaycast}><icosahedronGeometry args={[1,2]}/></mesh>
      })}
    </group>)}
    {/* Open central gate, mirrored iron fence and pale piers from the cropped photo. */}
    {[plaza.left+.25,cx-plaza.gateWidth/2-.28,cx+plaza.gateWidth/2+.28,plaza.right-.25].map(x=><group key={x}>
      <Block at={[x,plaza.ground+1.03,plaza.front]} size={[.5,2.06,.5]} material={materials.cream}/>
      <Block at={[x,plaza.ground+.18,plaza.front]} size={[.68,.36,.68]} material={materials.entranceStone}/>
      <Block at={[x,plaza.ground+2.08,plaza.front]} size={[.72,.18,.72]} material={materials.cream}/>
      <mesh position={[x,plaza.ground+2.35,plaza.front]} scale={[.2,.2,.2]} material={finish.hedge} raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>
    </group>)}
    {[[plaza.left+.5,cx-plaza.gateWidth/2-.53],[cx+plaza.gateWidth/2+.53,plaza.right-.5]].map(([from,to],i)=><Fence key={i} from={from} to={to} z={plaza.front} floor={plaza.ground} material={finish.iron}/>)}
  </group>
}
function Fence({from,to,z,floor,material}:{from:number;to:number;z:number;floor:number;material:MeshStandardMaterial}) {
  const count=Math.ceil((to-from)/.25)
  return <group>
    {[.2,.95,1.8].map(y=><Block key={y} at={[(from+to)/2,floor+y,z]} size={[to-from,.045,.05]} material={material}/>)}
    {Array.from({length:count+1},(_,i)=><group key={i}>
      <Block at={[from+i*(to-from)/count,floor+1,z]} size={[.025,1.8,.035]} material={material}/>
      <mesh position={[from+i*(to-from)/count,floor+1.94,z]} material={material} raycast={noRaycast}><coneGeometry args={[.045,.16,6]}/></mesh>
    </group>)}
  </group>
}
