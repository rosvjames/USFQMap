import { useEffect, useMemo } from 'react'
import { CatmullRomCurve3, ExtrudeGeometry, MeshStandardMaterial, Shape, Vector3 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { HALL_ENTRANCE as hall } from '../lib/hall'
import { createSculptureGeometry } from '../lib/sculptures'

type Point = [number, number, number]
const noRaycast = () => null

function Block({ at, size, material }: { at: Point; size: Point; material: MeshStandardMaterial }) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}>
    <boxGeometry args={size} onUpdate={(geo) => {
      const uv = geo.getAttribute('uv'), p = geo.getAttribute('position'), n = geo.getAttribute('normal')
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i)) / 2.4, (Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) : p.getY(i)) / 2.4)
      uv.needsUpdate = true
    }} />
  </mesh>
}

function Pediment({ points, material }: { points: [number, number][]; material: MeshStandardMaterial }) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath()
    return new ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: false })
  }, [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[0, 0, 3.05]} material={material} castShadow receiveShadow raycast={noRaycast} />
}

function Rope({ a, b }: { a: Point; b: Point }) {
  const curve = useMemo(() => new CatmullRomCurve3([new Vector3(...a), new Vector3((a[0] + b[0]) / 2, a[1] - 0.22, (a[2] + b[2]) / 2), new Vector3(...b)]), [a, b])
  return <mesh raycast={noRaycast}><tubeGeometry args={[curve, 16, 0.018, 6, false]} /><meshStandardMaterial color="#9a2831" roughness={0.9} /></mesh>
}

