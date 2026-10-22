import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Group, SpriteMaterial, SRGBColorSpace } from 'three'
const noRaycast=()=>null

/** A small, bounded burst of world-sized hearts that follows the animal and fades out. */
export function AnimalHearts({burst,height}:{burst:number;height:number}) {
  const root=useRef<Group>(null)
  const material=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='#f25589';ctx.strokeStyle='#ffe0ea';ctx.lineWidth=5
    ctx.beginPath();ctx.moveTo(64,113);ctx.bezierCurveTo(44,97,7,69,7,40);ctx.bezierCurveTo(7,7,47,3,64,30);ctx.bezierCurveTo(81,3,121,7,121,40);ctx.bezierCurveTo(121,69,84,97,64,113);ctx.closePath();ctx.fill();ctx.stroke()
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace
    return new SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false})
  },[])
  useEffect(()=>()=>{material.map?.dispose();material.dispose()},[material])
  useFrame(()=>{
    if(!root.current)return
    const age=(performance.now()-burst)/1000
    root.current.visible=burst>0&&age>=0&&age<1.65&&!document.hidden
    if(!root.current.visible)return
    const t=age/1.65
    material.opacity=Math.min(1,age*8)*(1-t)
    root.current.children.forEach((heart,i)=>{
      const angle=i*2.4
      heart.position.set(Math.sin(angle)*(.25+t*.7),height+t*1.5+i*.075,Math.cos(angle)*(.25+t*.5))
      const size=(.28+i%3*.06)*Math.min(1,age*7)
      heart.scale.set(size,size,1)
    })
  })
  return <group ref={root} visible={false} name="animal-heart-burst">
    {Array.from({length:7},(_,i)=><sprite key={i} material={material} raycast={noRaycast}/>)}
  </group>
}
