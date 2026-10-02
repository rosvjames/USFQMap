import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Vec2 } from '../types'
import { HALL_PLAZA_FACE, HALL_PLAZA_WING, HALL_PLAZA_REMAINDER } from '../lib/hallPlaza'
import type { CampusBuilding } from '../lib/campus'
import { createRoofBandGeometry, createRoofGeometry } from '../lib/architecture'
import type { CampusMaterials } from '../lib/materials'
import { ROOF_APPEARANCE, ROOF_SKYLIGHTS, type RoofFinish, type Skylight } from '../data/siteAppearance'

/** Photo-referenced materials on approximate roofs; the OSM ground footprint is preserved. */
export function IllustratedRoof({ building, height, materials }: { building: CampusBuilding; height: number; materials: CampusMaterials }) {
  const id = building.info?.id ?? ''
  const appearance = ROOF_APPEARANCE[id] ?? { finish: 'dark', rise: 1.5 }
  const geometry = useMemo(() => {
    if(id!=='hall-principal')return createRoofGeometry(building.ring,height,appearance.rise)
    const pieces=HALL_PLAZA_REMAINDER.map(p=>createRoofGeometry(p[0] as Vec2[],height,appearance.rise,p.slice(1) as Vec2[][]))
    const merged=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());return merged
  }, [id,building,height,appearance.rise])
  const plazaRoof=useMemo(()=>{
    if(id!=='hall-principal')return null
    const pieces=HALL_PLAZA_WING.map(p=>createRoofGeometry(p[0] as Vec2[],HALL_PLAZA_FACE.height,.45))
    const merged=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());return merged
  },[id])
  useEffect(() => () => {geometry.dispose();plazaRoof?.dispose()}, [geometry,plazaRoof])
  const finish: Record<RoofFinish, CampusMaterials['terracotta']> = {
    dark: materials.terracotta, terracotta: materials.redTileRoof, green: materials.metalRoof,
    teal: materials.tealRoof, concrete: materials.concreteRoof,
  }
  return <group>
    <mesh geometry={geometry} material={finish[appearance.finish]} castShadow receiveShadow raycast={() => null} />
    {plazaRoof&&<mesh geometry={plazaRoof} material={materials.metalRoof} castShadow receiveShadow raycast={()=>null}/>}
    {(ROOF_SKYLIGHTS[id] ?? []).map((skylight, i) => <RoofSkylight key={i} skylight={skylight} building={building} height={height + appearance.rise + 0.08} materials={materials} />)}
    {id === 'hayek' && <HayekRoof building={building} height={height} materials={materials} />}
  </group>
}

function HayekRoof({ building, height, materials }: { building: CampusBuilding; height: number; materials: CampusMaterials }) {
  // The intricate inner edge is the existing OSM courtyard notch, not a guessed rectangle.
  const geometry = useMemo(() => createRoofBandGeometry(building.ring, Array.from({ length: 24 }, (_, i) => i), 4.5, height + 0.1), [building, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={materials.terracotta} castShadow receiveShadow raycast={() => null} />
}

function RoofSkylight({ skylight, building, height, materials }: { skylight: Skylight; building: CampusBuilding; height: number; materials: CampusMaterials }) {
  const { width, depth, rise, angle, offset } = skylight
  const corners: [number, number, number][] = [[-width / 2, 0, -depth / 2], [width / 2, 0, -depth / 2], [width / 2, 0, depth / 2], [-width / 2, 0, depth / 2]]
  const peak: [number, number, number] = [0, rise, 0]
  // The corners are derived entirely from these dimensions.
  const geometry = useMemo(() => {
    const vertices = corners.flatMap((corner, i) => [...corner, ...peak, ...corners[(i + 1) % 4]])
    const glass = new BufferGeometry()
    glass.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    glass.computeVertexNormals()
    return glass
  }, [width, depth, rise])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group position={[building.center[0] + offset[0], height, -building.center[1] - offset[1]]} rotation={[0, angle, 0]}>
    <mesh geometry={geometry} material={materials.roofGlass} castShadow raycast={() => null} />
    {[0, 0.25, 0.5, 0.75].map((t) => {
      const ring = corners.map(([x, , z]): [number, number, number] => [x * (1 - t), rise * t + 0.02, z * (1 - t)])
      return <Line key={t} points={[...ring, ring[0]]} color="#b4c4bc" lineWidth={0.1} worldUnits raycast={() => null} />
    })}
    {corners.map((corner, i) => <Line key={i} points={[corner, peak]} color="#b4c4bc" lineWidth={0.12} worldUnits raycast={() => null} />)}
  </group>
}

function ClockFace({ angle }: { angle: number }) {
  return <group rotation={[0, angle, 0]}>
    <group position={[0, 16.8, 1.08]}>
      <mesh><torusGeometry args={[0.65, 0.065, 8, 32]} /><meshStandardMaterial color="#d2cbb7" /></mesh>
      <mesh><circleGeometry args={[0.61, 32]} /><meshStandardMaterial color="#344236" side={DoubleSide} /></mesh>
      <mesh position={[0, 0.18, 0.02]}><boxGeometry args={[0.035, 0.38, 0.02]} /><meshStandardMaterial color="#f4ebd2" /></mesh>
      <mesh position={[0.12, -0.05, 0.02]} rotation={[0, 0, -1.1]}><boxGeometry args={[0.035, 0.32, 0.02]} /><meshStandardMaterial color="#f4ebd2" /></mesh>
    </group>
  </group>
}

/** Landmark proportions remain approximate; the obelisk uses its recorded 20 m OSM height. */
export function LandmarkRoof({ building, height, materials }: { building: CampusBuilding; height: number; materials: CampusMaterials }) {
  const [x, y] = building.center
  const id = building.info?.id
  if (id === 'obelisco') return <group position={[x, height, -y]}>
    <mesh position={[0, 9.3, 0]} castShadow receiveShadow material={materials.cream}><boxGeometry args={[2.1, 18.6, 2.1]} /></mesh>
    <mesh position={[0, 18.6, 0]} castShadow material={materials.cream}><boxGeometry args={[2.45, 0.22, 2.45]} /></mesh>
    <mesh position={[0, 19, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.8, 0.8, 4]} /><meshStandardMaterial color="#999b89" /></mesh>
    {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle) => <ClockFace key={angle} angle={angle} />)}
  </group>
  if (id === 'maxwell') return <group position={[x, height + 2, -y]}>
    <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={materials.cream}><cylinderGeometry args={[5.8, 6, 2.6, 40]} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.sin(i * Math.PI / 6) * 5.94, 1.25, Math.cos(i * Math.PI / 6) * 5.94]} rotation={[0, i * Math.PI / 6, 0]}>
      <boxGeometry args={[0.9, 1.9, 0.1]} /><meshStandardMaterial color="#394e49" roughness={0.25} />
    </mesh>)}
    <mesh position={[0, 2.6, 0]} castShadow><sphereGeometry args={[6, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#bc9854" roughness={0.65} metalness={0.32} /></mesh>
    <mesh position={[0, 8.95, 0]} castShadow><cylinderGeometry args={[0.08, 0.18, 0.7, 12]} /><meshStandardMaterial color="#d5cba4" /></mesh>
    <mesh position={[0, 9.4, 0]} castShadow><sphereGeometry args={[0.23, 16, 12]} /><meshStandardMaterial color="#d5cba4" /></mesh>
  </group>
  return null
}
