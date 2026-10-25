import { useEffect,useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { useMiguelMaterials } from './MiguelMaterials'
import { createPavedShapes,createWalkwayGeometry } from '../lib/architecture'
import { CAMPUS_BUILDINGS } from '../lib/campus'
import { MIGUEL_GARDEN_ENTRANCE as h,MIGUEL_GARDEN_APPROACH,MIGUEL_GARDEN_FORECOURT } from '../lib/miguelGarden'
import { MiguelRocketGarden } from './MiguelRocketGarden'
import { boxUv } from '../lib/worldUv'
const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  // Miguel's own plaster and roof maps are not projected by the batcher, so each box carries metric UVs (one tile per 2.4 m).
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={boxUv}/></mesh>
}
/** Full-height glazed garden entrance from the second Miguel photograph. */
export function MiguelGardenEntrance({materials:base}:{materials:CampusMaterials}) {
  const materials=useMiguelMaterials(base)
  const owned=useMemo(()=>({
    frame:new MeshStandardMaterial({color:'#8bbcab',metalness:.35,roughness:.52}),
    dark:new MeshStandardMaterial({color:'#52665b',roughness:.8}),
  }),[])
  // The panes are the shared matte glass, owned by the campus materials, so they stay out of the set disposed below.
  const finish={...owned,glass:materials.glass('#243b2c'),reflection:materials.glass('#344b35'),door:materials.glass('#182d24')}
  const walk=useMemo(()=>createWalkwayGeometry(MIGUEL_GARDEN_APPROACH,2.2,h.ground+.01),[])
  const garden=useMemo(()=>createPavedShapes([MIGUEL_GARDEN_FORECOURT],CAMPUS_BUILDINGS.map(b=>b.ring)),[])
  useEffect(()=>()=>{Object.values(owned).forEach(m=>m.dispose());walk.dispose()},[owned,walk])
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.51,0]} material={materials.grass} receiveShadow raycast={noRaycast}><shapeGeometry args={[garden]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/></mesh>
    <mesh geometry={walk} material={materials.lakePaving} receiveShadow raycast={noRaycast}/>
    <group position={[h.center[0],0,-h.center[1]]} rotation={[0,h.angle,0]}>
      <Block at={[0,h.height/2,-h.depth/2]} size={[h.width-.4,h.height,h.depth]} material={materials.miguelCream}/>
      {[-1,1].map(side=><group key={side} position={[side*(h.width/2-.19),(h.height+h.ground)/2,-h.depth/2]} rotation={[0,side*Math.PI/2,0]}>
        <Block at={[0,0,0]} size={[h.depth,h.height-h.ground,.1]} material={finish.glass}/>
        {Array.from({length:5},(_,i)=><Block key={i} at={[-h.depth/2+i*h.depth/4,0,.12]} size={[.06,h.height-h.ground,.1]} material={finish.frame}/>)}
        {Array.from({length:6},(_,i)=><Block key={i} at={[0,-(h.height-h.ground)/2+i*(h.height-h.ground)/5,.12]} size={[h.depth,.1,.1]} material={finish.frame}/>)}
      </group>)}
      {/* Flat green cap, unlike the pitched roofs of the adjacent wings. */}
      <Block at={[0,h.height+.09,-h.depth/2]} size={[h.width+.45,.18,h.depth+.4]} material={materials.tealRoof}/>
      <Block at={[0,h.height-.02,.05]} size={[h.width+.3,.16,.35]} material={finish.frame}/>
      {/* Alternating pale panes suggest the floors and tree reflections in the photograph. */}
      {Array.from({length:5},(_,row)=>Array.from({length:6},(_,col)=>{
        const w=(h.width-.4)/6,tall=(h.height-h.ground-.25)/5
        return <Block key={`${row}-${col}`} at={[-(h.width-.4)/2+(col+.5)*w,h.ground+(row+.5)*tall,.18]} size={[w-.065,tall-.09,.16]} material={(row+col)%3===0?finish.reflection:finish.glass}/>
      }))}
      {Array.from({length:7},(_,i)=><Block key={i} at={[-(h.width-.4)/2+i*(h.width-.4)/6,(h.height+h.ground)/2,.35]} size={[i%3===0?.11:.06,h.height-h.ground,.16]} material={finish.frame}/>)}
      {Array.from({length:6},(_,i)=><Block key={i} at={[0,h.ground+i*(h.height-h.ground-.25)/5,.37]} size={[h.width-.2,.12,.17]} material={finish.frame}/>)}
      {[3.46,6.39,9.32,12.25].map(y=><Block key={y} at={[0,y-.16,.32]} size={[h.width-.28,.075,.08]} material={finish.dark}/>)}
      {[-1,1].map(side=><Block key={side} at={[side*(h.width/2-.01),(h.height+h.ground)/2,.29]} size={[.19,h.height-h.ground,.44]} material={finish.frame}/>)}
      <Block at={[0,h.ground+.065,.78]} size={[h.width+.12,.13,1.7]} material={materials.entranceStone}/>
      {/* Wide glass entrance with two central leaves and fixed side panels. */}
      <Block at={[0,h.ground+1.36,.44]} size={[h.width-.55,2.72,.13]} material={finish.door}/>
      {[-3.12,-1.5,0,1.5,3.12].map(x=><Block key={x} at={[x,h.ground+1.36,.59]} size={[.085,2.72,.15]} material={finish.frame}/>)}
      <Block at={[0,h.ground+2.73,.58]} size={[h.width-.35,.13,.16]} material={finish.frame}/>
      {[-.17,.17].map(x=><Block key={x} at={[x,h.ground+1.17,.72]} size={[.045,.65,.065]} material={finish.frame}/>)}
      {/* Narrow, level shelter across the ground-floor doors. */}
      <Block at={[0,h.ground+2.98,.89]} size={[h.width+1.1,.13,1.8]} material={materials.tealRoof}/>
      {[-1,1].map(side=><group key={side}>
        <Block at={[side*(h.width/2+.42),h.ground+1.47,1.51]} size={[.07,2.94,.07]} material={finish.frame}/>
      </group>)}
      {/* Light inlaid paving bands lead directly to the doors. */}
      {[3.6,7.0,10.4,13.7].map(z=><Block key={z} at={[.1,.59,z]} size={[2.1,.015,.12]} material={materials.cream}/>)}
    </group>
    <MiguelRocketGarden materials={materials}/>
  </group>
}
