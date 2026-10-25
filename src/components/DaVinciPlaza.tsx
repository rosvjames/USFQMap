import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, Vector2 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { CAMPUS_BUILDINGS } from '../lib/campus'
import { createPavedShapes } from '../lib/architecture'
import { DA_VINCI_FRONT as front, DA_VINCI_WORLD_PLAZA, DA_VINCI_FOUNTAIN as fountain, DA_VINCI_PLAZA_TREES, DA_VINCI_LAWNS, DA_VINCI_GARDEN_PATHS } from '../lib/daVinciPlaza'
import { Palm, Tree } from './CampusPlants'

type Point=[number,number,number]
const noRaycast=()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
const basinProfile=[[2.8,0],[3.12,0],[3.12,.55],[2.91,.55],[2.83,.43],[2.8,0]].map(([x,y])=>new Vector2(x,y))
const pedestalProfile=[[.7,0],[.7,.12],[.48,.22],[.27,.5],[.23,1.25],[.48,1.42],[.85,1.55],[.88,1.68],[.35,1.77]].map(([x,y])=>new Vector2(x,y))

/** Photograph-guided northwest colonnade and the paved circular-fountain plaza. */
export function DaVinciPlaza({materials}:{materials:CampusMaterials}) {
  const iron=useMemo(()=>new MeshStandardMaterial({color:'#293831',roughness:.6,metalness:.45}),[])
  // The pane and the fountain water are shared, owned by the campus materials; only the iron is ours to dispose.
  const finishes={glass:materials.glass('#29413b'),iron,water:materials.pondWater}
  // The pale facade is plaster and the alternating plaza bands are paving in warm and dark tones.
  const surfaces={cream:materials.surface('stucco','#ecdcb9',{roughness:.94}),tan:materials.surface('paving','#c39b67',{roughness:1}),gray:materials.surface('paving','#86877c',{roughness:1})}
  const paved=useMemo(()=>createPavedShapes([DA_VINCI_WORLD_PLAZA],CAMPUS_BUILDINGS.map(b=>b.ring)),[])
  const lawns=useMemo(()=>createPavedShapes(DA_VINCI_LAWNS,[...CAMPUS_BUILDINGS.map(b=>b.ring),...DA_VINCI_GARDEN_PATHS]),[])
  useEffect(()=>()=>{iron.dispose()},[iron])
  return <group>
    <mesh position={[0,front.ground,0]} rotation={[-Math.PI/2,0,0]} material={materials.paving} receiveShadow raycast={noRaycast}><shapeGeometry args={[paved]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/></mesh>
    <mesh position={[0,.645,0]} rotation={[-Math.PI/2,0,0]} material={materials.garden} receiveShadow raycast={noRaycast}><shapeGeometry args={[lawns]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/></mesh>
    <group position={[front.start[0],0,-front.start[1]]} rotation={[0,front.angle,0]}>
      {/* Two tall window rows, pale side panels and the central terracotta portico. */}
      <Block at={[front.length/2,5.25,.05]} size={[front.length,10.5,.14]} material={surfaces.cream}/>
      <Block at={[front.portico,5.22,.15]} size={[17,10.44,.13]} material={materials.hallRed}/>
      {[.7,5.5,10.4].map(y=><Block key={y} at={[front.length/2,y,.21]} size={[front.length,.2,.28]} material={materials.cream}/>)}
      {Array.from({length:10},(_,i)=>(i+.5)*front.length/10).map(x=>[0,1].map(floor=><group key={`${x}-${floor}`}>
        <Block at={[x,floor?8.02:3.15,.29]} size={[1.72,floor?2.4:3.5,.15]} material={materials.cream}/>
        <Block at={[x,floor?8.02:3.15,.39]} size={[1.42,floor?2.13:3.2,.1]} material={finishes.glass}/>
        <Block at={[x,floor?8.02:3.15,.46]} size={[.05,floor?2.13:3.2,.06]} material={finishes.iron}/>
      </group>))}
      {Array.from({length:31},(_,i)=><Block key={i} at={[(i+.5)*front.length/31,10.25,.55]} size={[.25,.28,.75]} material={materials.redStone}/>)}
      <Block at={[front.portico,.99,front.platformFront/2]} size={[14.8,.92,front.platformFront]} material={materials.entranceStone}/>
      {Array.from({length:6},(_,i)=>{
        const top=front.level-i*(front.level-front.ground)/6
        return <Block key={i} at={[front.portico,(top+.4)/2,front.platformFront+(i+.5)*.45]} size={[14.8,top-.4,.45]} material={materials.entranceStone}/>
      })}
      <Block at={[front.portico,3.05,.55]} size={[3.2,3.15,.16]} material={finishes.glass}/>
      {[-1.55,0,1.55].map(x=><Block key={x} at={[front.portico+x,3.05,.66]} size={[.07,3.15,.08]} material={materials.cream}/>)}
      {[front.portico-5.5,front.portico-1.85,front.portico+1.85,front.portico+5.5].map(x=><group key={x}>
        <Block at={[x,front.level+.12,3.75]} size={[.96,.24,.96]} material={materials.cream}/>
        <Block at={[x,front.level+.65,3.75]} size={[.67,.85,.67]} material={materials.cream}/>
        <mesh position={[x,4.65,3.75]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><cylinderGeometry args={[.27,.32,4.55,24]}/></mesh>
        <Block at={[x,7.05,3.75]} size={[.9,.25,.9]} material={materials.cream}/>
      </group>)}
      <Block at={[front.portico,7.45,2.1]} size={[13.6,.58,4.35]} material={materials.cream}/>
      <Block at={[front.portico,7.1,4.22]} size={[13.8,.18,.45]} material={materials.cream}/>
      <Block at={[front.portico,7.82,2.1]} size={[14.1,.2,4.7]} material={materials.cream}/>
      {/* Rails run beside the steps, with a clear opening toward the fountain. */}
      <Rail from={.6} to={front.portico-7.4} z={2.7} level={front.level} material={finishes.iron}/>
      <Rail from={front.portico+7.4} to={front.length-.6} z={2.7} level={front.level} material={finishes.iron}/>
      {/* Alternating warm and dark paving bands from the fountain photograph. */}
      {[3,9,15,21,27,33,38].map((x,i)=><Block key={x} at={[x,.605,16]} size={[i%2?1.8:.8,.025,15.5]} material={i%2?surfaces.tan:surfaces.gray}/>)}
      {[9.5,14.5,19.5,23.5].map(z=><Block key={z} at={[20,.624,z]} size={[37,.025,.09]} material={materials.cream}/>)}
      <RoundFountain materials={materials} water={finishes.water}/>
      {DA_VINCI_PLAZA_TREES.map(({at,palm},i)=>palm
        ?<Palm key={i} materials={materials} position={[at[0],front.ground,at[1]]} height={6.2} girth={1.15} crown={.95} yaw={i*1.3}/>
        :<Tree key={i} materials={materials} position={[at[0],front.ground,at[1]]} height={6.2} girth={1.3} crown={3} rotation={i*1.1} tone={['#bdc9aa','#c8d1ae','#b2c29f'][i%3]}/>)}
      {[6,32].map(x=><group key={x}>
        <Block at={[x,.83,23]} size={[4,.5,.8]} material={materials.redStone}/>
        <Block at={[x,1.12,23]} size={[4.3,.12,1]} material={surfaces.tan}/>
      </group>)}
    </group>
  </group>
}
function RoundFountain({materials,water}:{materials:CampusMaterials;water:MeshStandardMaterial}) {
  return <group position={[fountain.center[0],.58,fountain.center[1]]}>
    {[5.3,4.7,4.1].map((r,i)=><mesh key={r} position={[0,.09+i*.18,0]} material={materials.entranceStone} castShadow receiveShadow raycast={noRaycast}><cylinderGeometry args={[r,r,.18,64]}/></mesh>)}
    <mesh position={[0,.54,0]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><latheGeometry args={[basinProfile,64]}/></mesh>
    <mesh position={[0,.95,0]} rotation={[-Math.PI/2,0,0]} material={water} receiveShadow raycast={noRaycast}><circleGeometry args={[2.88,64]}/></mesh>
    <mesh position={[0,.97,0]} rotation={[Math.PI/2,0,0]} material={materials.cream} castShadow raycast={noRaycast}><torusGeometry args={[3.02,.11,8,64]}/></mesh>
    <mesh position={[0,.96,0]} material={materials.cream} castShadow raycast={noRaycast}><latheGeometry args={[pedestalProfile,32]}/></mesh>
    <group position={[0,2.75,0]}>
      <mesh position={[0,.3,0]} scale={[.17,.42,.16]} material={materials.cream} castShadow raycast={noRaycast}><sphereGeometry args={[1,16,12]}/></mesh>
      <mesh position={[0,.82,0]} material={materials.cream} castShadow raycast={noRaycast}><sphereGeometry args={[.15,16,12]}/></mesh>
      {[-1,1].map(side=><group key={side}>
        <mesh position={[side*.08,-.15,0]} material={materials.cream} raycast={noRaycast}><capsuleGeometry args={[.065,.5,4,8]}/></mesh>
        <mesh position={[side*.22,.43,0]} rotation={[0,0,side*.55]} material={materials.cream} raycast={noRaycast}><capsuleGeometry args={[.055,.35,4,8]}/></mesh>
      </group>)}
    </group>
  </group>
}
function Rail({from,to,z,level,material}:{from:number;to:number;z:number;level:number;material:MeshStandardMaterial}) {
  const count=Math.ceil((to-from)/1.4)
  return <group>
    {[.18,.7,1].map(y=><Block key={y} at={[(from+to)/2,level+y,z]} size={[to-from,.05,.05]} material={material}/>)}
    {Array.from({length:count+1},(_,i)=><Block key={i} at={[from+i*(to-from)/count,level+.55,z]} size={[.045,1.1,.045]} material={material}/>)}
  </group>
}
