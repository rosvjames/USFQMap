import { useEffect, useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { HAYEK_APICE as cafe } from '../lib/hayek'

type Point = [number, number, number]
const noRaycast = () => null
function Block({ at, size, material }: { at: Point; size: Point; material: MeshStandardMaterial }) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'), n=g.getAttribute('normal'), uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++) uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
function logoTexture() {
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=256
  const ctx=canvas.getContext('2d')!
  ctx.fillStyle='#eeeae0'; ctx.fillRect(0,0,512,256)
  ctx.fillStyle='#ac2234'; ctx.textAlign='center'; ctx.font='600 80px sans-serif'; ctx.fillText('ÁPICE',256,153)
  ctx.strokeStyle='#ac2234'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(237,181); ctx.lineTo(256,198); ctx.lineTo(275,181); ctx.stroke()
  const texture=new CanvasTexture(canvas); texture.colorSpace=SRGBColorSpace; return texture
}

/** Ground-floor café beneath the existing bridge terrace; local coordinates shared with HayekEntrance. */
export function HayekApice({materials}:{materials:CampusMaterials}) {
  const finishes=useMemo(()=>({
    white:new MeshStandardMaterial({color:'#eeeae0',roughness:.92}),
    glass:new MeshStandardMaterial({color:'#192e2e',roughness:.22,metalness:.24,envMap:materials.environment,envMapIntensity:.6}),
    frame:new MeshStandardMaterial({color:'#393e38',roughness:.65,metalness:.42}),
    red:new MeshStandardMaterial({color:'#bb2937',roughness:.6,metalness:.15}),
    green:new MeshStandardMaterial({color:'#52723b',roughness:1}),
    light:new MeshStandardMaterial({color:'#fff3c9',emissive:'#ffe3a5',emissiveIntensity:.6}),
  }),[materials])
  const logo=useMemo(logoTexture,[])
  const sign=useMemo(()=>new MeshStandardMaterial({map:logo,roughness:1}),[logo])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());logo.dispose();sign.dispose()},[finishes,logo,sign])
  const bottom=cafe.ground, top=cafe.ceiling, height=top-bottom
  const bays=[{x:cafe.center-5.25,w:5.2},{x:cafe.center+4.5,w:4},{x:cafe.center+10.9,w:4.7}]
  return <group>
    <Block at={[(cafe.left+cafe.right)/2,bottom-.09,3.8]} size={[cafe.right-cafe.left,.18,7.6]} material={materials.entranceStone}/>
    <Block at={[(cafe.left+cafe.right)/2,(top+bottom)/2,.47]} size={[cafe.right-cafe.left,height,.22]} material={finishes.white}/>
    {/* A white pier with red lettering separates the dark glazed café bays. */}
    {bays.map(({x,w},i)=><group key={i}>
      <Block at={[x,bottom+2.05,.61]} size={[w,4.1,.1]} material={finishes.glass}/>
      {[-w/2,0,w/2].map(px=><Block key={px} at={[x+px,bottom+2.05,.7]} size={[.07,4.1,.08]} material={finishes.frame}/>)}
      {[1.35,2.75,3.7].map(y=><Block key={y} at={[x,bottom+y,.71]} size={[w,.055,.08]} material={finishes.frame}/>)}
      {i===2&&[-.18,.18].map(px=><Block key={px} at={[x+px,bottom+1.3,.8]} size={[.035,.55,.04]} material={materials.cream}/>)}
    </group>)}
    <mesh position={[cafe.center,bottom+2.65,.62]} material={sign} raycast={noRaycast}><planeGeometry args={[2.8,1.4]}/></mesh>
    {/* The two broad brick piers carry the overhanging terrace, with pale stone plinths. */}
    {[-1,1].map(side=><group key={side}>
      <Block at={[cafe.center+side*4.65,(bottom+top)/2,3.2]} size={[1.95,height,1.8]} material={materials.hayekBrick}/>
      <Block at={[cafe.center+side*4.65,bottom+.43,3.2]} size={[2.15,.86,2]} material={materials.entranceStone}/>
      <Block at={[cafe.center+side*4.65,bottom+.92,3.2]} size={[2.25,.16,2.1]} material={finishes.white}/>
    </group>)}
    <Block at={[(cafe.left+cafe.right)/2,top-.04,2.25]} size={[cafe.right-cafe.left,.09,4.45]} material={finishes.white}/>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[cafe.left+1.2+i*2.85,top-.095,2.6]} rotation={[-Math.PI/2,0,0]} material={finishes.light} raycast={noRaycast}><circleGeometry args={[.075,12]}/></mesh>)}
    {/* Red bicycle racks visible beside the piers in the reference. */}
    {[cafe.center-3.25,cafe.center+3.25].map(x=><group key={x} position={[x,bottom+.44,2.15]} rotation={[0,Math.PI/2,0]}>
      {Array.from({length:5},(_,i)=><mesh key={i} position={[0,0,i*.18]} material={finishes.red} raycast={noRaycast}><torusGeometry args={[.39,.035,6,20]}/></mesh>)}
    </group>)}
    {/* Compact meeting furniture stays beside the pedestrian opening, clear of the bridge. */}
    {[cafe.center-6.2,cafe.center+7.8].map(x=><group key={x} position={[x,bottom,5.65]}>
      <mesh position={[0,.73,0]} material={materials.cream} castShadow raycast={noRaycast}><cylinderGeometry args={[.53,.53,.07,20]}/></mesh>
      <Block at={[0,.36,0]} size={[.07,.72,.07]} material={finishes.frame}/>
      <Block at={[0,.055,0]} size={[.7,.07,.5]} material={finishes.frame}/>
      {[-1,1].map(side=><group key={side} position={[side*.9,0,0]}>
        <Block at={[0,.43,0]} size={[.45,.065,.45]} material={finishes.red}/>
        <Block at={[side*.2,.72,0]} size={[.06,.55,.45]} material={finishes.red}/>
        {[-.17,.17].flatMap(px=>[-.17,.17].map(pz=><Block key={`${px},${pz}`} at={[px,.21,pz]} size={[.035,.42,.035]} material={finishes.frame}/>))}
      </group>)}
    </group>)}
    <Block at={[cafe.left+.7,bottom+.15,5.7]} size={[1.3,.3,1.3]} material={materials.entranceStone}/>
    <Block at={[cafe.left+.7,bottom+1,5.7]} size={[.15,1.5,.15]} material={finishes.frame}/>
    {[1.45,2.3].map((y,i)=><mesh key={y} position={[cafe.left+.7,bottom+y,5.7]} scale={[i?.65:.85,i?.75:.9,i?.65:.85]} material={finishes.green} castShadow raycast={noRaycast}><sphereGeometry args={[1,14,10]}/></mesh>)}
  </group>
}
