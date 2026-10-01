import { useEffect, useMemo } from 'react'
import { DoubleSide } from 'three'
import type { CampusBuilding } from '../lib/campus'
import { createRoofGeometry } from '../lib/architecture'
import type { CampusMaterials } from '../lib/materials'

/** Photo-referenced materials on approximate roofs; the OSM ground footprint is preserved. */
export function IllustratedRoof({ building, height, materials }: { building: CampusBuilding; height: number; materials: CampusMaterials }) {
  const geometry = useMemo(() => createRoofGeometry(building.ring, height, building.info?.id === 'hall-principal' ? 0.6 : 3.5), [building, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  const greenMetal = ['maxwell', 'darwin', 'casa-blanca', 'teatro-casa-blanca', 'pagoda', 'coliseo', 'dragon-shop'].includes(building.info?.id ?? '')
  return <mesh geometry={geometry} material={greenMetal ? materials.metalRoof : materials.terracotta} castShadow receiveShadow raycast={() => null} />
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
