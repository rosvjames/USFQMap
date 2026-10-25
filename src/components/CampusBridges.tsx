import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, Quaternion, Shape, Vector3 } from 'three'
import { ELEVATED_WALKWAYS, bridgeVertexHeight } from '../lib/terrain'
import { CAMPUS_BOUNDARY, CAMPUS_BRIDGE_ACCESS, CAMPUS_STREET_CUTOUTS } from '../lib/campus'
import { CAMPUS_ELEVATION } from '../lib/elevation'
import { pointInPolygon } from '../lib/geo'
import { campusBaseHeightAt } from '../lib/campusSlope'
import { bridgeBoundaryRails, bridgeJunctions, createBridgeDeckGeometry } from '../lib/bridges'
import type { CampusMaterials } from '../lib/materials'

type Point = [number, number, number]

function Beam({ a, b, width, depth, material }: { a: Point; b: Point; width: number; depth: number; material: MeshStandardMaterial }) {
  const { length, quaternion } = useMemo(() => {
    const delta = new Vector3(...b).sub(new Vector3(...a))
    return { length: delta.length(), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), delta.normalize()) }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={quaternion} material={material} castShadow receiveShadow raycast={()=>null}>
    <boxGeometry args={[width, depth, length]} />
  </mesh>
}

export function CampusBridges({ materials }: { materials: CampusMaterials }) {
  const decks = useMemo(()=>ELEVATED_WALKWAYS.map(createBridgeDeckGeometry),[])
  const rails = useMemo(()=>bridgeBoundaryRails(ELEVATED_WALKWAYS, [CAMPUS_BRIDGE_ACCESS]),[])
  const junctions = useMemo(()=>bridgeJunctions(ELEVATED_WALKWAYS),[])
  const arrow = useMemo(()=>{
    const shape=new Shape(); shape.moveTo(-0.08,-0.18);shape.lineTo(0.08,-0.18);shape.lineTo(0.08,0.04)
    shape.lineTo(0.23,0.04);shape.lineTo(0,0.33);shape.lineTo(-0.23,0.04);shape.lineTo(-0.08,0.04);shape.closePath();return shape
  },[])
  // Concrete deck, handrail base and piers share the concrete family; painted steel, the yellow edge line and arrows stay flat.
  const finishes = useMemo(()=>({
    steel: new MeshStandardMaterial({ color: '#303936', roughness: 0.75, metalness: 0.5 }),
    line: new MeshStandardMaterial({ color: '#d2ac36', roughness: 0.75 }),
    arrow: new MeshStandardMaterial({ color: '#ecece4', roughness: 1 }),
  }),[])
  const deck = materials.surface('concrete', '#b8b6aa', { roughness: 0.96 })
  const rail = materials.surface('concrete', '#d1d0c6', { roughness: 0.75 })
  const pier = materials.surface('concrete', '#a7a498', { roughness: 0.95 })
  useEffect(()=>()=>decks.forEach(g=>g.dispose()),[decks])
  useEffect(()=>()=>Object.values(finishes).forEach(m=>m.dispose()),[finishes])
  return <group>
    {decks.map((geometry,i)=><mesh key={i} geometry={geometry} material={deck} castShadow receiveShadow raycast={()=>null} />)}
    {junctions.map(({point,height,radius},i)=><mesh key={i} position={[point[0],height-0.16,-point[1]]} material={deck} castShadow receiveShadow raycast={()=>null}><cylinderGeometry args={[radius,radius,0.32,16]} /></mesh>)}
    {rails.map(({a,b,ah,bh},i)=>{
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(length/0.7))
      const point=(t:number,rise=0):Point=>[a[0]+(b[0]-a[0])*t,ah+(bh-ah)*t+rise,-a[1]-(b[1]-a[1])*t]
      return <group key={i}>
        <Beam a={point(0,0.08)} b={point(1,0.08)} width={0.18} depth={0.16} material={rail}/>
        {[0.25,0.84,1.13].map(rise=><Beam key={rise} a={point(0,rise)} b={point(1,rise)} width={0.065} depth={rise===1.13?0.08:0.045} material={finishes.steel}/>)}
        {Array.from({length:count+1},(_,j)=><Beam key={j} a={point(j/count,0.16)} b={point(j/count,1.13)} width={0.055} depth={0.055} material={finishes.steel}/>)}
        {Array.from({length:Math.ceil(length/0.18)},(_,j)=>{
          const t=(j+0.5)/Math.ceil(length/0.18)
          return <Beam key={`picket${j}`} a={point(t,0.24)} b={point(t,1.08)} width={0.02} depth={0.02} material={finishes.steel}/>
        })}
      </group>
    })}
    {ELEVATED_WALKWAYS.map((way) => <group key={way.osmId}>
      {way.line.slice(1).map((b, i) => {
        const a = way.line[i], ah = bridgeVertexHeight(way, i), bh = bridgeVertexHeight(way, i + 1)
        const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
        const nx = dy / length, nz = dx / length
        const point = (t: number, offset = 0, rise = 0): Point => [a[0] + dx * t + nx * offset, ah + (bh - ah) * t + rise, -a[1] - dy * t + nz * offset]
        return <group key={i}>
          <Beam a={point(0, 0, -0.48)} b={point(1, 0, -0.48)} width={0.55} depth={0.4} material={finishes.steel} />
          <Beam a={point(0,0,0.02)} b={point(1,0,0.02)} width={0.045} depth={0.015} material={finishes.line}/>
          {Array.from({length:Math.floor(length/4)},(_,j)=>([-1,1] as const).map(side=><mesh key={`${j}/${side}`} position={point((j+0.5)/Math.floor(length/4),side*0.55,0.025)} rotation={[-Math.PI/2,0,Math.atan2(-dx,dy)+(side===1?Math.PI:0)]} material={finishes.arrow} raycast={()=>null}><shapeGeometry args={[arrow]}/></mesh>))}
          {length > 25 && [0.15, 0.85].map((t) => {
            const p = point(t), ground=pointInPolygon([p[0],-p[2]],CAMPUS_BOUNDARY)&&!CAMPUS_STREET_CUTOUTS.some(r=>pointInPolygon([p[0],-p[2]],r))?campusBaseHeightAt([p[0],-p[2]])+CAMPUS_ELEVATION-.1:.45, height = Math.max(0, p[1] - ground - 0.35)
            const center:Point=[p[0],ground+height/2,p[2]]
            return <mesh key={t} position={center} material={pier} castShadow receiveShadow><cylinderGeometry args={[0.45, 0.6, height, 10]} /></mesh>
          })}
        </group>
      })}
    </group>)}
  </group>
}
