import { useEffect, useMemo } from 'react'
import { Color, ExtrudeGeometry, Float32BufferAttribute, MeshStandardMaterial, Shape } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MAXWELL_ENTRANCE as entrance, createArchBand } from '../lib/maxwell'
import { createSculptureGeometry } from '../lib/sculptures'
import type { CampusMaterials } from '../lib/materials'

type Point = [number, number, number]
const noRaycast = () => null
function Block({ at, size, material }: { at: Point; size: Point; material: MeshStandardMaterial }) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}>
    <boxGeometry args={size} onUpdate={(geometry) => {
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
      for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i)) / 2.4, (Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) : p.getY(i)) / 2.4)
      uv.needsUpdate = true
    }} />
  </mesh>
}

/** Recessed radial stone courses around a dark arched gate, based on the supplied entrance photo. */
export function MaxwellEntrance({ materials }: { materials: CampusMaterials }) {
  const stones = useMemo(() => {
    const blocks: ExtrudeGeometry[] = []
    for (let row = 0; row < 8; row++) {
      const step = (entrance.outerRadius - entrance.innerRadius) / 8
      const inner = entrance.innerRadius + row * step, outer = inner + step - 0.025
      const count = Math.ceil(Math.PI * (inner + outer) / 2 / 0.43)
      for (let i = 0; i < count; i++) {
        const stone = createArchBand(inner, outer, 0.18, i / count * Math.PI + 0.004, (i + 1) / count * Math.PI - 0.004)
        stone.translate(0, entrance.spring, 0.17 + row * 0.12)
        const shade = new Color('#ded7c5').multiplyScalar(0.94 + (Math.sin(i * 11 + row * 7) + 1) * 0.035)
        const colors = new Float32Array(stone.getAttribute('position').count * 3)
        for (let j = 0; j < colors.length; j += 3) colors.set([shade.r, shade.g, shade.b], j)
        stone.setAttribute('color', new Float32BufferAttribute(colors, 3)); blocks.push(stone)
      }
    }
    const geometry = mergeGeometries(blocks)!
    blocks.forEach((g) => g.dispose())
    return geometry
  }, [])
  const door = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-entrance.innerRadius, entrance.level); shape.lineTo(entrance.innerRadius, entrance.level)
    shape.lineTo(entrance.innerRadius, entrance.spring)
    shape.absarc(0, entrance.spring, entrance.innerRadius, 0, Math.PI, false)
    shape.closePath()
    return new ExtrudeGeometry(shape, { depth: 0.10, bevelEnabled: false, curveSegments: 36 })
  }, [])
  const lion = useMemo(() => createSculptureGeometry('reclining-lion', 48), [])
  const friezeArch = useMemo(() => createArchBand(0.19, 0.24, 0.06), [])
  const metal = useMemo(() => new MeshStandardMaterial({ color: '#25322f', metalness: 0.5, roughness: 0.55 }), [])
  useEffect(() => () => { stones.dispose(); door.dispose(); lion.dispose(); metal.dispose(); friezeArch.dispose() }, [stones, door, lion, metal, friezeArch])
  const level = entrance.level, spring = entrance.spring, cream = materials.cream
  return <group position={[entrance.center[0], 0, -entrance.center[1]]} rotation={[0, entrance.angle, 0]}>
    <Block at={[0, (level + 0.25) / 2, entrance.platformFront / 2]} size={[entrance.width, level - 0.25, entrance.platformFront]} material={materials.entranceStone} />
    {Array.from({ length: entrance.steps }, (_, i) => {
      const top = level - i * (level - entrance.ground) / entrance.steps
      return <Block key={i} at={[0, (top + 0.25) / 2, entrance.platformFront + (i + 0.5) * 0.45]} size={[entrance.width + i * 0.15, top - 0.25, 0.45]} material={materials.entranceStone} />
    })}
    <mesh geometry={stones} castShadow receiveShadow raycast={noRaycast}><meshStandardMaterial vertexColors roughness={0.94} /></mesh>
    <Block at={[0, 8.37, 0.54]} size={[11.25, 0.96, 0.92]} material={cream} />
    <Block at={[0, 8.92, 0.6]} size={[11.7, 0.15, 1.05]} material={cream} />
    {Array.from({ length: 15 }, (_, i) => <mesh key={i} geometry={friezeArch} position={[(i - 7) * 0.65, 8.24, 1.025]} material={materials.entranceStone} raycast={noRaycast} />)}
    <mesh position={[0, 9.66, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={metal} raycast={noRaycast}><cylinderGeometry args={[0.67, 0.67, 0.08, 32]} /></mesh>
    <mesh position={[0, 9.66, 0.19]} material={cream} raycast={noRaycast}><torusGeometry args={[0.7, 0.045, 8, 40]} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={[0, 9.66, 0.24]} rotation={[0, 0, i * Math.PI / 6]}>
      <Block at={[0, 0.32, 0]} size={[0.035, 0.64, 0.035]} material={cream} />
    </group>)}
    <mesh geometry={door} position={[0, 0, 0.10]} material={metal} receiveShadow raycast={noRaycast} />
    {/* Dense black metalwork follows the arched head; the opening below stays dark. */}
    {Array.from({ length: 25 }, (_, i) => {
      const x = (i - 12) * 0.105
      const top = spring + Math.sqrt(entrance.innerRadius ** 2 - x ** 2) - 0.05
      return <Block key={i} at={[x, (top + level) / 2, 0.24]} size={[0.026, top - level, 0.04]} material={metal} />
    })}
    {[level + 0.25, level + 0.9, level + 1.5, spring, spring + 0.25, spring + 0.5, spring + 0.75, spring + 1].map((y) => {
      const halfWidth = y <= spring ? entrance.innerRadius : Math.sqrt(entrance.innerRadius ** 2 - (y - spring) ** 2)
      return <Block key={y} at={[0, y, 0.25]} size={[halfWidth * 2, 0.035, 0.04]} material={metal} />
    })}
    <mesh position={[0, level + 1.05, 0.28]} raycast={noRaycast}><boxGeometry args={[1.83, 2.1, 0.06]} /><meshStandardMaterial color="#071412" roughness={1} /></mesh>
    {[-1, 1].map((side) => <group key={side}>
      <Block at={[side * 2.74, (level + spring) / 2, 0.09]} size={[2.77, spring - level, 0.16]} material={materials.entranceStone} />
      {Array.from({ length: 7 }, (_, i) => {
        const x = side * (1.55 + i * 0.39), z = 0.27 + i * 0.12
        return <group key={i}>
          <mesh position={[x, (level + spring) / 2, z]} material={cream} castShadow raycast={noRaycast}><cylinderGeometry args={[0.08, 0.105, spring - level - 0.17, 12]} /></mesh>
          <Block at={[x, spring - 0.08, z]} size={[0.26, 0.16, 0.27]} material={cream} />
          <Block at={[x, level + 0.1, z]} size={[0.24, 0.16, 0.26]} material={cream} />
        </group>
      })}
      <Block at={[side * 2.74, spring + 0.015, 0.59]} size={[2.82, 0.17, 1.05]} material={cream} />
      <Block at={[side * 4.91, level + 0.15, 0.96]} size={[1.12, 0.30, 1.12]} material={materials.entranceStone} />
      <mesh position={[side * 4.91, (level + 0.3 + 7.62) / 2, 0.96]} material={cream} castShadow receiveShadow raycast={noRaycast}><cylinderGeometry args={[0.35, 0.43, 7.62 - level - 0.3, 32]} /></mesh>
      <Block at={[side * 4.91, 7.72, 0.96]} size={[1.15, 0.24, 1.15]} material={cream} />
      <Block at={[side * 4.91, 7.89, 0.96]} size={[1.32, 0.13, 1.32]} material={cream} />
      <Block at={[side * 2.25, level + 0.08, 1.77]} size={[0.9, 0.16, 1.6]} material={cream} />
      <mesh geometry={lion} position={[side * 2.25, level + 0.16, 1.77]} scale={0.76} castShadow receiveShadow raycast={noRaycast}><meshStandardMaterial vertexColors roughness={0.84} /></mesh>
      <Planter x={side * 3.84} level={level} materials={materials} />
    </group>)}
  </group>
}

function Planter({ x, level, materials }: { x: number; level: number; materials: CampusMaterials }) {
  return <group position={[x, level, 1.75]} raycast={noRaycast}>
    <mesh position={[0, 0.25, 0]} material={materials.hallRed} castShadow><cylinderGeometry args={[0.28, 0.2, 0.5, 12]} /></mesh>
    <mesh position={[0, 0.97, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 1.4, 8]} /><meshStandardMaterial color="#5d5239" /></mesh>
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.4) * 0.20, 1.45 + Math.sin(i * 7) * 0.3, Math.cos(i * 2.4) * 0.16]} scale={[0.3, 0.24, 0.19]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={i % 2 ? '#596e3c' : '#415e34'} roughness={1} /></mesh>)}
  </group>
}
