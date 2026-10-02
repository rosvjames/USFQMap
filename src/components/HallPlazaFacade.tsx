import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, MeshStandardMaterial, Shape, Vector2 } from 'three'
import type { Vec2 } from '../types'
import type { CampusMaterials } from '../lib/materials'
import { HALL_PLAZA_FACE as face, HALL_PLAZA_WING } from '../lib/hallPlaza'

const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
export function HallPlazaFacade({materials}:{materials:CampusMaterials}) {
  const finishes=useMemo(()=>({
    yellow:new MeshStandardMaterial({color:'#e3be78',roughness:.95}),
    green:new MeshStandardMaterial({color:'#3f7263',roughness:.86}),
    iron:new MeshStandardMaterial({color:'#293c33',roughness:.65,metalness:.4}),
  }),[])
  const upper=useMemo(()=>new ExtrudeGeometry(HALL_PLAZA_WING.map(p=>new Shape((p[0] as Vec2[]).map(([x,y])=>new Vector2(x,y)))),{depth:2,bevelEnabled:false}),[])
  const arch=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-.5,0);shape.lineTo(.5,0);shape.lineTo(.5,1.5);shape.absarc(0,1.5,.5,0,Math.PI,false);shape.lineTo(-.5,0)
    return new ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false,curveSegments:16})
  },[])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());upper.dispose();arch.dispose()},[finishes,upper,arch])
  return <group>
    {/* Add height above the existing wing; the complete Hall ground volume stays intact. */}
    <mesh geometry={upper} position={[0,5.5,0]} rotation={[-Math.PI/2,0,0]} material={finishes.yellow} castShadow receiveShadow raycast={noRaycast}/>
    <group position={[face.start[0],0,-face.start[1]]} rotation={[0,face.angle,0]}>
      <Block at={[face.length/2,3.75,.08]} size={[face.length,7.5,.2]} material={finishes.yellow}/>
      {[.7,3.85,7.4].map(y=><Block key={y} at={[face.length/2,y,.2]} size={[face.length,.16,.34]} material={materials.cream}/>)}
      {Array.from({length:9},(_,i)=>(i+.5)*face.length/9).map(x=>[0,1].map(floor=><group key={`${x}-${floor}`}>
        <mesh geometry={arch} position={[x,floor?4.65:.85,.22]} scale={[floor?1.12:1.95,floor?.95:1.38,1]} material={materials.cream} receiveShadow raycast={noRaycast}/>
        <mesh geometry={arch} position={[x,floor?4.78:.97,.34]} scale={[floor?.85:1.68,floor?.84:1.25,1]} material={finishes.iron} receiveShadow raycast={noRaycast}/>
        <Block at={[x,floor?5.63:2.27,.49]} size={[.045,floor?1.65:2.55,.05]} material={finishes.green}/>
      </group>))}
      {Array.from({length:24},(_,i)=><Block key={i} at={[(i+.5)*face.length/24,7.2,.49]} size={[.22,.26,.52]} material={materials.cream}/>)}
      <Block at={[face.door,1.015,1.5]} size={[5,.87,3]} material={materials.entranceStone}/>
      {Array.from({length:6},(_,i)=>{
        const top=face.level-i*(face.level-face.ground)/6
        return <Block key={i} at={[face.door,(top+.4)/2,3+(i+.5)*.45]} size={[5,top-.4,.45]} material={materials.entranceStone}/>
      })}
      <Block at={[face.door,2.76,.53]} size={[2.65,2.62,.1]} material={finishes.iron}/>
      {[-1.31,0,1.31].map(x=><Block key={x} at={[face.door+x,2.76,.65]} size={[.055,2.62,.065]} material={finishes.green}/>)}
      <group position={[face.door,4.12,.12]}>
        <mesh scale={[2.15,.82,2.35]} material={finishes.green} castShadow receiveShadow raycast={noRaycast}><sphereGeometry args={[1,32,16,0,Math.PI,0,Math.PI/2]}/></mesh>
        {Array.from({length:25},(_,i)=>{
          const a=i*Math.PI/24
          return <mesh key={i} position={[2.13*Math.cos(a),-.09,2.33*Math.sin(a)]} rotation={[0,Math.PI/2-a,Math.PI]} material={materials.cream} raycast={noRaycast}><torusGeometry args={[.115,.018,5,12,Math.PI]}/></mesh>
        })}
      </group>
      {[-1.9,1.9].map(x=><Block key={x} at={[face.door+x,2.78,1.95]} size={[.065,2.66,.065]} material={finishes.iron}/>)}
    </group>
  </group>
}