/** Photo-derived entrance proportions and original approximate sculpture meshes. */
export function HallEntrance({ materials }: { materials: CampusMaterials }) {
  const david = useMemo(() => createSculptureGeometry('david'), [])
  const lion = useMemo(() => createSculptureGeometry('lion'), [])
  const trim = materials.cream, red = materials.hallRed, stone = materials.entranceStone
  const fittings = useMemo(() => new MeshStandardMaterial({ color: '#313b36', metalness: 0.55, roughness: 0.45 }), [])
  const gable = useMemo(() => new MeshStandardMaterial({ color: '#aaafa5', roughness: 0.94 }), [])
  useEffect(() => () => { david.dispose(); lion.dispose(); fittings.dispose(); gable.dispose() }, [david, lion, fittings, gable])
  const redSpandrel = useMemo<[number, number][]>(() => [[-7.1, 5.45], [0, 7.1], [7.1, 5.45], [7.1, 7.5], [-7.1, 7.5]], [])
  const grayPediment = useMemo<[number, number][]>(() => [[-7.1, 5.45], [7.1, 5.45], [0, 7.1]], [])
  const ropes: Point[] = [[-1.05, hall.level + 0.82, 3.1], [1.05, hall.level + 0.82, 3.1], [1.05, hall.level + 0.82, 4.8], [-1.05, hall.level + 0.82, 4.8]]
  return <group position={[hall.center[0], 0, -hall.center[1]]} rotation={[0, hall.angle, 0]}>
    <Block at={[0, (hall.level + 0.25) / 2, hall.platformFront / 2]} size={[18.8, hall.level - 0.25, hall.platformFront]} material={stone} />
    {Array.from({ length: hall.steps }, (_, i) => {
      const top = hall.level - i * (hall.level - hall.ground) / hall.steps
      return <Block key={i} at={[0, (top + 0.25) / 2, hall.platformFront + (i + 0.5) * 0.5]} size={[hall.stairWidth, top - 0.25, 0.5]} material={stone} />
    })}
    <Block at={[0, 0.50, hall.stairFront + 0.75]} size={[19.5, 0.12, 1.5]} material={materials.paving} />
    {[-1, 1].map((side) => <group key={side}>
      <Block at={[side * 7.75, (7.5 + hall.level) / 2, 1.7]} size={[1.3, 7.5 - hall.level, 3.4]} material={red} />
      <mesh position={[side * 3.65, hall.level + 3.28 / 2, 2.8]} castShadow receiveShadow material={red} raycast={noRaycast}><cylinderGeometry args={[0.44, 0.48, 3.28, 32]} /></mesh>
      <Block at={[side * 3.65, 4.83, 2.8]} size={[1.04, 0.18, 1.04]} material={trim} />
      <Block at={[side * 8.65, hall.ground + 0.625, 5.5]} size={[1.25, 1.25, 1.65]} material={materials.redStone} />
      <Block at={[side * 8.65, hall.ground + 1.28, 5.5]} size={[1.36, 0.08, 1.75]} material={materials.redStone} />
      <mesh position={[side * 8.65, hall.ground + 1.33, 5.5]} geometry={lion} castShadow receiveShadow raycast={noRaycast}>
        <meshStandardMaterial vertexColors metalness={0.64} roughness={0.56} />
      </mesh>
    </group>)}
    <Block at={[0, 5.12, 3.18]} size={[14.2, 0.6, 0.65]} material={trim} />
    <Block at={[0, 5.23, 1.7]} size={[14.2, 0.18, 3.4]} material={trim} />
    <Pediment points={redSpandrel} material={red} /><Pediment points={grayPediment} material={gable} />
    {[-1, 1].map((side) => <group key={`gable-${side}`} position={[side * 3.55, 6.275, 3.44]} rotation={[0, 0, -side * Math.atan2(1.65, 7.1)]}>
      <Block at={[0, 0, 0]} size={[Math.hypot(7.1, 1.65), 0.14, 0.28]} material={red} />
    </group>)}
    <Block at={[0, 7.49, 3.18]} size={[17.2, 0.24, 0.85]} material={trim} />
    <Block at={[0, 7.68, 3.18]} size={[17.65, 0.14, 1.0]} material={trim} />
    {[-4.75, 0, 4.75].map((x) => <group key={x} position={[x, hall.level, 0.08]}>
      <mesh position={[0, 1.55, 0]} receiveShadow raycast={noRaycast}><boxGeometry args={[4.05, 3.1, 0.10]} /><meshStandardMaterial color="#263936" roughness={0.28} metalness={0.3} /></mesh>
      {[-2.1, -1.05, 0, 1.05, 2.1].map((px) => <Block key={px} at={[px, 1.55, 0.08]} size={[0.07, 3.15, 0.08]} material={fittings} />)}
      {[0.06, 1.75, 2.65, 3.15].map((y) => <Block key={y} at={[0, y, 0.08]} size={[4.25, 0.065, 0.08]} material={fittings} />)}
      {[-1.55, -0.52, 0.52, 1.55].map((px) => <group key={px} position={[px, 2.9, 0.1]}>
        {[-0.7, 0.7].map((angle) => <group key={angle} rotation={[0, 0, angle]}><Block at={[0, 0, 0]} size={[0.035, 0.6, 0.035]} material={fittings} /></group>)}
      </group>)}
    </group>)}
    <Block at={[0, hall.level + 0.075, 4]} size={[1.4, 0.15, 1.3]} material={trim} />
    <mesh geometry={david} position={[0, hall.level + 0.15, 4]} scale={[2.35, 2.35, 2.35]} castShadow receiveShadow raycast={noRaycast}>
      <meshStandardMaterial vertexColors roughness={0.75} metalness={0.015} />
    </mesh>
    {ropes.map((point, i) => <group key={i}>
      <mesh position={[point[0], hall.level + 0.43, point[2]]} castShadow raycast={noRaycast}><cylinderGeometry args={[0.025, 0.045, 0.86, 12]} /><meshStandardMaterial color="#b79c59" metalness={0.75} roughness={0.3} /></mesh>
      <mesh position={[point[0], hall.level + 0.035, point[2]]} raycast={noRaycast}><cylinderGeometry args={[0.14, 0.17, 0.07, 16]} /><meshStandardMaterial color="#b79c59" metalness={0.7} roughness={0.3} /></mesh>
      <Rope a={point} b={ropes[(i + 1) % ropes.length]} />
    </group>)}
    {[-6.2, 6.2].map((x) => <group key={x} position={[x, hall.level, 1.25]}>
      <mesh position={[0, 0.23, 0]} material={trim} raycast={noRaycast}><cylinderGeometry args={[0.42, 0.24, 0.46, 24]} /></mesh>
      <mesh position={[0, 0.48, 0]} castShadow raycast={noRaycast}><sphereGeometry args={[0.36, 16, 12]} /><meshStandardMaterial color="#4f6949" roughness={1} /></mesh>
    </group>)}
  </group>
}
