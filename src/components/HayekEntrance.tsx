import { useEffect, useMemo } from 'react'
import { CanvasTexture, ExtrudeGeometry, MeshStandardMaterial, Path, Shape, SRGBColorSpace } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { HAYEK_ENTRANCE as entrance, HAYEK_LANDING } from '../lib/hayek'
import { HayekApice } from './HayekApice'

type Point = [number,number,number]
const noRaycast = ()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
function bannerTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=768
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b01932';ctx.fillRect(0,0,256,768)
  ctx.fillStyle='#282c2b';ctx.fillRect(12,190,232,395)
  // Original abstract wing motif, rather than reproducing photographs on the banners.
  ctx.fillStyle='#a88254';ctx.beginPath();ctx.moveTo(125,390);ctx.lineTo(45,220);ctx.lineTo(18,372);ctx.lineTo(73,354);ctx.lineTo(101,451);ctx.lineTo(140,510);ctx.lineTo(167,390);ctx.lineTo(238,284);ctx.lineTo(188,282);ctx.closePath();ctx.fill()
  ctx.textAlign='center';ctx.fillStyle='#f2ede1';ctx.font='bold 41px sans-serif';ctx.fillText('USFQ',128,625)
  ctx.font='bold 26px sans-serif';ctx.fillText('HAYEK',128,677)
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture
}
function rectHole(x:number,y:number,w:number,h:number) {
  const path=new Path();path.moveTo(x,y);path.lineTo(x,y+h);path.lineTo(x+w,y+h);path.lineTo(x+w,y);path.closePath();return path
}
function archShape(x:number,bottom:number,spring:number,rx:number,ry:number) {
  const shape=new Shape();shape.moveTo(x-rx,bottom);shape.lineTo(x+rx,bottom);shape.lineTo(x+rx,spring)
  shape.absellipse(x,spring,rx,ry,0,Math.PI,false,0);shape.lineTo(x-rx,bottom);shape.closePath();return shape
}

