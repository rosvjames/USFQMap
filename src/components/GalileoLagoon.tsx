import { useEffect,useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { Vec2 } from '../types'
import type { CampusMaterials } from '../lib/materials'
import { CAMPUS_BUILDINGS } from '../lib/campus'
import { createPavedShapes,createWalkwayGeometry } from '../lib/architecture'
import { LANDSCAPE_PATH_CUTOUTS,createGalileoLawn } from '../lib/raisedLawn'
import { GALILEO_ENTRANCE as h,GALILEO_LAGOON,LAGOON_GARDEN,LAGOON_PALMS,GALILEO_ACCESS_PATH,galileoHeightAt,galileoToCampus,clearLagoonPlant } from '../lib/galileo'
import { Bush,Palm,Tree } from './CampusPlants'

type Point=[number,number,number]
const noRaycast=()=>null
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size}/></mesh>
}
/** Raised Galileo portal and planted lake margin interpreted from the supplied photograph. */
export function GalileoLagoon({materials}:{materials:CampusMaterials}) {
  const owned=useMemo(()=>({
    iron:new MeshStandardMaterial({color:'#364843',metalness:.35,roughness:.65}),
    flower:new MeshStandardMaterial({color:'#d5bd3b',roughness:1}),
  }),[])
  // The pane is shared and owned by the campus materials, so it is not part of the set disposed below.
  const finish={...owned,glass:materials.glass('#354f55')}
  const obstacles=[...CAMPUS_BUILDINGS.map(b=>b.ring),...LANDSCAPE_PATH_CUTOUTS,GALILEO_LAGOON.ring]
  const gardens=useMemo(()=>createPavedShapes([LAGOON_GARDEN],obstacles),[])
  const lawn=useMemo(createGalileoLawn,[])
  const border=useMemo(()=>createWalkwayGeometry(GALILEO_LAGOON.ring,.22,.46),[])
  const approach=useMemo(()=>createWalkwayGeometry(GALILEO_ACCESS_PATH.slice(1),2.1,.565),[])
  const flowers=useMemo(()=>{
    const result:Vec2[]=[]
    LAGOON_GARDEN.slice(1).forEach((b,i)=>{
      const a=LAGOON_GARDEN[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.75)
      for(let j=0;j<count;j++) {
        const t=j/count,p:Vec2=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
        // Interrupted clusters leave lawn and rocks visible, as in the photo.
        if((j+i*3)%15<6&&clearLagoonPlant(p,.4))result.push(p)
      }
    })
    return result
  },[])
  const stones=useMemo(()=>GALILEO_LAGOON.ring.slice(1).flatMap((b,i)=>{
    const a=GALILEO_LAGOON.ring[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.68)
    return Array.from({length:count},(_,j)=>{
      const t=j/count,phase=i*17+j*2.37
      return {x:a[0]+(b[0]-a[0])*t+Math.sin(phase)*.15,y:a[1]+(b[1]-a[1])*t+Math.cos(phase)*.15,phase,
        width:.36+(Math.sin(phase)+1)*.18,height:.2+(Math.cos(phase*1.7)+1)*.12}
    })
  }),[])
  useEffect(()=>()=>{Object.values(owned).forEach(m=>m.dispose());lawn.tops.forEach(g=>g.dispose());lawn.sides.dispose();border.dispose();approach.dispose()},[owned,lawn,border,approach])
  const palms=[...LAGOON_PALMS.filter(p=>clearLagoonPlant(p,1)),...([[-10,5], [5.7,5.5]] as Vec2[]).map(galileoToCampus)]
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.51,0]} material={materials.garden} receiveShadow raycast={noRaycast}>
      <shapeGeometry args={[gardens]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/>
    </mesh>
    {lawn.tops.map((g,i)=><mesh key={i} geometry={g} material={materials.grass} receiveShadow raycast={noRaycast}/>)}
    <mesh geometry={lawn.sides} material={materials.soil} receiveShadow raycast={noRaycast}/>
    <mesh geometry={border} material={materials.pondRock} receiveShadow raycast={noRaycast}/>
    <mesh geometry={approach} material={materials.lakePaving} receiveShadow raycast={noRaycast}/>
    <group position={[h.center[0],0,-h.center[1]]} rotation={[0,h.angle,0]}>
      <Block at={[h.x,h.level/2,1.5]} size={[h.stairWidth,h.level,3]} material={materials.entranceStone}/>
      {Array.from({length:h.steps},(_,i)=>{
        const top=h.level-i*(h.level-h.ground)/h.steps
        return <Block key={i} at={[h.x,(top+h.ground)/2,h.platformFront+(i+.5)*.42]} size={[h.stairWidth,top-h.ground,.42]} material={materials.entranceStone}/>
      })}
      <Block at={[0,10.75,-.12]} size={[h.width+.15,.5,.42]} material={materials.academicOrange}/>
      <Block at={[0,11.03,-.12]} size={[h.width+.25,.08,.53]} material={materials.cream}/>
      {/* Pale portal frames a tall glazed hall, with a double door at the raised landing. */}
      <Block at={[h.x,h.level+3.4,.29]} size={[h.portalWidth,7.1,.18]} material={materials.cream}/>
      <Block at={[h.x,h.level+3.25,.43]} size={[6.5,6.55,.12]} material={finish.glass}/>
      {[h.x-3.45,h.x+3.45].map(x=><Block key={x} at={[x,h.level+3.25,.6]} size={[.45,6.95,.3]} material={materials.cream}/>)}
      <Block at={[h.x,h.level+6.8,.6]} size={[h.portalWidth+.5,.38,.7]} material={materials.cream}/>
      {[-3,-1.5,0,1.5,3].map(x=><Block key={x} at={[h.x+x,h.level+3.25,.55]} size={[.055,6.55,.055]} material={finish.iron}/>)}
      {[2.65,4.55].map(y=><Block key={y} at={[h.x,h.level+y,.55]} size={[6.5,.07,.06]} material={finish.iron}/>)}
      {[-2.25,-.75,.75,2.25].map(x=><group key={x} position={[h.x+x,h.level+4.55,.58]}>
        {[-1,1].map(s=><mesh key={s} rotation={[0,0,s*.36]} material={finish.iron} raycast={noRaycast}><boxGeometry args={[.04,3.55,.045]}/></mesh>)}
      </group>)}
      <Block at={[h.x,h.level+1.3,.62]} size={[2.5,2.6,.1]} material={finish.glass}/>
      {[-1.25,0,1.25].map(x=><Block key={x} at={[h.x+x,h.level+1.3,.72]} size={[.07,2.6,.08]} material={finish.iron}/>)}
      {[-.17,.17].map(x=><Block key={x} at={[h.x+x,h.level+1.1,.81]} size={[.045,.6,.05]} material={materials.cream}/>)}
      {[-1,1].map(s=><group key={s}>
        <Block at={[h.x+s*3.4,1.08,2.8]} size={[.38,1.06,4.4]} material={materials.hallRed}/>
        <Block at={[h.x+s*3.4,1.68,2.8]} size={[.55,.15,4.5]} material={materials.cream}/>
        <Block at={[h.x+s*3.7,1.57,4.9]} size={[.78,2.04,.78]} material={materials.cream}/>
        <Block at={[h.x+s*3.7,2.65,4.9]} size={[1.05,.16,1.05]} material={materials.cream}/>
        {[1.15,1.6,2.05].map(y=><Block key={y} at={[h.x+s*3.7,y,5.31]} size={[.81,.035,.035]} material={materials.entranceStone}/>)}
      </group>)}
    </group>
    {palms.map(([x,y],i)=>{
      const ground=galileoHeightAt([x,y])??.55,scale=i>=palms.length-2?.95:.85+i%3*.12,height=5.2*scale
      return <Palm key={i} materials={materials} position={[x,ground,-y]} height={height} girth={scale*1.3} crown={scale} yaw={i*1.3}/>
    })}
    {flowers.map(([x,y],i)=><group key={i} position={[x,.72,-y]}>
      <Bush materials={materials} scale={[.52,.3,.46]} rotation={i} tone="#d7e0a8"/>
      {[-1,1].map(s=><mesh key={s} position={[s*.18,.23,s*.1]} scale={[.1,.055,.1]} material={finish.flower} raycast={noRaycast}><icosahedronGeometry args={[1,0]}/></mesh>)}
    </group>)}
    {/* Irregular stones follow the existing water outline; no straight concrete rim. */}
    {stones.map((s,i)=><mesh key={'bank'+i} position={[s.x,.46+s.height/2,-s.y]} scale={[s.width,s.height,s.width*.85]} rotation={[s.phase*.1,s.phase,.1]} material={materials.pondRock} castShadow receiveShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>)}
    {/* Stacked rock outcrop on the Newton-facing bank, away from the footway. */}
    <group position={[29.8,.43,17.5]}>
      {Array.from({length:19},(_,i)=>{
        const tier=Math.floor(i/6),angle=i*2.4,radius=tier===3?0:1.2-tier*.3
        return <mesh key={i} position={[Math.cos(angle)*radius,.38+tier*.73,Math.sin(angle)*radius]} scale={[.67-tier*.08,.56,.62-tier*.06]} rotation={[i*.2,angle,.2]} material={materials.pondRock} castShadow receiveShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>
      })}
    </group>
    {([[3,-17],[34,-15.5]] as Vec2[]).filter(p=>clearLagoonPlant(p,.25)).map(([x,y],i)=><Tree key={'tree'+i} materials={materials} position={[x,.55,-y]} height={5.2} crown={2.7} rotation={i*2.3} tone={i?'#b2c29f':'#bdc9aa'}/>)}
    {/* Low rocks and planting at the bank, kept away from pedestrian paths. */}
    {[[-8,-29],[34.5,-35.2],[40.7,-20.5]].filter(p=>clearLagoonPlant(p as Vec2)).map(([x,y],i)=><mesh key={i} position={[x,.95,-y]} scale={[1.15,.8,.95]} rotation={[.1,i,0]} material={materials.pondRock} castShadow receiveShadow raycast={noRaycast}><icosahedronGeometry args={[1,1]}/></mesh>)}
  </group>
}
