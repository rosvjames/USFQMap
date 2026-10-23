import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { HALL_ENTRANCE as hall } from '../lib/hall'
import { HALL_EINSTEIN_GAP } from '../lib/campus'
import { HALL_PASSAGE as passage, HALL_TUNNEL as tunnel, EINSTEIN_ENTRANCE as entrance } from '../lib/hallPassage'

type Point=[number,number,number]
const noRaycast=()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
/** Open-air stair passage beside the Hall's orange right pillar, toward Einstein. */
export function HallEinsteinPassage({materials}:{materials:CampusMaterials}) {
  const glass=useMemo(()=>new MeshStandardMaterial({color:'#334a42',roughness:.28,metalness:.25}),[])
  const iron=useMemo(()=>new MeshStandardMaterial({color:'#414d43',roughness:.7,metalness:.3}),[])
  const handle=useMemo(()=>new MeshStandardMaterial({color:'#b9c1ba',roughness:.3,metalness:.75}),[])
  const foliage=useMemo(()=>new MeshStandardMaterial({color:'#536c38',roughness:1}),[])
  const lamp=useMemo(()=>new MeshStandardMaterial({color:'#e7d9b5',emissive:'#baa77d',emissiveIntensity:.65,roughness:.8}),[])
  const ramp=useMemo(()=>{
    const a=[tunnel.left,tunnel.lower,tunnel.mouth],b=[tunnel.right,tunnel.lower,tunnel.mouth],c=[tunnel.right,tunnel.upper,tunnel.back],d=[tunnel.left,tunnel.upper,tunnel.back]
    const points=[a,c,d,a,b,c],g=new BufferGeometry()
    g.setAttribute('position',new Float32BufferAttribute(points.flat(),3))
    g.setAttribute('uv',new Float32BufferAttribute(points.flatMap(([x,,z])=>[x/2.4,z/2.4]),2));g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>{glass.dispose();iron.dispose();handle.dispose();foliage.dispose();lamp.dispose();ramp.dispose()},[glass,iron,handle,foliage,lamp,ramp])
  // Floor, steps and landing span the whole gap, wall to wall, since the general ground stops at it.
  const width=HALL_EINSTEIN_GAP,length=-passage.back
  const left=passage.left,right=passage.right,center=passage.center
  return <group position={[hall.center[0],0,-hall.center[1]]} rotation={[0,hall.angle,0]}>
    <Block at={[center,.42,-length/2]} size={[width,.26,length]} material={materials.paving}/>
    {/* Separate side landing, outside the intact Hall entrance and its orange pillar. */}
    <Block at={[center,(hall.level+.3)/2,1.4]} size={[width,hall.level-.3,2.8]} material={materials.entranceStone}/>
    {Array.from({length:passage.steps},(_,i)=>{
      const top=hall.level-i*(hall.level-hall.ground)/passage.steps
      return <Block key={i} at={[center,(top+.3)/2,-(i+.5)*.45]} size={[width,top-.3,.45]} material={materials.entranceStone}/>
    })}
    {/* Hall's intact side wall bounds the passage; Einstein is the opposite wall. */}
    <Block at={[left-.18,2.75,-7]} size={[.28,5.5,14]} material={materials.hallRed}/>
    <Block at={[left-.04,5.38,-7]} size={[.22,.2,14]} material={materials.cream}/>
    {[-4.3,-7.7,-11.1].map(z=><group key={z} position={[left-.02,3.65,z]} rotation={[0,Math.PI/2,0]}>
      <Block at={[0,0,0]} size={[2.25,1.65,.12]} material={materials.cream}/>
      <Block at={[0,0,.1]} size={[2,1.4,.08]} material={glass}/>
      <Block at={[0,0,.16]} size={[.045,1.4,.04]} material={iron}/>
    </group>)}
    <Block at={[left,1.45,-5.9]} size={[.12,1.8,1.2]} material={glass}/>
    {/* Einstein's entrance faces the exterior gap rather than Hall's interior. */}
    <group position={[entrance.wall-.11,entrance.ground+entrance.height/2,entrance.z]} rotation={[0,-Math.PI/2,0]}>
      <Block at={[0,0,0]} size={[entrance.width,entrance.height,.1]} material={materials.cream}/>
      <Block at={[0,0,.12]} size={[2.4,2.8,.1]} material={glass}/>
      {[-1.15,0,1.15].map(x=><Block key={x} at={[x,0,.22]} size={[.06,2.8,.06]} material={iron}/>)}
      <Block at={[0,.8,.22]} size={[2.4,.055,.06]} material={iron}/>
      {[-.16,.16].map(x=><Block key={x} at={[x,-.45,.32]} size={[.045,.65,.07]} material={handle}/>)}
      <Block at={[0,-entrance.height/2+.02,.22]} size={[entrance.width,.04,.5]} material={materials.entranceStone}/>
    </group>
    {/* Open tunnel mouth. The joined building above covers a ramp rising toward the rear. */}
    {[left+.1,right-.1].map(x=><Block key={x} at={[x,(tunnel.ceiling+hall.ground)/2,tunnel.mouth+.07]} size={[.2,tunnel.ceiling-hall.ground,.38]} material={materials.cream}/>)}
    <Block at={[center,tunnel.ceiling-.1,tunnel.mouth+.07]} size={[width+.2,.2,.45]} material={materials.cream}/>
    <mesh geometry={ramp} material={materials.entranceStone} receiveShadow raycast={noRaycast}/>
    {[tunnel.left+.12,tunnel.right-.12].map(x=>{
      const run=tunnel.mouth-tunnel.back,rise=tunnel.upper-tunnel.lower,angle=Math.atan2(rise,run)
      return <group key={x}>
        <mesh position={[x,(tunnel.upper+tunnel.lower)/2+.88,(tunnel.mouth+tunnel.back)/2]} rotation={[angle,0,0]} material={iron} raycast={noRaycast}><boxGeometry args={[.045,.045,Math.hypot(run,rise)]}/></mesh>
        {Array.from({length:7},(_,i)=>{
          const t=i/6,z=tunnel.mouth-t*run,y=tunnel.lower+t*rise
          return <Block key={i} at={[x,y+.43,z]} size={[.04,.86,.04]} material={iron}/>
        })}
      </group>
    })}
    {[-18,-25,-30].map(z=><Block key={z} at={[center,tunnel.ceiling-.07,z]} size={[.65,.04,.25]} material={lamp}/>)}
    {[-8.7,-12.2].map(z=><group key={z} position={[left+.4,hall.ground,z]}>
      <mesh position={[0,.24,0]} material={materials.redStone} castShadow raycast={noRaycast}><cylinderGeometry args={[.22,.16,.48,12]}/></mesh>
      <mesh position={[0,.74,0]} scale={[.26,.43,.26]} material={foliage} castShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>
    </group>)}
  </group>
}
