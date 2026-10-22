import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, ExtrudeGeometry, MeshStandardMaterial, Quaternion, Shape, SRGBColorSpace, Vector3 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { MIGUEL_GARDEN_ENTRANCE as h, MIGUEL_GARDEN_BIN as bin, MIGUEL_GARDEN_TABLES, MIGUEL_ROCKET as rocket } from '../lib/miguelGarden'
import { foliageTexture, palmFrond } from './LandscapeDetails'

const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
function Rod({from,to,radius,material}:{from:Point;to:Point;radius:number;material:MeshStandardMaterial}) {
  const a=new Vector3(...from),b=new Vector3(...to),direction=b.clone().sub(a)
  return <mesh position={a.add(b).multiplyScalar(.5)} quaternion={new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.clone().normalize())} material={material} castShadow raycast={noRaycast}><cylinderGeometry args={[radius,radius,direction.length(),6]}/></mesh>
}

/** Painted markings wrap the exhibit; no photograph is applied to the model. */
function rocketPaint() {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048
  const ctx=canvas.getContext('2d')!,height=11.8
  const y=(level:number)=>(13.4-level)/height*2048
  ctx.fillStyle='#e4e2d9';ctx.fillRect(0,0,1024,2048)
  for(let i=0;i<4;i++) {
    const x=i*256
    ctx.fillStyle='#171d22';ctx.fillRect(x,y(5.1),98,y(1.6)-y(5.1));ctx.fillRect(x,y(10.9),128,y(9.1)-y(10.9))
    ctx.fillRect(x,y(11.1),256,15)
    ctx.fillStyle='#b63d4a';ctx.font='bold 56px sans-serif';ctx.textAlign='center'
    for(const [j,letter] of [...'USA'].entries())ctx.fillText(letter,x+176,y(4.8-j*.48))
    // Thirteen stripes and a blue canton remain legible at close range.
    for(let stripe=0;stripe<13;stripe++) {
      ctx.fillStyle=stripe%2===0?'#b8555a':'#f0ede4';ctx.fillRect(x+135,y(7.9)+stripe*4,87,4)
    }
    ctx.fillStyle='#405971';ctx.fillRect(x+135,y(7.9),37,28)
    ctx.fillStyle='#e7e6df'
    for(let row=0;row<4;row++)for(let col=0;col<5;col++)ctx.fillRect(x+139+col*6,y(7.9)+4+row*6,2,2)
  }
  for(const level of [1.65,5.25,6,8.6,9.05,11.3,12.2,13.3]) {
    ctx.fillStyle='#a9aaa3';ctx.fillRect(0,y(level),1024,3)
    ctx.fillStyle='#f8f6ed';ctx.fillRect(0,y(level)-3,1024,2)
  }
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;return texture
}

