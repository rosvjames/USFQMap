import { useEffect, useMemo } from 'react'
import { CatmullRomCurve3, DoubleSide, TubeGeometry, Vector3 } from 'three'
import { findCampusBuilding } from '../lib/campus'
import { MAXWELL_ENTRANCE as entrance } from '../lib/maxwell'
import { createDragonWingGeometry } from '../lib/dragon'
import type { CampusMaterials } from '../lib/materials'

type Point = [number, number, number]
const noRaycast = () => null
const skin = '#783b34', membrane = '#8b3d3b', ribs = '#ab7160', horn = '#b3a082'
function Tube({ points, radius, color }: { points: Point[]; radius: number; color: string }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 24, radius, 7, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} castShadow raycast={noRaycast}><meshStandardMaterial color={color} roughness={0.78} /></mesh>
}
function BodyPart({ at, scale, color = skin, rotate = 0 }: { at: Point; scale: Point; color?: string; rotate?: number }) {
  return <mesh position={at} scale={scale} rotation={[rotate, 0, 0]} castShadow raycast={noRaycast}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={color} roughness={0.78} /></mesh>
}

/** Original sculpted approximation of the red, spread-wing dragon shown above Maxwell. */
export function MaxwellDragon({ materials }: { materials: CampusMaterials }) {
  const wings = useMemo(() => [createDragonWingGeometry(-1), createDragonWingGeometry(1)], [])
  useEffect(() => () => wings.forEach((wing) => wing.dispose()), [wings])
  const building = findCampusBuilding('maxwell')!
  const height = building.heightMeters ?? building.levels * 3.5
  return <group position={[entrance.center[0], 0, -entrance.center[1]]} rotation={[0, entrance.angle, 0]}>
    <mesh position={[0, height + 0.25, -0.16]} material={materials.cream} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={[36.8, 0.5, 0.65]} /></mesh>
    <group position={[0, height + 0.55, -0.32]} scale={1.65}>
      {wings.map((geometry, i) => {
        const side = i ? 1 : -1
        return <group key={i}>
          <mesh geometry={geometry} castShadow receiveShadow raycast={noRaycast}><meshStandardMaterial color={membrane} roughness={0.84} side={DoubleSide} /></mesh>
          <Tube points={[[side * 0.5, 1.1, 0.73], [side * 1.7, 2, 0.83], [side * 3.3, 2.4, 0.91], [side * 6, 2.25, 0.89], [side * 9.2, 2.08, 0.65]]} radius={0.09} color={skin} />
          {([[8.25, 0.25], [6.5, -0.05], [4.5, -0.7], [2.8, 0.15]] as [number, number][]).map(([x, y], j) => <Tube key={j} points={[[side * 3.3, 2.4, 0.94], [side * (3.3 + x) / 2, (2.4 + y) / 2 - 0.12, 0.88], [side * x, y, 0.72 + Math.sin(x * 0.36) * 0.2]]} radius={0.035} color={ribs} />)}
          <mesh position={[side * 3.3, 2.55, 0.89]} rotation={[0, 0, side * -0.25]} castShadow raycast={noRaycast}><coneGeometry args={[0.085, 0.45, 8]} /><meshStandardMaterial color={horn} /></mesh>
        </group>
      })}
      <Tube points={[[0, 0.7, -0.8], [0.85, 0.8, -1.5], [1.8, 0.95, -2.4], [2.5, 1.1, -2.1], [2.8, 1.4, -1.5]]} radius={0.17} color={skin} />
      <BodyPart at={[0, 0.95, -0.1]} scale={[0.61, 0.65, 1.3]} />
      <BodyPart at={[0, 1.63, 0.67]} scale={[0.38, 0.9, 0.42]} rotate={0.28} />
      <BodyPart at={[0, 2.3, 1.13]} scale={[0.47, 0.45, 0.56]} />
      <BodyPart at={[0, 2.16, 1.62]} scale={[0.38, 0.22, 0.48]} />
      <BodyPart at={[0, 1.88, 1.67]} scale={[0.31, 0.12, 0.39]} />
      <BodyPart at={[0, 2, 1.75]} scale={[0.3, 0.09, 0.36]} color="#251a18" />
      {[-1, 1].map((side) => <group key={side}>
        <Tube points={[[side * 0.5, 0.98, 0.5], [side * 0.83, 0.42, 0.86], [side * 0.73, 0.04, 1.2]]} radius={0.13} color={skin} />
        <Tube points={[[side * 0.44, 0.8, -0.7], [side * 0.9, 0.26, -0.9], [side * 0.98, 0.03, -0.42]]} radius={0.17} color={skin} />
        {[0.78, -0.65].map((z, j) => <group key={j}>
          <BodyPart at={[side * (j ? 0.98 : 0.73), 0.05, z + 0.48]} scale={[0.22, 0.08, 0.3]} />
          {[-1, 0, 1].map((toe) => <mesh key={toe} position={[side * (j ? 0.98 : 0.73) + toe * 0.1, 0.045, z + 0.75]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}><coneGeometry args={[0.045, 0.22, 8]} /><meshStandardMaterial color={horn} /></mesh>)}
        </group>)}
        <Tube points={[[side * 0.28, 2.6, 0.96], [side * 0.37, 2.97, 0.74], [side * 0.31, 3.3, 0.43]]} radius={0.09} color={horn} />
        <BodyPart at={[side * 0.35, 2.38, 1.5]} scale={[0.085, 0.065, 0.07]} color="#c7a157" />
        <BodyPart at={[side * 0.36, 2.38, 1.55]} scale={[0.024, 0.05, 0.018]} color="#171612" />
        <BodyPart at={[side * 0.2, 2.21, 1.99]} scale={[0.045, 0.025, 0.025]} color="#291c1a" />
        {Array.from({ length: 4 }, (_, i) => <mesh key={i} position={[side * (0.08 + i * 0.065), 2.02, 1.98 - i * 0.055]} rotation={[Math.PI, 0, 0]} raycast={noRaycast}><coneGeometry args={[0.027, 0.13, 7]} /><meshStandardMaterial color={horn} /></mesh>)}
      </group>)}
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 1.62 - i * 0.06, -0.25 - i * 0.17]} rotation={[-0.25, 0, 0]} castShadow raycast={noRaycast}><coneGeometry args={[0.12 - i * 0.011, 0.4 - i * 0.035, 8]} /><meshStandardMaterial color={ribs} /></mesh>)}
    </group>
  </group>
}
