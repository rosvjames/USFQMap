import { useEffect, useMemo } from 'react'
import { DoubleSide, Shape, Vector2 } from 'three'
import type { Vec2 } from '../types'
import type { CampusMaterials } from '../lib/materials'
import { MAXWELL_ENTRANCE as entrance } from '../lib/maxwell'
import { COURTYARD_OUTLINE, COURTYARD_GARDENS, COURTYARD_PALMS, FOUNTAIN_CENTER } from '../lib/maxwellCourtyard'
import { createPavedShapes } from '../lib/architecture'
import { palmFrond } from './LandscapeDetails'

const noRaycast = () => null
const groundShape = (ring: Vec2[]) => new Shape(ring.map(([x, z]) => new Vector2(x, -z)))
const pedestal = [[0.48, 0], [0.48, 0.12], [0.33, 0.2], [0.2, 0.46], [0.18, 0.82], [0.42, 1.03], [0.46, 1.12], [0.27, 1.22]].map(([x, y]) => new Vector2(x, y))
const lampCap = [[0, 0.26], [0.06, 0.26], [0.1, 0.2], [0.21, 0.16], [0.35, 0.03], [0.38, 0]].map(([x, y]) => new Vector2(x, y))

/** Formal garden wedges and fountain axis visible in the user's Maxwell photographs. */
export function MaxwellCourtyard({ materials }: { materials: CampusMaterials }) {
  const frond = useMemo(palmFrond, [])
  useEffect(() => () => frond.dispose(), [frond])
  const paving = useMemo(() => createPavedShapes(
    [COURTYARD_OUTLINE.map(([x, z]) => [x, -z])], COURTYARD_GARDENS.map((ring) => ring.map(([x, z]) => [x, -z])),
  ), [])
  const gardens = useMemo(() => COURTYARD_GARDENS.map(groundShape), [])
  return <group position={[entrance.center[0], 0, -entrance.center[1]]} rotation={[0, entrance.angle, 0]}>
    {paving.map((shape, i) => <mesh key={i} position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.paving} receiveShadow raycast={noRaycast}><shapeGeometry args={[shape]} /></mesh>)}
    {gardens.map((shape, i) => <group key={i}>
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.grass} receiveShadow raycast={noRaycast}><shapeGeometry args={[shape]} /></mesh>
      {COURTYARD_GARDENS[i].map((a, j, ring) => {
        const b = ring[(j + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
        return <group key={j} position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0]}>
          <mesh position={[0, 0.66, 0]} material={materials.entranceStone} receiveShadow raycast={noRaycast}><boxGeometry args={[length + 0.12, 0.15, 0.24]} /></mesh>
          <mesh position={[0, 0.91, 0]} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={[length, 0.42, 0.34]} /><meshStandardMaterial color="#8b9e3b" roughness={1} /></mesh>
        </group>
      })}
    </group>)}
    {COURTYARD_PALMS.map(([x, z], i) => {
      const height = 3.5
      return <group key={i} position={[x, 0.62, z]}>
        <mesh position={[0, height / 2, 0]} castShadow raycast={noRaycast}><cylinderGeometry args={[0.22, 0.32, height, 12]} /><meshStandardMaterial color="#695641" roughness={1} /></mesh>
        <mesh position={[0, height - 0.12, 0]} scale={[0.45, 0.6, 0.45]} castShadow raycast={noRaycast}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#58643b" /></mesh>
        {Array.from({ length: 13 }, (_, j) => <mesh key={j} geometry={frond} position={[0, height + j % 3 * 0.13, 0]} scale={[0.62, 0.75, 0.7]} rotation={[0, j * Math.PI * 2 / 13 + i, j % 3 * 0.1]} castShadow raycast={noRaycast}><meshStandardMaterial color={j % 3 ? '#476a36' : '#6b833f'} side={DoubleSide} roughness={1} /></mesh>)}
      </group>
    })}
    <Fountain materials={materials} />
    <CourtyardLamp at={[0, 21.6]} materials={materials} />
    <CourtyardLamp at={[-6.8, 14.8]} materials={materials} single />
    <CourtyardLamp at={[6.8, 14.8]} materials={materials} single />
    {([[-6.6, 21.4], [6.6, 21.4]] as Vec2[]).map(([x, z], i) => <group key={i} position={[x, 0.62, z]}>
      <mesh position={[0, 2.35, 0]} rotation={[0, 0, i ? -0.12 : 0.12]} castShadow raycast={noRaycast}><cylinderGeometry args={[0.16, 0.25, 4.7, 9]} /><meshStandardMaterial color="#655849" /></mesh>
      {Array.from({ length: 9 }, (_, j) => {
        const angle = j * 2.4, radius = j ? 0.85 : 0, at: [number, number, number] = [Math.cos(angle) * radius, 4.7 + Math.sin(j * 7) * 0.7, Math.sin(angle) * radius]
        return <group key={j} position={at}>
          <mesh scale={[1.1, 1.45, 0.85]} castShadow raycast={noRaycast}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={j % 2 ? '#385b36' : '#4d6839'} roughness={1} /></mesh>
          <mesh position={[0.65, -0.5, 0.4]} scale={[0.07, 0.25, 0.08]} raycast={noRaycast}><sphereGeometry args={[1, 6, 5]} /><meshStandardMaterial color="#953d38" /></mesh>
        </group>
      })}
    </group>)}
  </group>
}

