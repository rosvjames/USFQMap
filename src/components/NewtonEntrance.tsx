import { VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import { useEffect,useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'
import { CAMPUS_BUILDINGS,CAMPUS_WALKWAYS } from '../lib/campus'
import { createPavedShapes,createRoofGeometry,createWalkwayGeometry,walkwayOutlines } from '../lib/architecture'
import { NEWTON_ENTRANCE as h,NEWTON_LAWNS,NEWTON_ACCESS_PATH,newtonHeightAt } from '../lib/newton'
const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
/** The lower orange wing and its second lake-facing entrance in the supplied photograph. */
export function NewtonEntrance({materials}:{materials:CampusMaterials}) {
  const finish=useMemo(()=>({glass:new MeshStandardMaterial({color:'#324d4d',roughness:.24,metalness:.35}),iron:new MeshStandardMaterial({color:'#35443c',roughness:.65,metalness:.3})}),[])
  const lawns=useMemo(()=>{
    const paths=CAMPUS_WALKWAYS.filter(w=>!w.bridge).flatMap(w=>walkwayOutlines(w.line,(w.mappedWidth ?? VISUAL_PATH_WIDTHS[w.osmId] ?? w.width)+.24))
    return createPavedShapes(NEWTON_LAWNS,[...CAMPUS_BUILDINGS.map(b=>b.ring),...paths]).map(shape=>{
      const points=shape.extractPoints(1),g=createRoofGeometry(points.shape.map(p=>[p.x,p.y] as Vec2),0,0,points.holes.map(r=>r.map(p=>[p.x,p.y] as Vec2)))
      const p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,newtonHeightAt([p.getX(i),-p.getZ(i)])??h.ground)
      g.computeVertexNormals();return g
    })
  },[])
  const approach=useMemo(()=>createWalkwayGeometry(NEWTON_ACCESS_PATH.slice(1),2.1,p=>newtonHeightAt(p)??h.ground),[])
  useEffect(()=>()=>{Object.values(finish).forEach(m=>m.dispose());lawns.forEach(g=>g.dispose());approach.dispose()},[finish,lawns,approach])
  return <group>
    {lawns.map((g,i)=><mesh key={i} geometry={g} material={materials.grass} receiveShadow raycast={noRaycast}/>)}
    <mesh geometry={approach} material={materials.lakePaving} receiveShadow raycast={noRaycast}/>
    <group position={[h.center[0],0,-h.center[1]]} rotation={[0,h.angle,0]}>
      {/* Two rows of broad rectangular windows, leaving the portal clear. */}
      {[2.05,5.55].map(y=><group key={y}>
        {Array.from({length:6},(_,i)=>-h.width/2+(i+.5)*h.width/6).filter(x=>Math.abs(x-h.x)>h.portalWidth/2+1.2).map(x=><group key={x}>
          <Block at={[x,y,.12]} size={[2.6,1.95,.19]} material={materials.cream}/>
          <Block at={[x,y,.25]} size={[2.27,1.65,.12]} material={finish.glass}/>
          <Block at={[x,y,.33]} size={[.055,1.65,.07]} material={finish.iron}/>
        </group>)}
      </group>)}
      {[3.75,7.4].map(y=><group key={y}>
        {([[-h.width/2,h.x-h.portalWidth/2],[h.x+h.portalWidth/2,h.width/2]] as Vec2[]).map(([a,b],i)=><Block key={i} at={[(a+b)/2,y,.18]} size={[b-a,.18,.37]} material={materials.cream}/>)}
      </group>)}
      <Block at={[h.x,(h.level+h.ground)/2,.6]} size={[h.stairWidth,h.level-h.ground,1.2]} material={materials.entranceStone}/>
      {Array.from({length:h.steps},(_,i)=>{
        const top=h.level-i*(h.level-h.ground)/h.steps,run=(h.stairFront-h.platformFront)/h.steps
        return <Block key={i} at={[h.x,(top+h.ground)/2,h.platformFront+(i+.5)*run]} size={[h.stairWidth,top-h.ground,run]} material={materials.entranceStone}/>
      })}
      <Block at={[h.x,h.level+2.75,.12]} size={[h.portalWidth,5.8,.18]} material={materials.cream}/>
      <Block at={[h.x,h.level+2.75,.27]} size={[4.2,5.35,.12]} material={finish.glass}/>
      {[-2.3,2.3].map(x=><Block key={x} at={[h.x+x,h.level+2.75,.52]} size={[.4,5.8,.7]} material={materials.cream}/>)}
      <Block at={[h.x,h.level+5.65,.52]} size={[5.55,.35,.8]} material={materials.cream}/>
      {[-2.1,0,2.1].map(x=><Block key={x} at={[h.x+x,h.level+2.75,.39]} size={[.065,5.35,.09]} material={finish.iron}/>)}
      {[2.7,4.3].map(y=><Block key={y} at={[h.x,h.level+y,.39]} size={[4.2,.07,.09]} material={finish.iron}/>)}
      <Block at={[h.x,h.level+1.3,.49]} size={[2.3,2.6,.1]} material={finish.glass}/>
      {[-1.15,0,1.15].map(x=><Block key={x} at={[h.x+x,h.level+1.3,.58]} size={[.07,2.6,.08]} material={finish.iron}/>)}
      {[-.16,.16].map(x=><Block key={x} at={[h.x+x,h.level+1.15,.67]} size={[.04,.55,.06]} material={materials.cream}/>)}
      {/* The shallow roof reads as an orange parapet from the lagoon. */}
      <Block at={[0,7.65,-.12]} size={[h.width+.15,.4,.42]} material={materials.academicOrange}/>
      <Block at={[0,7.88,-.12]} size={[h.width+.25,.08,.53]} material={materials.cream}/>
    </group>
  </group>
}