/** Bridge-level arrival and the brick portal, stone panels and ironwork in IMG_0421. */
export function HayekEntrance({materials}:{materials:CampusMaterials}) {
  const level=entrance.level, top=entrance.facadeHeight, portalX=entrance.portalX, doorX=entrance.door[0]
  const terraceLeft=HAYEK_LANDING[0][0], terraceRight=HAYEK_LANDING[1][0]
  const finishes=useMemo(()=>({
    iron:new MeshStandardMaterial({color:'#27302c',metalness:.45,roughness:.66}),
    glass:new MeshStandardMaterial({color:'#5c624a',emissive:'#bc923d',emissiveIntensity:.3,roughness:.38,metalness:.12}),
    warm:new MeshStandardMaterial({color:'#a28b4e',emissive:'#dfad45',emissiveIntensity:.3,roughness:.85}),
    lamp:new MeshStandardMaterial({color:'#eee4b2',emissive:'#ffde72',emissiveIntensity:.8}),
    hedge:new MeshStandardMaterial({color:'#71813d',roughness:1}),
  }),[])
  const banner=useMemo(bannerTexture,[])
  const bannerMaterial=useMemo(()=>new MeshStandardMaterial({map:banner,roughness:1}),[banner])
  const geometry=useMemo(()=>{
    const facade=new Shape(),left=entrance.facadeMidpoint-entrance.facadeLength/2,right=left+entrance.facadeLength
    facade.moveTo(left,0);facade.lineTo(right,0);facade.lineTo(right,top);facade.lineTo(left,top);facade.closePath()
    const opening=archShape(portalX,level,12.1,3.7,1.8)
    facade.holes.push(new Path(opening.getPoints(32)),rectHole(doorX-1.7,level,3.4,3.45))
    const ring=new Shape();ring.moveTo(4.18,0);ring.absellipse(0,0,4.18,2.17,0,Math.PI,false,0)
    ring.lineTo(-3.7,0);ring.absellipse(0,0,3.7,1.8,Math.PI,0,true,0);ring.closePath()
    const result={facade:new ExtrudeGeometry(facade,{depth:.3,bevelEnabled:false,curveSegments:32}),arch:new ExtrudeGeometry(ring,{depth:.7,bevelEnabled:false,curveSegments:32}),opening:new ExtrudeGeometry(opening,{depth:.03,bevelEnabled:false,curveSegments:32})}
    for(const g of Object.values(result)) {
      const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true
    }
    return result
  },[top,level,portalX,doorX])
  const bands=useMemo(()=>{
    const left=entrance.facadeMidpoint-entrance.facadeLength/2,right=left+entrance.facadeLength
    return [3.75,7.5,11.25,top-.1].flatMap(y=>{
      const cuts=y===7.5?[[left,portalX-5.6],[portalX+5.6,doorX-1.7],[doorX+1.7,right]]:[[left,portalX-5.6],[portalX+5.6,right]]
      return cuts.map(([a,b])=>({x:(a+b)/2,width:b-a,y}))
    })
  },[top,portalX,doorX])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());Object.values(geometry).forEach(g=>g.dispose());banner.dispose();bannerMaterial.dispose()},[finishes,geometry,banner,bannerMaterial])
  return <group position={[entrance.center[0],0,-entrance.center[1]]} rotation={[0,entrance.angle,0]}>
    <mesh geometry={geometry.facade} position={[0,0,.035]} material={materials.hayekStone} castShadow receiveShadow raycast={noRaycast}/>
    {bands.map(({x,width,y},i)=><Block key={i} at={[x,y,.4]} size={[width,.14,.18]} material={materials.cream}/>)}
    {/* Deep warm backdrop suggests the illuminated lobby behind the two openings. */}
    <mesh geometry={geometry.opening} position={[0,0,.36]} material={finishes.warm} raycast={noRaycast}/>
    <Block at={[doorX,level+1.72,.37]} size={[3.4,3.45,.06]} material={finishes.glass}/>
    {[-1,1].map(side=><Block key={side} at={[portalX+side*4.65,11.55,.72]} size={[1.85,11.1,1.5]} material={materials.hayekBrick}/>)}
    <Block at={[portalX,16.65,.72]} size={[11.2,1.5,1.5]} material={materials.hayekBrick}/>
    <Block at={[portalX,15.75,.39]} size={[7.5,3.3,.12]} material={materials.hayekStone}/>
    <mesh geometry={geometry.arch} position={[portalX,12.1,.45]} material={materials.hayekBrick} castShadow receiveShadow raycast={noRaycast}/>
    <Block at={[portalX,17.48,.73]} size={[11.65,.22,1.75]} material={materials.entranceStone}/>
    <Crest at={[portalX,14.95,.62]} material={finishes.iron}/>
    <Block at={[portalX,9.55,1]} size={[7.6,.26,1.5]} material={materials.hayekBrick}/>
    <Block at={[portalX,9.41,1.6]} size={[7.75,.15,.2]} material={finishes.iron}/>
    <Railing from={portalX-3.5} to={portalX+3.5} level={9.7} z={1.55} iron={finishes.iron}/>
    <IronGate x={portalX} level={level} iron={finishes.iron}/>
    <Block at={[doorX,level+3.52,.65]} size={[3.7,.2,.85]} material={finishes.iron}/>
    {[doorX-1.68,doorX,doorX+1.68].map(x=><Block key={x} at={[x,level+1.72,.67]} size={[.075,3.45,.12]} material={finishes.iron}/>)}
    <Block at={[doorX,level+2.62,.68]} size={[3.45,.06,.12]} material={finishes.iron}/>
    {[portalX-2.6,portalX,portalX+2.6,doorX].map((x,i)=><Block key={i} at={[x,i===3?level+3.35:12.1,.74]} size={[i===3?2.6:.65,.06,.3]} material={finishes.lamp}/>)}
    {[doorX,doorX+8.4].map(x=><mesh key={x} position={[x,11.65,.54]} material={bannerMaterial} castShadow raycast={noRaycast}><planeGeometry args={[2.35,6.6]}/></mesh>)}
    {/* Terrace reached by the existing crossing; the central opening connects its deck. */}
    <Block at={[(terraceLeft+terraceRight)/2,level-.16,2.25]} size={[terraceRight-terraceLeft,.32,4.5]} material={materials.entranceStone}/>
    <Railing from={terraceLeft} to={-1.55} level={level} z={4.4} iron={finishes.iron} base={materials.entranceStone}/>
    <Railing from={1.55} to={terraceRight} level={level} z={4.4} iron={finishes.iron} base={materials.entranceStone}/>
    {[terraceLeft,terraceRight].map(x=><group key={x} position={[x,0,0]} rotation={[0,Math.PI/2,0]}><Railing from={-4.4} to={0} level={level} z={0} iron={finishes.iron} base={materials.entranceStone}/></group>)}
    {[4,12,terraceRight-.5].map(x=><Block key={x} at={[x,level/2-0.2,3.8]} size={[.42,level-.4,.42]} material={materials.entranceStone}/>)}
    <HayekApice materials={materials}/>
    {[portalX-4.9,portalX+4.2,doorX+5.8,doorX+10.8].map((x,i)=><group key={i} position={[x,level,.95]}>
      <Block at={[0,.28,0]} size={[i<2?1.2:3.4,.56,.8]} material={materials.hayekBrick}/>
      <Block at={[0,.62,0]} size={[i<2?1.05:3.2,.16,.68]} material={finishes.hedge}/>
    </group>)}
    <Block at={[doorX+2.85,level+1.25,.5]} size={[.8,1.5,.1]} material={materials.cream}/>
    <Railing from={entrance.facadeMidpoint-entrance.facadeLength/2} to={entrance.facadeMidpoint+entrance.facadeLength/2} level={top+.1} z={.3} iron={finishes.iron}/>
  </group>
}

