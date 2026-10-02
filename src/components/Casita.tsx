import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, MeshStandardMaterial, Shape } from 'three'
import { CASITA as house, createCasitaRoof } from '../lib/casita'
import type { CampusMaterials } from '../lib/materials'

type Point=[number,number,number]
const noRaycast=()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
function Beam({from,to,material}:{from:Point;to:Point;material:MeshStandardMaterial}) {
  const dx=to[0]-from[0],dy=to[1]-from[1]
  return <mesh position={[(from[0]+to[0])/2,(from[1]+to[1])/2,from[2]]} rotation={[0,0,-Math.atan2(dx,dy)]} material={material} castShadow raycast={noRaycast}><boxGeometry args={[.085,Math.hypot(dx,dy),.09]}/></mesh>
}
function Window({x,y,w=1,h=1.25,timber,glass}:{x:number;y:number;w?:number;h?:number;timber:MeshStandardMaterial;glass:MeshStandardMaterial}) {
  return <group>
    <Block at={[x,y,.13]} size={[w+.15,h+.15,.12]} material={timber}/>
    <Block at={[x,y,.21]} size={[w,h,.06]} material={glass}/>
    {[x-w/6,x+w/6].map(px=><Block key={px} at={[px,y,.25]} size={[.035,h,.035]} material={timber}/>)}
    <Block at={[x,y-h*.05,.25]} size={[w,.04,.04]} material={timber}/>
  </group>
}

/** White plaster, exposed dark red timber and balconies interpreted from the supplied house photo. */
export function Casita({materials}:{materials:CampusMaterials}) {
  const finishes=useMemo(()=>({
    timber:new MeshStandardMaterial({color:'#62352d',roughness:.9}),
    glass:new MeshStandardMaterial({color:'#263d3b',roughness:.3,metalness:.2,envMap:materials.environment}),
    roof:new MeshStandardMaterial({color:'#343d3d',map:materials.terracotta.map,roughness:.9}),
  }),[materials])
  const roof=useMemo(createCasitaRoof,[])
  const gable=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-house.width/2,house.height);shape.lineTo(house.width/2,house.height);shape.lineTo(0,house.height+house.rise);shape.closePath()
    return new ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false})
  },[])
  const arch=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-.55,.55);shape.lineTo(.55,.55);shape.lineTo(.55,1.7);shape.absarc(0,1.7,.55,0,Math.PI,false);shape.lineTo(-.55,.55);shape.closePath()
    return new ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false,curveSegments:20})
  },[])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());roof.dispose();gable.dispose();arch.dispose()},[finishes,roof,gable,arch])
  const half=house.width/2
  return <group position={[house.center[0],0,-house.center[1]]} rotation={[0,house.angle,0]}>
    <mesh geometry={roof} material={finishes.roof} castShadow receiveShadow raycast={noRaycast}/>
    {[0,-house.depth-.08].map(z=><mesh key={z} geometry={gable} position={[0,0,z]} material={materials.casitaWhite} castShadow raycast={noRaycast}/>)}
    {[0,-house.depth].map(z=><group key={z} position={[0,0,z]} rotation={[0,z===0?0:Math.PI,0]}>
      {/* Narrow timber ribs follow the pitched gable instead of crossing the roof. */}
      {Array.from({length:11},(_,i)=>{
        const x=-half+i*house.width/10, tall=house.rise*(1-Math.abs(x)/half)
        return tall>.05?<Block key={i} at={[x,house.height+tall/2,.12]} size={[.065,tall,.09]} material={finishes.timber}/>:null
      })}
      {[-1,1].map(side=><Beam key={side} from={[side*half,house.height,.14]} to={[0,house.height+house.rise,.14]} material={finishes.timber}/>)}
      <Block at={[0,house.height,.13]} size={[house.width,.1,.09]} material={finishes.timber}/>
      <Window x={0} y={house.height+.72} w={1} h={1} timber={finishes.timber} glass={finishes.glass}/>
      {[-2.45,-1.6,-.75].map(x=><Block key={x} at={[x,4.7,.12]} size={[.075,3.25,.09]} material={finishes.timber}/>)}
      {[3.15,3.5,5.95].map(y=><Block key={y} at={[-1.65,y,.13]} size={[3.4,.075,.09]} material={finishes.timber}/>)}
      {[-2.9,0,2.7].map((x,i)=><Window key={x} x={x} y={4.65} w={i===1?1.25:.8} h={i===2?1.75:1.1} timber={finishes.timber} glass={finishes.glass}/>)}
      {[-1.9,0,2.3].map(x=><group key={x} position={[x,0,.17]}>
        <mesh geometry={arch} material={finishes.timber} scale={[1.16,1.04,1]} raycast={noRaycast}/>
        <mesh geometry={arch} position={[0,0,.08]} material={finishes.glass} raycast={noRaycast}/>
        <Block at={[0,1.25,.17]} size={[.055,1.4,.045]} material={finishes.timber}/>
      </group>)}
      {/* The wider balcony projects from the right-hand upper door. */}
      {[{x:-2.2,w:2.45,d:.45},{x:2.45,w:2.25,d:.8}].map(({x,w,d})=><group key={x}>
        <Block at={[x,3.65,d/2]} size={[w,.16,d+.2]} material={materials.casitaWhite}/>
        {[3.85,4.35].map(y=><Block key={y} at={[x,y,d]} size={[w,.07,.075]} material={finishes.timber}/>)}
        {Array.from({length:9},(_,i)=><Block key={i} at={[x-w/2+w*i/8,4.05,d]} size={[.045,.6,.06]} material={finishes.timber}/>)}
        {[-1,1].map(side=><Block key={side} at={[x+side*w/2,4.15,d/2]} size={[.055,.65,d]} material={finishes.timber}/>)}
      </group>)}
    </group>)}
    {[-1,1].map(side=><group key={side} position={[side*(half+.015),0,-house.depth/2]} rotation={[0,side*Math.PI/2,0]}>
      {[1.6,4.7].flatMap(y=>[-2,0,2].map(x=><Window key={`${x},${y}`} x={x} y={y} timber={finishes.timber} glass={finishes.glass}/>))}
      <Block at={[0,3.2,.1]} size={[house.depth,.1,.1]} material={finishes.timber}/>
    </group>)}
    <Block at={[0,.35,.35]} size={[house.width+.15,.3,1]} material={materials.entranceStone}/>
    {/* Low brick-and-timber garden boundary, with its central pedestrian gate left open. */}
    {[-1,1].map(side=><group key={side}>
      <Block at={[side*2.55,.65,1.55]} size={[2.6,.55,.3]} material={materials.redStone}/>
      <Block at={[side*2.55,1.1,1.55]} size={[2.6,.055,.1]} material={finishes.timber}/>
      {[-1,0,1].map(x=><Block key={x} at={[side*2.55+x,.92,1.55]} size={[.06,.55,.1]} material={finishes.timber}/>)}
    </group>)}
    {[-3.75,-1.25,1.25,3.75].map(x=><group key={x}>
      <Block at={[x,.95,1.55]} size={[.42,1.25,.42]} material={materials.redStone}/>
      <Block at={[x,1.61,1.55]} size={[.52,.1,.52]} material={materials.cream}/>
    </group>)}
  </group>
}
