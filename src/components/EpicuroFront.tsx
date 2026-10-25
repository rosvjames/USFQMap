import { useEffect,useMemo } from 'react'
import { ExtrudeGeometry,MeshStandardMaterial,Shape,Vector2 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { CAMPUS_BUILDINGS } from '../lib/campus'
import { createPavedShapes } from '../lib/architecture'
import { EPICURO_FRONT as f,EPICURO_FORECOURT,EPICURO_FOUNTAIN as fountain,EPICURO_STREET_STAIRS as s,EPICURO_STAIR_FOOT } from '../lib/epicuro'
const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
const basinProfile=[[0,0],[2.85,0],[2.85,.52],[2.63,.52],[2.63,.15],[0,.15]].map(([x,y])=>new Vector2(x,y))

/** Raised Epicuro facade, square tower and low wall fountain, interpreted from the supplied photo. */
export function EpicuroFront({materials}:{materials:CampusMaterials}) {
  const iron=useMemo(()=>new MeshStandardMaterial({color:'#324239',roughness:.65,metalness:.4}),[])
  // The shared pane belongs to the campus materials; only the iron is ours to dispose.
  const finish={glass:materials.glass('#2d3e3e'),iron}
  const gold=materials.surface('stucco','#c59b55',{roughness:.94})
  const arch=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-1,0);shape.lineTo(1,0);shape.lineTo(1,1.35);shape.absarc(0,1.35,1,0,Math.PI,false);shape.closePath()
    return new ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false,curveSegments:20})
  },[])
  const windowPediment=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-1,0);shape.lineTo(1,0);shape.quadraticCurveTo(.55,.14,0,.32);shape.quadraticCurveTo(-.55,.14,-1,0)
    return new ExtrudeGeometry(shape,{depth:.2,bevelEnabled:false,curveSegments:12})
  },[])
  const doorPediment=useMemo(()=>{
    const shape=new Shape();shape.moveTo(-1.7,0);shape.lineTo(1.7,0);shape.lineTo(0,.9);shape.closePath()
    return new ExtrudeGeometry(shape,{depth:.45,bevelEnabled:false})
  },[])
  const paving=useMemo(()=>createPavedShapes([EPICURO_FORECOURT],CAMPUS_BUILDINGS.map(b=>b.ring)),[])
  useEffect(()=>()=>{iron.dispose();arch.dispose();windowPediment.dispose();doorPediment.dispose()},[iron,arch,windowPediment,doorPediment])
  return <group>
    <mesh position={[0,f.ground,0]} rotation={[-Math.PI/2,0,0]} material={materials.paving} receiveShadow raycast={noRaycast}><shapeGeometry args={[paving]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/></mesh>
    <group position={[f.start[0],0,-f.start[1]]} rotation={[0,f.angle,0]}>
      {/* A terracotta retaining base supports the three upper window rows. */}
      <Block at={[f.length/2,1.8,.12]} size={[f.length,2.8,.23]} material={materials.hallRed}/>
      {[2.7,9.1,15.5,19.5,29.1].map(x=><group key={x}>
        <Block at={[x,1.84,.33]} size={[.45,2.72,.48]} material={materials.cream}/>
        <Block at={[x,3.18,.34]} size={[.8,.22,.6]} material={materials.cream}/>
      </group>)}
      {[3.25,6.75,10.4,14].map(y=><Block key={y} at={[f.length/2,y,.25]} size={[f.length,.2,.42]} material={materials.cream}/>)}
      {[5.1,8.6,12.15].map((y,row)=>[3.6,8.0,12.4,16.8].map((x,i)=><group key={`${x}-${row}`}>
        <Block at={[x,y,.23]} size={[1.95,2.6,.22]} material={materials.cream}/>
        <Block at={[x,y,.39]} size={[1.55,2.2,.13]} material={finish.glass}/>
        <Block at={[x,y,.5]} size={[.055,2.2,.06]} material={finish.iron}/>
        <Block at={[x,y+.76,.5]} size={[1.55,.045,.06]} material={finish.iron}/>
        <Block at={[x,y-1.38,.36]} size={[2.15,.14,.43]} material={materials.cream}/>
        <mesh geometry={windowPediment} position={[x,y+1.3,.24]} material={materials.cream} castShadow raycast={noRaycast}/>
        {i===3&&row>0&&<SmallRail x={x} y={y-.82} z={.62} width={1.5} material={finish.iron}/>}
      </group>))}
      <Block at={[14.6,4.55,.56]} size={[2.3,2.65,.14]} material={finish.glass}/>
      {[-1.3,1.3].map(x=><Block key={x} at={[14.6+x,4.6,.6]} size={[.27,2.95,.38]} material={materials.cream}/>)}
      <Block at={[14.6,6.08,.61]} size={[3.4,.21,.5]} material={materials.cream}/>
      <mesh geometry={doorPediment} position={[14.6,6.18,.41]} material={materials.cream} castShadow raycast={noRaycast}/>
      {/* Balcony carried on the pale piers, above the red lower floor. */}
      <Block at={[10.1,3.26,.8]} size={[19.4,.25,1.8]} material={materials.entranceStone}/>
      <SmallRail x={10.1} y={3.79} z={1.65} width={19.4} material={finish.iron}/>
      {/* The tower stays within the original Epicuro footprint. */}
      <Block at={[f.towerX,f.towerHeight/2,-f.towerDepth/2]} size={[f.towerWidth,f.towerHeight,f.towerDepth]} material={materials.epicuroStone}/>
      {[3.25,14.6,17.25,18.55].map(y=><Block key={y} at={[f.towerX,y,-f.towerDepth/2]} size={[f.towerWidth+.65,.3,f.towerDepth+.65]} material={materials.cream}/>)}
      <Block at={[f.towerX,8.2,.18]} size={[1.8,6.1,.22]} material={materials.cream}/>
      <Block at={[f.towerX,8.2,.33]} size={[1.4,5.7,.12]} material={finish.glass}/>
      <Block at={[f.towerX,8.2,.43]} size={[.05,5.7,.06]} material={finish.iron}/>
      {[5.8,10.5].map(y=><SmallRail key={y} x={f.towerX} y={y} z={.48} width={1.4} material={finish.iron}/>)}
      <mesh geometry={windowPediment} position={[f.towerX,11.28,.21]} material={materials.cream} castShadow raycast={noRaycast}/>
      {/* Small dark crest above the tall narrow window. */}
      <mesh position={[f.towerX,13.05,.34]} scale={[.55,.73,.12]} material={finish.iron} castShadow raycast={noRaycast}><sphereGeometry args={[1,12,8]}/></mesh>
      <Block at={[f.towerX,13.08,.5]} size={[.23,.78,.08]} material={materials.entranceStone}/>
      <Block at={[f.towerX,18.2,-f.towerDepth/2]} size={[f.towerWidth+.8,.2,f.towerDepth+.8]} material={materials.cream}/>
      <mesh position={[f.towerX,20.2,-f.towerDepth/2]} rotation={[0,Math.PI/4,0]} material={materials.tealRoof} castShadow receiveShadow raycast={noRaycast}><coneGeometry args={[5.35,3.1,4]}/></mesh>
      <Block at={[f.towerX,21.88,-f.towerDepth/2]} size={[.9,.3,.9]} material={finish.iron}/>
      <SmallRail x={f.towerX} y={22.22} z={-f.towerDepth/2+.45} width={.9} material={finish.iron}/>
      <Block at={[f.towerX,22.9,-f.towerDepth/2]} size={[.05,1.7,.05]} material={finish.iron}/>
      {/* Arched wall fountain and stone cascade terminating in a low curved basin. */}
      <group position={[fountain.x,f.ground,0]}>
        <Block at={[0,2.7,.6]} size={[6.25,4.4,.8]} material={gold}/>
        <mesh geometry={arch} position={[0,1.45,1.02]} scale={[1.88,1.35,1]} material={materials.cream} castShadow raycast={noRaycast}/>
        <mesh geometry={arch} position={[0,1.56,1.2]} scale={[1.6,1.2,1]} material={finish.iron} raycast={noRaycast}/>
        <Block at={[0,4.91,.65]} size={[6.65,.25,1.25]} material={materials.cream}/>
        <Block at={[0,5.17,.65]} size={[6.25,.2,1]} material={gold}/>
        {[-2.15,2.15].map(x=><Block key={x} at={[x,2.25,1.28]} size={[.42,3.5,.62]} material={materials.cream}/>)}
        {Array.from({length:9},(_,i)=>{
          const top=2.1-i*.18
          return <Block key={i} at={[0,top/2,1.6+(i+.5)*.43]} size={[5.45,top,.43]} material={materials.entranceStone}/>
        })}
        <mesh position={[0,.32,fountain.z]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><latheGeometry args={[basinProfile,48,-Math.PI/2,Math.PI]}/></mesh>
        <mesh position={[0,.71,fountain.z]} rotation={[-Math.PI/2,0,0]} material={materials.pondWater} receiveShadow raycast={noRaycast}><circleGeometry args={[2.64,48,Math.PI,Math.PI]}/></mesh>
        <Block at={[0,.73,fountain.z]} size={[5.5,.2,.24]} material={materials.cream}/>
        <mesh position={[0,2.16,1.55]} rotation={[Math.PI/2,0,0]} material={materials.pondRock} raycast={noRaycast}><cylinderGeometry args={[.11,.11,.35,10]}/></mesh>
        {/* Fixed thin stream: no animation loop is needed on phones. */}
        <Block at={[0,1.78,1.75]} size={[.045,.8,.05]} material={materials.pondWater}/>
        {Array.from({length:9},(_,i)=>{
          const top=2.1-i*.18,z=1.6+(i+.5)*.43
          return <group key={i}>
            <Block at={[0,top+.013,z]} size={[.22,.018,.43]} material={materials.pondWater}/>
            <Block at={[0,top-.075,z+.215]} size={[.22,.18,.018]} material={materials.pondWater}/>
          </group>
        })}
      </group>
      {/* Provisional street access, descending toward the court on the right. */}
      <Block at={[s.top-s.landing/2,(s.level+s.ground)/2,s.z]} size={[s.landing,s.level-s.ground,s.width]} material={materials.entranceStone}/>
      {Array.from({length:s.steps},(_,i)=>{
        const top=s.level-i*(s.level-s.ground)/s.steps
        return <Block key={i} at={[s.top-s.landing-(i+.5)*s.run,(top+s.ground)/2,s.z]} size={[s.run,top-s.ground,s.width]} material={materials.entranceStone}/>
      })}
      {[-1,1].map(side=><group key={side}>
        <Block at={[s.top-s.landing/2,(s.level+.8+s.ground)/2,s.z+side*(s.width/2+.25)]} size={[s.landing,s.level+.8-s.ground,.4]} material={materials.hallRed}/>
        {Array.from({length:s.steps},(_,i)=>{
          const top=s.level-(i+.5)*(s.level-s.ground)/s.steps
          return <Block key={i} at={[s.top-s.landing-(i+.5)*s.run,(top+.8+s.ground)/2,s.z+side*(s.width/2+.25)]} size={[s.run,top+.8-s.ground,.4]} material={materials.hallRed}/>
        })}
        <Block at={[s.top-s.landing/2,s.level+.85,s.z+side*(s.width/2+.25)]} size={[s.landing,.14,.56]} material={materials.cream}/>
        <mesh position={[(s.top-s.landing+EPICURO_STAIR_FOOT)/2,(s.level+s.ground)/2+.85,s.z+side*(s.width/2+.25)]} rotation={[0,0,Math.atan2(s.level-s.ground,s.steps*s.run)]} material={materials.cream} castShadow raycast={noRaycast}><boxGeometry args={[Math.hypot(s.steps*s.run,s.level-s.ground),.14,.56]}/></mesh>
        <Block at={[s.top-.35,s.level+1,s.z+side*(s.width/2+.5)]} size={[.7,2,.7]} material={materials.cream}/>
        <Block at={[s.top-.35,s.level+2.05,s.z+side*(s.width/2+.5)]} size={[.95,.18,.95]} material={materials.cream}/>
      </group>)}
    </group>
  </group>
}
function SmallRail({x,y,z,width,material}:{x:number;y:number;z:number;width:number;material:MeshStandardMaterial}) {
  return <group>
    {[-.34,.34].map(dy=><Block key={dy} at={[x,y+dy,z]} size={[width,.045,.045]} material={material}/>)}
    {Array.from({length:Math.ceil(width/.4)+1},(_,i)=>{
      const count=Math.ceil(width/.4)
      return <Block key={i} at={[x-width/2+i*width/count,y,z]} size={[.035,.68,.045]} material={material}/>
    })}
  </group>
}
