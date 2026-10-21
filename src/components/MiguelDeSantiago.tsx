import polygonClipping from 'polygon-clipping'
import { MIGUEL_GARDEN_ROOF_CUT, isMiguelGardenTowerFace, isMiguelGlazedGardenFace } from '../lib/miguelGarden'
import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, ExtrudeGeometry, MeshStandardMaterial, Shape, Vector2 } from 'three'
import type { Vec2 } from '../types'
import type { CampusMaterials } from '../lib/materials'
import { CAMPUS_BUILDINGS } from '../lib/campus'
import { createPavedShapes, createRoofGeometry } from '../lib/architecture'
import { CAMPUS_GATE, MIGUEL_DRINKING_WALL as wall, MIGUEL_FORECOURT_RAILS, MIGUEL_RAIL_Z, MIGUEL_PLANTER_X, MIGUEL_ENTRANCE as entrance, MIGUEL_VOLUMES, MIGUEL_WORLD_FORECOURT, isMiguelExteriorEdge, miguelToCampus } from '../lib/miguel'

const noRaycast=()=>null
type Point=[number,number,number]
function Block({at,size,material}:{at:Point;size:Point;material:MeshStandardMaterial}) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} onUpdate={g=>{
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv')
    for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.4)
    uv.needsUpdate=true
  }}/></mesh>
}
function pyramidRoof(ring:Vec2[],height:number,rise:number) {
  const center:Vec2=[ring.reduce((sum,p)=>sum+p[0],0)/ring.length,ring.reduce((sum,p)=>sum+p[1],0)/ring.length]
  const vertices:number[]=[],uv:number[]=[]
  ring.forEach((a,i)=>{
    const b=ring[(i+1)%ring.length]
    vertices.push(a[0],height,-a[1],center[0],height+rise,-center[1],b[0],height,-b[1])
    uv.push(a[0]/2.4,a[1]/2.4,center[0]/2.4,center[1]/2.4,b[0]/2.4,b[1]/2.4)
  })
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry
}
export function MiguelBuilding({materials,onSelect}:{materials:CampusMaterials;onSelect:()=>void}) {
  const bodies=useMemo(()=>MIGUEL_VOLUMES.map(v=>new ExtrudeGeometry(new Shape(v.ring.map(([x,y])=>new Vector2(x,y))),{depth:v.height,bevelEnabled:false})),[])
  useEffect(()=>()=>bodies.forEach(g=>g.dispose()),[bodies])
  return <group>{bodies.map((geometry,i)=><mesh key={i} geometry={geometry} rotation={[-Math.PI/2,0,0]} material={materials.miguelCream} castShadow receiveShadow onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect()}}/>)}</group>
}

