import { useEffect, useMemo } from 'react'
import { BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, SRGBColorSpace } from 'three'
import { HALL_ENTRANCE } from '../lib/hall'
import { HALL_FLAGS, HALL_FLAG_GARDEN as garden } from '../lib/hallFlags'
import type { CampusMaterials } from '../lib/materials'

type Point=[number,number,number]
const noRaycast=()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
function bannerTexture(colors:string[],letters:string) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512
  const ctx=canvas.getContext('2d')!
  colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*128,0,128,512)})
  ctx.strokeStyle='#d6bd79';ctx.lineWidth=7;ctx.strokeRect(4,4,248,504)
  ctx.fillStyle='#d8bd73';ctx.font='bold 75px Georgia';ctx.textAlign='center';ctx.fillText(letters[0],66,160);ctx.fillText(letters[1],190,160)
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture
}
function createBannerGeometry() {
  const p:number[]=[],uv:number[]=[],idx:number[]=[],nx=8,ny=12
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx,v=j/ny
    p.push(u*1.25,-v*3.25-(v>.85?(v-.85)*(.65-Math.abs(u-.5)):.0),.07+Math.sin(u*Math.PI*3+v*1.6)*.11)
    uv.push(u,1-v)
  }
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}

/** Ten collegiate banners and low iron fencing at the street end of the open Hall lawn. */
export function HallFlags({materials}:{materials:CampusMaterials}) {
  const finishes=useMemo(()=>({iron:new MeshStandardMaterial({color:'#29332d',roughness:.75,metalness:.35}),pole:new MeshStandardMaterial({color:'#c6ccc6',roughness:.4,metalness:.7})}),[])
  const banners=useMemo(()=>HALL_FLAGS.map(({colors,letters})=>{
    const texture=bannerTexture(colors,letters);return{texture,material:new MeshStandardMaterial({map:texture,roughness:1,side:DoubleSide})}
  }),[])
  const cloth=useMemo(createBannerGeometry,[])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());banners.forEach(({texture,material})=>{texture.dispose();material.dispose()});cloth.dispose()},[finishes,banners,cloth])
  return <group position={[HALL_ENTRANCE.center[0],garden.ground,-HALL_ENTRANCE.center[1]]} rotation={[0,HALL_ENTRANCE.angle,0]}>
    <Fence from={garden.left} to={garden.right} z={garden.front} material={finishes.iron}/>
    {[-1,1].map(side=><group key={side} position={[side<0?garden.left:garden.right,0,garden.front]} rotation={[0,Math.PI/2,0]}><Fence from={0} to={6.4} z={0} material={finishes.iron}/></group>)}
    {HALL_FLAGS.map(({at,side},i)=><group key={i} position={[at[0],0,at[1]]}>
      <Block at={[0,.1,0]} size={[.42,.2,.42]} material={materials.entranceStone}/>
      <mesh position={[0,3.8,0]} material={finishes.pole} castShadow raycast={noRaycast}><cylinderGeometry args={[.037,.052,7.6,10]}/></mesh>
      <mesh position={[0,7.69,0]} material={finishes.pole} raycast={noRaycast}><sphereGeometry args={[.095,12,8]}/></mesh>
      <Block at={[-side*.65,7.4,0]} size={[1.4,.035,.035]} material={finishes.pole}/>
      <mesh position={[side<0?.04:-1.29,7.37,0]} geometry={cloth} material={banners[i].material} castShadow raycast={noRaycast}/>
    </group>)}
  </group>
}
function Fence({from,to,z,material}:{from:number;to:number;z:number;material:MeshStandardMaterial}) {
  const n=Math.ceil((to-from)/.36),sections=Math.ceil((to-from)/2.2)
  return <group>
    {[.1,.3,1.18].map(y=><Block key={y} at={[(from+to)/2,y,z]} size={[to-from,.045,.045]} material={material}/>)}
    {Array.from({length:n+1},(_,i)=><Block key={i} at={[from+(to-from)*i/n,.65,z]} size={[.025,1.14,.025]} material={material}/>)}
    {Array.from({length:sections+1},(_,i)=><Block key={`post${i}`} at={[from+(to-from)*i/sections,.68,z]} size={[.11,1.35,.11]} material={material}/>)}
    {Array.from({length:n},(_,i)=>([-1,1] as const).map(side=><mesh key={`${i}-${side}`} position={[from+(to-from)*(i+.5)/n,.2,z+.01]} rotation={[0,0,side*Math.PI/4]} material={material} raycast={noRaycast}><boxGeometry args={[.018,.29,.025]}/></mesh>))}
  </group>
}