export function MiguelRocketGarden({materials}:{materials:CampusMaterials}) {
  const paint=useMemo(rocketPaint,[]),leaves=useMemo(foliageTexture,[]),frond=useMemo(palmFrond,[])
  const finish=useMemo(()=>({
    body:new MeshStandardMaterial({map:paint,roughness:.78,color:'#f7f5ee'}),
    white:new MeshStandardMaterial({color:'#e9e6dc',roughness:.78}),
    black:new MeshStandardMaterial({color:'#20262a',roughness:.66,metalness:.25}),
    metal:new MeshStandardMaterial({color:'#999e9b',roughness:.48,metalness:.65}),
    green:new MeshStandardMaterial({color:'#3f5947',roughness:.83,metalness:.25}),
    gravel:new MeshStandardMaterial({color:'#d7d4bd',map:materials.grass.map,roughness:1}),
    earth:new MeshStandardMaterial({color:'#8d8160',map:materials.grass.map,roughness:1}),
    bark:new MeshStandardMaterial({color:'#766954',roughness:1}),
    leaves:new MeshStandardMaterial({color:'#5f7545',map:leaves,alphaTest:.45,side:DoubleSide,roughness:1}),
    palm:new MeshStandardMaterial({color:'#799149',side:DoubleSide,roughness:1}),
    hedge:new MeshStandardMaterial({color:'#8d9c40',roughness:1}),
    flower:new MeshStandardMaterial({color:'#9673a0',roughness:1}),
  }),[paint,leaves,materials])
  const fin=useMemo(()=>{
    const shape=new Shape();shape.moveTo(.75,1.55);shape.lineTo(1.8,1.55);shape.lineTo(1.8,1.9);shape.lineTo(.82,4.4);shape.closePath()
    return new ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false})
  },[])
  useEffect(()=>()=>{Object.values(finish).forEach(m=>m.dispose());paint.dispose();leaves.dispose();frond.dispose();fin.dispose()},[finish,paint,leaves,frond,fin])
  return <group position={[h.center[0],.55,-h.center[1]]} rotation={[0,h.angle,0]}>
    {/* Sparse lawn with the worn earth seen between the exhibit and the bins. */}
    {[[10,17,3.4,5.7],[7.5,11,1.8,3.3],[12.3,21,2.1,2.2]].map(([x,z,rx,rz],i)=><mesh key={i} position={[x,-.025+i*.002,z]} rotation={[-Math.PI/2,0,.17+i*.3]} scale={[rx,rz,1]} material={finish.earth} receiveShadow raycast={noRaycast}><circleGeometry args={[1,28]}/></mesh>)}
    <group position={[rocket.at[0],0,rocket.at[1]]}>
      <Block at={[0,.1,0]} size={[rocket.base,.2,rocket.base]} material={materials.entranceStone}/>
      {/* Five open engine bells, with reinforcing hoops and black display braces. */}
      {[[0,0],[-.57,-.57],[.57,-.57],[-.57,.57],[.57,.57]].map(([x,z],i)=><group key={i} position={[x,.2,z]}>
        <mesh position={[0,.55,0]} material={finish.metal} castShadow raycast={noRaycast}><cylinderGeometry args={[.14,.38,1.1,20,1,true]}/></mesh>
        <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]} material={finish.black} raycast={noRaycast}><circleGeometry args={[.35,20]}/></mesh>
        {[.05,.18,.32,.48,.64].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]} material={finish.metal} raycast={noRaycast}><torusGeometry args={[.38-y*.21,.018,5,20]}/></mesh>)}
      </group>)}
      <mesh position={[0,7.5,0]} material={finish.body} castShadow receiveShadow raycast={noRaycast}><cylinderGeometry args={[rocket.radius,rocket.radius,11.8,64]}/></mesh>
      {Array.from({length:48},(_,i)=>{
        const angle=i*Math.PI/24,x=Math.sin(angle)*.872,z=Math.cos(angle)*.872
        return <group key={i}>{[[2.25,1.2],[5.6,.8],[12.7,1.2]].map(([y,length])=><Rod key={y} from={[x,y-length/2,z]} to={[x,y+length/2,z]} radius={.012} material={finish.white}/>)}</group>
      })}
      {[1.6,6,8.65,11.3,13.4].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]} material={finish.white} raycast={noRaycast}><torusGeometry args={[.868,.018,6,64]}/></mesh>)}
      {/* Stepped upper stages and the slender escape tower. */}
      <mesh position={[0,14.05,0]} material={finish.white} castShadow raycast={noRaycast}><cylinderGeometry args={[.52,.86,1.3,48]}/></mesh>
      <mesh position={[0,15.6,0]} material={finish.white} castShadow raycast={noRaycast}><cylinderGeometry args={[.52,.52,1.8,40]}/></mesh>
      <mesh position={[0,16.3,0]} material={finish.black} raycast={noRaycast}><cylinderGeometry args={[.525,.525,.32,40]}/></mesh>
      <mesh position={[0,17.12,0]} material={finish.white} castShadow raycast={noRaycast}><cylinderGeometry args={[.18,.52,1.25,40]}/></mesh>
      <mesh position={[0,18.05,0]} material={finish.white} castShadow raycast={noRaycast}><cylinderGeometry args={[.07,.18,.6,20]}/></mesh>
      <Rod from={[0,18.35,0]} to={[0,rocket.height,0]} radius={.035} material={finish.metal}/>
      {Array.from({length:24},(_,i)=>{const t=i*Math.PI/12;return <Rod key={i} from={[Math.sin(t)*.526,14.76,Math.cos(t)*.526]} to={[Math.sin(t)*.526,16.1,Math.cos(t)*.526]} radius={.009} material={finish.white}/>})}
      {[0,1,2,3].map(i=><group key={i} rotation={[0,i*Math.PI/2,0]}>
        <mesh geometry={fin} position={[0,0,-.035]} material={finish.white} castShadow receiveShadow raycast={noRaycast}/>
        <Rod from={[1.7,.22,0]} to={[.81,3.4,0]} radius={.055} material={finish.black}/>
        <Block at={[1.65,.2,0]} size={[.5,.08,.35]} material={finish.black}/>
      </group>)}
    </group>
    {/* Pale gravel sitting area, with cast-metal chairs and round openwork tables. */}
    <mesh position={[16.8,.015,18]} rotation={[-Math.PI/2,0,0]} scale={[3.8,4.9,1]} material={finish.gravel} receiveShadow raycast={noRaycast}><circleGeometry args={[1,40]}/></mesh>
    {MIGUEL_GARDEN_TABLES.map(([x,z],i)=><group key={i} position={[x,.05,z]}>
      <mesh position={[0,.78,0]} rotation={[Math.PI/2,0,0]} material={finish.white} castShadow raycast={noRaycast}><torusGeometry args={[.65,.035,8,32]}/></mesh>
      <Rod from={[0,0,0]} to={[0,.78,0]} radius={.065} material={finish.white}/>
      {Array.from({length:12},(_,j)=>{const a=j*Math.PI/6;return <Rod key={j} from={[0,.78,0]} to={[Math.sin(a)*.62,.78,Math.cos(a)*.62]} radius={.014} material={finish.white}/>})}
      {[0,1,2].map(j=><group key={j} rotation={[0,j*Math.PI*2/3+i*.4,0]}>
        <Rod from={[0,.12,0]} to={[.45,.04,0]} radius={.035} material={finish.white}/>
        <group position={[0,0,1.2]} rotation={[0,Math.PI,0]}>
          <mesh position={[0,.43,0]} material={finish.white} castShadow raycast={noRaycast}><cylinderGeometry args={[.25,.25,.035,20]}/></mesh>
          <mesh position={[0,.79,-.24]} scale={[1,1.2,1]} material={finish.white} castShadow raycast={noRaycast}><torusGeometry args={[.24,.022,6,20]}/></mesh>
          {[-.18,.18].flatMap(dx=>[-.18,.18].map(dz=><Rod key={`${dx}-${dz}`} from={[dx*1.3,0,dz*1.3]} to={[dx,.43,dz]} radius={.018} material={finish.white}/>))}
          {[-.18,0,.18].map(dx=><Rod key={dx} from={[dx,.48,-.24]} to={[-dx,.94,-.24]} radius={.012} material={finish.white}/>)}
        </group>
      </group>)}
    </group>)}
    {/* Three-compartment green recycling bin, with recessed top openings. */}
    <group position={[bin.at[0],0,bin.at[1]]} rotation={[0,-.15,0]}>
      <Block at={[0,.58,0]} size={[bin.width,1.16,bin.depth]} material={finish.green}/>
      {[-.7,0,.7].map((x,i)=><group key={x}>
        <Block at={[x,1.19,0]} size={[.68,.1,.9]} material={finish.green}/>
        <mesh position={[x,1.245,0]} rotation={[-Math.PI/2,0,0]} material={finish.black} raycast={noRaycast}><circleGeometry args={[.18,24]}/></mesh>
        <Block at={[x,.66,.433]} size={[.4,.64,.012]} material={finish.white}/>
        <Block at={[x,.91,.447]} size={[.4,.12,.015]} material={i===0?finish.green:i===1?finish.black:finish.metal}/>
        <mesh position={[x,.63,.452]} material={finish.green} raycast={noRaycast}><torusGeometry args={[.11,.014,6,16]}/></mesh>
      </group>)}
    </group>
    {/* A green camera post stands beside the lawn rather than in the entry path. */}
    <Rod from={[12,0,12.8]} to={[12,4.1,12.8]} radius={.055} material={finish.green}/>
    <Block at={[12.4,4.1,12.8]} size={[.9,.1,.12]} material={finish.green}/>
    <mesh position={[12.73,3.91,12.8]} material={finish.white} raycast={noRaycast}><sphereGeometry args={[.16,12,8]}/></mesh>
    <mesh position={[12.73,3.85,12.8]} material={finish.black} raycast={noRaycast}><sphereGeometry args={[.125,12,8]}/></mesh>
    {/* Palms next to the glazing; broad, branching trees stay beyond the exhibit. */}
    {[[4.8,2.4,5.8],[18,3.6,6.8]].map(([x,z,height],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,height/2,0]} material={finish.bark} castShadow raycast={noRaycast}><cylinderGeometry args={[.15,.25,height,9]}/></mesh>
      {Array.from({length:13},(_,j)=><mesh key={j} position={[0,height-.2+(j%3)*.15,0]} rotation={[0,j*Math.PI*2/13,.1]} scale={[.85,.85,.85]} geometry={frond} material={finish.palm} castShadow raycast={noRaycast}/>)}
    </group>)}
    {[[20,23,7.8],[20,3,6.3]].map(([x,z,height],i)=><group key={i} position={[x,0,z]}>
      <Rod from={[0,0,0]} to={[.3,height*.75,0]} radius={.15} material={finish.bark}/>
      {Array.from({length:6},(_,j)=>{const t=j*2.4,dx=Math.sin(t)*1.8,dz=Math.cos(t)*1.8;return <group key={j}>
        <Rod from={[.15,height*.45,0]} to={[dx,height-.6,dz]} radius={.06} material={finish.bark}/>
        <mesh position={[dx,height+(j%2)*.6,dz]} scale={[1.8,1.1,1.7]} rotation={[0,t,0]} material={finish.leaves} castShadow raycast={noRaycast}><icosahedronGeometry args={[1,2]}/></mesh>
      </group>})}
    </group>)}
    {[[13,4],[19,7],[19.8,12.5],[12.4,20],[6,2]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      {Array.from({length:9},(_,j)=><mesh key={j} position={[Math.sin(j*2.4)*1.1,.35,Math.cos(j*2.4)*.65]} scale={[.55,.37,.5]} material={finish.hedge} castShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>)}
      {i%2===0&&Array.from({length:12},(_,j)=><mesh key={`f${j}`} position={[Math.sin(j*2.4)*.8,.72+Math.sin(j)*.1,Math.cos(j*2.4)*.5]} material={finish.flower} raycast={noRaycast}><icosahedronGeometry args={[.11,0]}/></mesh>)}
    </group>)}
  </group>
}