function Fountain({ materials }: { materials: CampusMaterials }) {
  return <group position={[FOUNTAIN_CENTER[0], 0.6, FOUNTAIN_CENTER[1]]}>
    <mesh position={[0, 0.12, 0]} material={materials.entranceStone} receiveShadow raycast={noRaycast}><boxGeometry args={[5.3, 0.24, 5.1]} /></mesh>
    {Array.from({ length: 3 }, (_, i) => <mesh key={i} position={[0, 0.12 - i * 0.04, 2.7 + i * 0.32]} material={materials.entranceStone} receiveShadow raycast={noRaycast}><boxGeometry args={[4.8 + i * 0.2, 0.24 - i * 0.08, 0.36]} /></mesh>)}
    <mesh position={[0, 0.3, 0]} receiveShadow raycast={noRaycast}><boxGeometry args={[4.25, 0.14, 3.85]} /><meshStandardMaterial color="#628982" roughness={0.22} metalness={0.18} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * 2.3, 0.38, 0]} material={materials.cream} receiveShadow raycast={noRaycast}><boxGeometry args={[0.38, 0.35, 4.6]} /></mesh>
      <mesh position={[0, 0.38, side * 2.1]} material={materials.cream} receiveShadow raycast={noRaycast}><boxGeometry args={[4.95, 0.35, 0.38]} /></mesh>
    </group>)}
    <mesh position={[0, 0.35, 0]} material={materials.cream} castShadow raycast={noRaycast}><latheGeometry args={[pedestal, 24]} /></mesh>
    {/* A small original stone figure suggests the fountain sculpture without assigning an identity. */}
    <group position={[0, 1.55, 0]}>
      <mesh position={[0, 0.15, 0]} material={materials.cream} castShadow raycast={noRaycast}><cylinderGeometry args={[0.16, 0.27, 0.3, 14]} /></mesh>
      <mesh position={[0, 0.6, 0]} scale={[0.18, 0.37, 0.15]} material={materials.cream} castShadow raycast={noRaycast}><sphereGeometry args={[1, 16, 12]} /></mesh>
      <mesh position={[0.03, 1.08, 0]} material={materials.cream} castShadow raycast={noRaycast}><sphereGeometry args={[0.14, 16, 12]} /></mesh>
      {[-1, 1].map((side) => <group key={side}>
        <mesh position={[side * 0.09, 0.18, 0]} rotation={[0, 0, side * 0.09]} material={materials.cream} raycast={noRaycast}><capsuleGeometry args={[0.065, 0.35, 4, 8]} /></mesh>
        <mesh position={[side * 0.24, 0.78, 0]} rotation={[0, 0, side * -0.65]} material={materials.cream} raycast={noRaycast}><capsuleGeometry args={[0.057, 0.27, 4, 8]} /></mesh>
      </group>)}
    </group>
  </group>
}

function CourtyardLamp({ at, materials, single = false }: { at: Vec2; materials: CampusMaterials; single?: boolean }) {
  const height = single ? 3.2 : 2.8
  return <group position={[at[0], 0.6, at[1]]}>
    <mesh position={[0, 0.12, 0]} material={materials.cream} raycast={noRaycast}><cylinderGeometry args={[0.16, 0.28, 0.24, 12]} /></mesh>
    <mesh position={[0, height / 2, 0]} material={materials.cream} castShadow raycast={noRaycast}><cylinderGeometry args={[0.045, 0.08, height, 12]} /></mesh>
    {(single ? [0] : [-1, 0, 1]).map((side) => <group key={side} position={[side * 0.63, height - Math.abs(side) * 0.28, 0]}>
      {side !== 0 && <mesh position={[-side * 0.31, -0.32, 0]} rotation={[0, 0, side * 0.65]} material={materials.cream} raycast={noRaycast}><cylinderGeometry args={[0.035, 0.035, 0.85, 10]} /></mesh>}
      <mesh position={[0, 0.1, 0]} raycast={noRaycast}><sphereGeometry args={[0.25, 16, 12]} /><meshStandardMaterial color="#ecd9a1" roughness={0.3} /></mesh>
      <mesh position={[0, 0.28, 0]} material={materials.cream} raycast={noRaycast}><latheGeometry args={[lampCap, 20]} /></mesh>
      <mesh position={[0, -0.15, 0]} material={materials.cream} raycast={noRaycast}><cylinderGeometry args={[0.16, 0.08, 0.1, 12]} /></mesh>
    </group>)}
  </group>
}
