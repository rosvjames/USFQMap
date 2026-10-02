import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, SRGBColorSpace } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { DA_VINCI_PASSAGE as passage, daVinciIvy } from '../lib/daVinci'

const noRaycast = () => null
type Point = [number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
function leafTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128
  const ctx=canvas.getContext('2d')!
  for(let i=0;i<19;i++) {
    const a=i*2.399, r=i?22+((i*17)%27):0, x=64+Math.cos(a)*r,y=64+Math.sin(a)*r
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=i%3?'#d3d7a9':'#919e6c'
    ctx.beginPath();ctx.moveTo(0,-12);ctx.bezierCurveTo(11,-5,11,6,0,12);ctx.bezierCurveTo(-11,6,-11,-5,0,-12);ctx.fill()
    ctx.strokeStyle='#667647';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,10);ctx.stroke();ctx.restore()
  }
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=4;return map
}
function Ivy() {
  const mesh=useRef<InstancedMesh>(null)
  const leaves=useMemo(daVinciIvy,[]), map=useMemo(leafTexture,[]), geometry=useMemo(()=>new PlaneGeometry(1,1),[])
  const material=useMemo(()=>new MeshStandardMaterial({map,alphaTest:.35,side:DoubleSide,roughness:1}),[map])
  useLayoutEffect(()=>{
    const object=new Object3D(), color=new Color()
    leaves.forEach((leaf,i)=>{
      object.position.set(leaf.x,leaf.y,.36+leaf.tone*.06);object.rotation.set(0,0,leaf.angle);object.scale.setScalar(leaf.size);object.updateMatrix()
      mesh.current!.setMatrixAt(i,object.matrix);mesh.current!.setColorAt(i,color.set(leaf.tone>.7?'#8b963f':leaf.tone>.3?'#526c30':'#354c25'))
    })
    mesh.current!.instanceMatrix.needsUpdate=true;mesh.current!.instanceColor!.needsUpdate=true;mesh.current!.computeBoundingSphere()
  },[leaves])
  useEffect(()=>()=>{map.dispose();geometry.dispose();material.dispose()},[map,geometry,material])
  return <instancedMesh ref={mesh} args={[geometry,material,leaves.length]} receiveShadow raycast={noRaycast}/>
}

/** Yellow ivy facade and the paved terrace photographed looking toward Maxwell. */
export function DaVinciPassage({materials}:{materials:CampusMaterials}) {
  const iron=useMemo(()=>new MeshStandardMaterial({color:'#33453c',roughness:.72,metalness:.35}),[])
  const hedge=useMemo(()=>new MeshStandardMaterial({color:'#829438',roughness:1}),[])
  useEffect(()=>()=>{iron.dispose();hedge.dispose()},[iron,hedge])
  const {length,height,columns}=passage
  return <group position={[passage.start[0],0,-passage.start[1]]} rotation={[0,passage.angle,0]}>
    <Ivy/>
    <Block at={[length/2,.42,.14]} size={[length,.84,.12]} material={materials.hallRed}/>
    <Block at={[length/2,(height+.48)/2,4.725]} size={[length,height-.48,8.15]} material={materials.paving}/>
    {[0,1,2].map(i=><group key={i}>
      <Block at={[-.2-i*.4,.55+(.5/3)*(3-i)/2,4.725]} size={[.4,(.5/3)*(3-i),8.15]} material={materials.entranceStone}/>
      <Block at={[length+.2+i*.4,.55+(.5/3)*(2-i)/2,4.725]} size={[.4,Math.max(.03,(.5/3)*(2-i)),8.15]} material={materials.entranceStone}/>
    </group>)}
    {Array.from({length:columns},(_,i)=><group key={i}>
      {/* Vines climb the wall piers, leaving the existing framed windows visible. */}
      {i>0&&<Block at={[i*length/columns,5.2,.22]} size={[.06,8.9,.07]} material={iron}/>}
      <Block at={[(i+.5)*length/columns,height+.1,.62]} size={[length/columns-.25,.22,.6]} material={materials.cream}/>
      <Block at={[(i+.5)*length/columns,height+.3,.62]} size={[length/columns-.45,.25,.5]} material={hedge}/>
      {[0,1,2].map(floor=><WindowRail key={floor} x={(i+.5)*length/columns} y={floor*3.5+1.15} iron={iron}/>)}
    </group>)}
    <TerraceRail from={0} to={13} z={8.75} height={height} iron={iron}/>
    <TerraceRail from={17} to={length-2} z={8.75} height={height} iron={iron}/>
    {/* Open ends and a lateral gap keep the pedestrian passage unobstructed. */}
    {[.65,8.75].map(z=><group key={z}>
      <TerraceRail from={-1.2} to={0} z={z} height={.72} iron={iron}/>
    </group>)}
  </group>
}
function WindowRail({x,y,iron}:{x:number;y:number;iron:MeshStandardMaterial}) {
  return <group>
    {[-.65,.65].map(side=><Block key={side} at={[x+side,y+.2,.4]} size={[.035,.44,.04]} material={iron}/>)}
    <Block at={[x,y+.4,.4]} size={[1.35,.04,.04]} material={iron}/>
    {[-1,1].map(side=><mesh key={side} position={[x,y+.2,.4]} rotation={[0,0,side*.95]} material={iron} raycast={noRaycast}><boxGeometry args={[.025,.78,.03]}/></mesh>)}
  </group>
}
function TerraceRail({from,to,z,height,iron}:{from:number;to:number;z:number;height:number;iron:MeshStandardMaterial}) {
  const count=Math.ceil((to-from)/1.8), span=(to-from)/count
  return <group>
    {[.18,.68,1].map(h=><Block key={h} at={[(from+to)/2,height+h,z]} size={[to-from,.055,.06]} material={iron}/>)}
    {Array.from({length:count+1},(_,i)=><Block key={i} at={[from+i*span,height+.55,z]} size={[.07,1.1,.07]} material={iron}/>)}
    {Array.from({length:count},(_,i)=><group key={i}>
      {[-1,1].map(side=><mesh key={side} position={[from+(i+.5)*span,height+.43,z]} rotation={[0,0,side*Math.atan2(span,.5)]} material={iron} raycast={noRaycast}><boxGeometry args={[.025,Math.hypot(span,.5),.04]}/></mesh>)}
    </group>)}
  </group>
}