/** Warm plaster wings, green metal roofs and a glazed central tower from the user's photo. */
export function MiguelEntrance({materials}:{materials:CampusMaterials}) {
  const finishes=useMemo(()=>({
    glass:new MeshStandardMaterial({color:'#3c645c',roughness:.2,metalness:.38}),
    gardenGlass:new MeshStandardMaterial({color:'#a3c4b9',roughness:.32,metalness:.25}),
    frame:new MeshStandardMaterial({color:'#8bafa0',roughness:.52,metalness:.45}),
    iron:new MeshStandardMaterial({color:'#344a41',roughness:.65,metalness:.35}),
    stone:new MeshStandardMaterial({color:'#a8afa8',roughness:.94}),
    hedge:new MeshStandardMaterial({color:'#637638',roughness:1}),
    steel:new MeshStandardMaterial({color:'#c2c9c9',roughness:.28,metalness:.8}),
    basin:new MeshStandardMaterial({color:'#687977',roughness:.36,metalness:.65}),
  }),[])
  const roofs=useMemo(()=>MIGUEL_VOLUMES.flatMap(v=>polygonClipping.difference([v.ring],[MIGUEL_GARDEN_ROOF_CUT]).map(p=>createRoofGeometry(p[0] as Vec2[],v.height,v.rise,p.slice(1) as Vec2[][]))),[])
  const towerRoofs=useMemo(()=>[
    pyramidRoof(([[-8.5,-11],[-.5,-11],[-.5,-4],[-8.5,-4]] as Vec2[]).map(miguelToCampus),15.5,2.2),
    pyramidRoof(([[-8.7,-3],[-.3,-3],[-.3,2.2],[-8.7,2.2]] as Vec2[]).map(miguelToCampus),12.45,1.65),
    createRoofGeometry(([[-19.8,-.15],[-5.8,-.15],[-5.8,5.15],[-19.8,5.15]] as Vec2[]).map(miguelToCampus),4.95,.95),
  ],[])
  const paving=useMemo(()=>createPavedShapes([MIGUEL_WORLD_FORECOURT],CAMPUS_BUILDINGS.map(b=>b.ring)),[])
  useEffect(()=>()=>{Object.values(finishes).forEach(m=>m.dispose());[...roofs,...towerRoofs].forEach(g=>g.dispose())},[finishes,roofs,towerRoofs])
  return <group>
    <group position={[CAMPUS_GATE.center[0],0,-CAMPUS_GATE.center[1]]} rotation={[0,CAMPUS_GATE.angle,0]}>
      {/* Open campus gate: paving continues through the wall beneath the existing roof. */}
      <Block at={[0,.55,-3.4]} size={[2.8,.08,7.4]} material={materials.paving}/>
      {[-1.46,1.46].map(x=><Block key={x} at={[x,1.85,.17]} size={[.16,2.6,.24]} material={materials.cream}/>)}
      <Block at={[0,3.1,.17]} size={[3.08,.18,.24]} material={materials.cream}/>
      {[-1.32,1.32].map(x=><Block key={x} at={[x,1.84,.31]} size={[.065,2.55,.08]} material={finishes.iron}/>)}
      <Block at={[0,3.01,.31]} size={[2.7,.065,.08]} material={finishes.iron}/>
      {/* Gate leaves stand open along the passage, preserving the pedestrian opening. */}
      {[-1.3,1.3].map(x=><group key={x} position={[x,0,-.6]} rotation={[0,Math.PI/2,0]}>
        {[.65,2.9].map(y=><Block key={y} at={[0,y,0]} size={[1.2,.06,.06]} material={finishes.iron}/>)}
        {Array.from({length:6},(_,i)=><Block key={i} at={[-.6+i*.24,1.775,0]} size={[.035,2.25,.035]} material={finishes.iron}/>)}
      </group>)}
    </group>
    {roofs.map((geometry,i)=><mesh key={i} geometry={geometry} material={materials.tealRoof} castShadow receiveShadow raycast={noRaycast}/>)}
    {towerRoofs.map((geometry,i)=><mesh key={i} geometry={geometry} material={materials.tealRoof} castShadow receiveShadow raycast={noRaycast}/>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.57,0]} material={materials.paving} receiveShadow raycast={noRaycast}><shapeGeometry args={[paving]} onUpdate={g=>{const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);uv.needsUpdate=true}}/></mesh>
    {/* Each split face is checked against the original perimeter; internal seams get no windows. */}
    {MIGUEL_VOLUMES.flatMap((v,i)=>v.ring.slice(1).map((b,j)=>{
      const a=v.ring[j],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
      if(length<.1||!isMiguelExteriorEdge(a,b)||isMiguelGardenTowerFace(a,b))return null
      const glassFront=i===1&&(a[1]+b[1])/2>-39
      const count=Math.max(1,Math.floor(length/4.7)),floors=Math.floor(v.height/3.5)
      if(isMiguelGlazedGardenFace(a,b))return <group key={`${i}-${j}`} position={[(a[0]+b[0])/2,0,-(a[1]+b[1])/2]} rotation={[0,Math.atan2(dy,dx),0]}>
        <GardenCurtainFacade width={length} height={v.height} materials={materials} finishes={finishes}/>
      </group>
      return <group key={`${i}-${j}`} position={[(a[0]+b[0])/2,0,-(a[1]+b[1])/2]} rotation={[0,Math.atan2(dy,dx),0]}>
        {!glassFront&&<Block at={[0,1.65,.06]} size={[length,3.3,.12]} material={materials.hallRed}/>}
        {[3.5,7,v.height].filter(y=>y<=v.height).map((y,k)=><Block key={k} at={[0,y-.08,.14]} size={[length+.12,.16,.3]} material={materials.cream}/>)}
        {!glassFront&&Array.from({length:floors},(_,floor)=>Array.from({length:count},(_,col)=><group key={`${floor}-${col}`}>
          <Block at={[-length/2+(col+.5)*length/count,floor*3.5+1.98,.15]} size={[1.8,2.25,.16]} material={materials.cream}/>
          <Block at={[-length/2+(col+.5)*length/count,floor*3.5+1.98,.27]} size={[1.52,1.97,.08]} material={finishes.glass}/>
          <Block at={[-length/2+(col+.5)*length/count,floor*3.5+1.98,.33]} size={[.035,1.98,.05]} material={finishes.frame}/>
          <Block at={[-length/2+(col+.5)*length/count,floor*3.5+2.35,.33]} size={[1.52,.035,.05]} material={finishes.frame}/>
        </group>))}
      </group>
    }))}
    <group position={[entrance.center[0],0,-entrance.center[1]]} rotation={[0,entrance.angle,0]}>
      <GlazedTower at={[-4.5,6.2,1.98]} size={[7.5,12.4,.25]} finishes={finishes}/>
      {[-8.37,-.63].map(x=><Block key={x} at={[x,6.2,2]} size={[.2,12.4,.4]} material={finishes.frame}/>)}
      <Block at={[-4.5,14,-7.5]} size={[8,3,7]} material={materials.miguelCream}/>
      {[-11.06,-3.94].map(z=><GlazedTower key={z} at={[-4.5,14,z]} size={[7.2,2.35,.1]} finishes={finishes}/>)}
      {[-8.55,-.45].map(x=><group key={x} position={[x,14,-7.5]} rotation={[0,Math.PI/2,0]}><GlazedTower at={[0,0,0]} size={[6.2,2.35,.1]} finishes={finishes}/></group>)}
      <Block at={[-4.5,15.47,-7.5]} size={[8.4,.18,7.4]} material={materials.cream}/>
      {/* Flat roof of the lower wing, with the pale railing visible in the photo. */}
      <Rail from={-23} to={-15.3} z={-.15} level={7.1} material={finishes.frame}/>
      <Block at={[-14.8,entrance.level/2,2.95]} size={[14.4,entrance.level,5.1]} material={materials.entranceStone}/>
      {Array.from({length:5},(_,i)=><Block key={i} at={[entrance.x,.55+.9*(5-i)/10,5.7+i*.4]} size={[10,.9*(5-i)/5,.4]} material={materials.entranceStone}/>)}
      {/* Gray side pavilion and recessed double entrance beneath a wide metal canopy. */}
      <Block at={[-17.1,2.45,1.6]} size={[4.2,4.9,3.2]} material={finishes.stone}/>
      <Block at={[-17.1,3.1,3.26]} size={[2.25,3,.13]} material={materials.cream}/>
      <GlazedTower at={[-17.1,3.1,3.36]} size={[1.98,2.7,.1]} finishes={finishes}/>
      <GlazedTower at={[entrance.x,2.92,.44]} size={[3.7,2.95,.1]} finishes={finishes}/>
      <Block at={[-12.8,4.95,2.5]} size={[14,.28,5.3]} material={materials.tealRoof}/>
      <Block at={[-12.8,4.73,4.9]} size={[14,.2,.18]} material={finishes.stone}/>
      <Block at={[-8.1,2.55,4.9]} size={[.2,4.6,.2]} material={finishes.iron}/>
      {/* A single orange wall and canopy, with the drinking fountain facing Miguel. */}
      <Block at={[wall.x,1.8,wall.z]} size={[wall.width,2.5,wall.depth]} material={materials.hallRed}/>
      <Block at={[-16.3,3.13,11.6]} size={[6.8,.2,3.5]} material={materials.metalRoof}/>
      <Block at={[-16.3,1.5,11.08]} size={[2.8,.18,.8]} material={finishes.steel}/>
      <Block at={[-16.3,1.6,11.08]} size={[2.5,.045,.58]} material={finishes.basin}/>
      {[-17.57,-15.03].map(x=><Block key={x} at={[x,1.62,11.08]} size={[.12,.18,.8]} material={finishes.steel}/>)}
      <Block at={[-16.3,1.62,10.74]} size={[2.8,.18,.1]} material={finishes.steel}/>
      {[-17.1,-16.3,-15.5].map(x=><group key={x}>
        <Block at={[x,1.84,11.36]} size={[.09,.38,.09]} material={finishes.steel}/>
        <Block at={[x,2.01,11.25]} size={[.09,.09,.3]} material={finishes.steel}/>
        <Block at={[x,1.1,11.37]} size={[.08,.7,.1]} material={finishes.steel}/>
        <Block at={[x,1.38,11.12]} size={[.08,.08,.6]} material={finishes.steel}/>
      </group>)}
      {MIGUEL_FORECOURT_RAILS.map(([from,to])=><Rail key={from} from={from} to={to} z={MIGUEL_RAIL_Z} level={.55} material={finishes.iron}/>)}
      {MIGUEL_PLANTER_X.map(x=><group key={x}>
        <Block at={[x,.75,14.2]} size={[2.8,.4,.9]} material={materials.entranceStone}/>
        <Block at={[x,1.08,14.2]} size={[2.5,.4,.7]} material={finishes.hedge}/>
      </group>)}
    </group>
  </group>
}
/** Mint window grid, charcoal columns and red ground-floor walls behind the exhibit. */
function GardenCurtainFacade({width:w,height:h,materials,finishes}:{width:number;height:number;materials:CampusMaterials;finishes:{glass:MeshStandardMaterial;gardenGlass:MeshStandardMaterial;frame:MeshStandardMaterial;iron:MeshStandardMaterial}}) {
  const cols=Math.max(2,Math.ceil(w/1.15)),rows=Math.max(1,Math.round((h-.55)/3.2))
  return <group>
    <Block at={[0,1.8,.07]} size={[w,2.5,.15]} material={materials.hallRed}/>
    <Block at={[0,(h+.55)/2,.17]} size={[w-.08,h-.55,.12]} material={finishes.glass}/>
    {Array.from({length:rows},(_,row)=>Array.from({length:cols},(_,col)=><Block key={`${row}-${col}`} at={[-w/2+(col+.5)*w/cols,.55+(row+.6)*(h-.55)/rows,.245]} size={[w/cols-.14,(h-.55)/rows*.68,.025]} material={finishes.gardenGlass}/>))}
    {Array.from({length:cols+1},(_,i)=><group key={i}>
      <Block at={[-w/2+i*w/cols,(h+.55)/2,.29]} size={[.045,h-.55,.12]} material={finishes.frame}/>
      <Block at={[-w/2+i*w/cols+.11,(h+.55)/2,.3]} size={[.025,h-.55,.1]} material={finishes.frame}/>
    </group>)}
    {Array.from({length:rows+1},(_,i)=><group key={i}>
      <Block at={[0,.55+i*(h-.55)/rows,.27]} size={[w,.085,.17]} material={finishes.frame}/>
      <Block at={[0,.78+i*(h-.55)/rows,.29]} size={[w,.035,.1]} material={finishes.frame}/>
    </group>)}
    {[-1,1].map(side=><Block key={side} at={[side*(w/2-.08),h/2,.32]} size={[.16,h,.3]} material={finishes.iron}/>)}
    <Block at={[0,h-.14,.32]} size={[w+.15,.25,.3]} material={finishes.iron}/>
    <Block at={[0,h+.08,.1]} size={[w+.18,.16,.55]} material={materials.tealRoof}/>
  </group>
}
function GlazedTower({at,size,finishes}:{at:Point;size:Point;finishes:{glass:MeshStandardMaterial;frame:MeshStandardMaterial}}) {
  const [w,h]=size,cols=Math.max(2,Math.round(w/1.3)),rows=Math.max(1,Math.round(h/3.1))
  return <group position={at}>
    <Block at={[0,0,0]} size={size} material={finishes.glass}/>
    {Array.from({length:cols+1},(_,i)=><Block key={i} at={[-w/2+i*w/cols,0,.2]} size={[.055,h,.08]} material={finishes.frame}/>)}
    {Array.from({length:rows+1},(_,i)=><Block key={`r${i}`} at={[0,-h/2+i*h/rows,.2]} size={[w,.065,.08]} material={finishes.frame}/>)}
  </group>
}
function Rail({from,to,z,level,material}:{from:number;to:number;z:number;level:number;material:MeshStandardMaterial}) {
  const count=Math.ceil((to-from)/.65)
  return <group>
    {[.3,.85,1.1].map(y=><Block key={y} at={[(from+to)/2,level+y,z]} size={[to-from,.05,.05]} material={material}/>)}
    {Array.from({length:count+1},(_,i)=><Block key={i} at={[from+i*(to-from)/count,level+.55,z]} size={[.035,1.1,.035]} material={material}/>)}
  </group>
}