function Railing({from,to,level,z,iron,base}:{from:number;to:number;level:number;z:number;iron:MeshStandardMaterial;base?:MeshStandardMaterial}) {
  const count=Math.ceil((to-from)/.7)
  return <group>
    {base&&<Block at={[(from+to)/2,level+.1,z]} size={[to-from,.2,.18]} material={base}/>}
    {[.24,.84,1.12].map(h=><Block key={h} at={[(from+to)/2,level+h,z]} size={[to-from,.065,.06]} material={iron}/>)}
    {Array.from({length:count+1},(_,i)=><Block key={i} at={[from+(to-from)*i/count,level+.64,z]} size={[.055,1.04,.055]} material={iron}/>)}
    {Array.from({length:count*4},(_,i)=><Block key={`p${i}`} at={[from+(to-from)*(i+.5)/(count*4),level+.67,z]} size={[.02,.8,.02]} material={iron}/>)}
  </group>
}
function IronGate({x,level,iron}:{x:number;level:number;iron:MeshStandardMaterial}) {
  return <group position={[x,level,.92]}>
    {Array.from({length:29},(_,i)=>{
      const px=(i-14)*.24,h=2.3+Math.exp(-(px*px)/3)*.85
      return <Block key={i} at={[px,h/2,0]} size={[.035,h,.07]} material={iron}/>
    })}
    {[.16,1.25,2.3].map(y=><Block key={y} at={[0,y,0]} size={[7.1,.07,.1]} material={iron}/>)}
    <mesh position={[0,2.28,0]} scale={[1.65,.85,1]} material={iron} raycast={noRaycast}><torusGeometry args={[1,.045,6,32,Math.PI]}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*2.7,1.2,0]}>
      <mesh rotation={[0,0,Math.PI/4]} material={iron} raycast={noRaycast}><boxGeometry args={[.025,1.75,.055]}/></mesh>
      <mesh rotation={[0,0,-Math.PI/4]} material={iron} raycast={noRaycast}><boxGeometry args={[.025,1.75,.055]}/></mesh>
    </group>)}
    {[-1.2,-.6,0,.6,1.2].map(px=><mesh key={px} position={[px,2.65+Math.exp(-px*px)*.18,.035]} material={iron} raycast={noRaycast}><torusGeometry args={[.15,.023,5,14]}/></mesh>)}
  </group>
}
function Crest({at,material}:{at:Point;material:MeshStandardMaterial}) {
  return <group position={at}>
    <mesh scale={[.37,.5,.09]} material={material} raycast={noRaycast}><sphereGeometry args={[1,12,10]}/></mesh>
    <mesh scale={[.4,.52,1]} material={material} raycast={noRaycast}><torusGeometry args={[1,.09,5,20]}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*.4,.13,0]} scale={[.12,.35,.07]} rotation={[0,0,side*-.35]} material={material} raycast={noRaycast}><sphereGeometry args={[1,8,6]}/></mesh>)}
    <mesh position={[0,.63,0]} material={material} raycast={noRaycast}><coneGeometry args={[.22,.26,5]}/></mesh>
  </group>
}
