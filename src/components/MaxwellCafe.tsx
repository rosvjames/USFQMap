import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, ExtrudeGeometry, MeshStandardMaterial, Quaternion, Shape, SRGBColorSpace, Vector2, Vector3 } from 'three'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'
import { MAXWELL_ENTRANCE as entrance } from '../lib/maxwell'
import { CAFE_BUS, CAFE_FACADE_HEIGHT, CAFE_OBELISK, CAFE_OUTLINE, CAFE_PLANTERS, CAFE_TABLES, CAFE_TURF } from '../lib/maxwellCafe'
import { Bush } from './CampusPlants'

const noRaycast = () => null
type Position = [number, number, number]
type Finish = MeshStandardMaterial
const groundShape = (ring: Vec2[]) => new Shape(ring.map(([x, z]) => new Vector2(x, -z)))

function Box({ at, size, material }: { at: Position; size: Position; material: Finish }) {
  return <mesh position={at} material={material} castShadow receiveShadow raycast={noRaycast}><boxGeometry args={size} /></mesh>
}
function Rod({ from, to, radius = 0.025, material }: { from: Position; to: Position; radius?: number; material: Finish }) {
  const a = new Vector3(...from), b = new Vector3(...to), delta = b.clone().sub(a)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize())
  return <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={rotation} material={material} castShadow raycast={noRaycast}><cylinderGeometry args={[radius, radius, delta.length(), 6]} /></mesh>
}

/** An original painted panel suggests the worn red/black mural in the supplied photo. */
function busMural() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c7c8bd'; ctx.fillRect(0, 0, 1024, 256)
  let seed = 420
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = ['#797b71', '#a2a393', '#e1dfd1'][i % 3]
    ctx.fillRect(random() * 1024, random() * 256, 4 + random() * 24, 2 + random() * 15)
  }
  for (let i = 0; i < 9; i++) {
    const x = 95 + i * 106
    ctx.beginPath(); ctx.moveTo(x - 37, 233); ctx.lineTo(x - 16, 36); ctx.lineTo(x + 23, 22)
    ctx.lineTo(x + 48, 78); ctx.lineTo(x + 11, 108); ctx.lineTo(x + 43, 223); ctx.lineTo(x + 8, 205); ctx.closePath()
    ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = '#262d2e'; ctx.stroke()
    ctx.lineWidth = 10; ctx.strokeStyle = '#ece9db'; ctx.stroke(); ctx.fillStyle = i % 3 ? '#943735' : '#676a63'; ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = '#202728'; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - 3, 65); ctx.lineTo(x + 4, 179); ctx.lineTo(x + 21, 197); ctx.stroke()
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace
  return texture
}

export function MaxwellCafe({ materials }: { materials: CampusMaterials }) {
  const finishes = useMemo(() => ({
    iron: new MeshStandardMaterial({ color: '#343b36', roughness: 0.8 }),
    white: new MeshStandardMaterial({ color: '#e9e7dc', roughness: 0.72 }),
    bus: new MeshStandardMaterial({ color: '#c9c9ba', roughness: 0.94 }),
    red: new MeshStandardMaterial({ color: '#a81930', roughness: 0.86, side: DoubleSide }),
  }), [])
  // The pane is shared and owned by the campus materials, so it stays out of the set disposed below.
  const glass = materials.glass('#263936')
  const mural = useMemo(busMural, [])
  const muralFinish = useMemo(() => new MeshStandardMaterial({ map: mural, roughness: 1 }), [mural])
  const paving = useMemo(() => groundShape(CAFE_OUTLINE), [])
  const turf = useMemo(() => groundShape(CAFE_TURF), [])
  useEffect(() => () => { Object.values(finishes).forEach((m) => m.dispose()); mural.dispose(); muralFinish.dispose() }, [finishes, mural, muralFinish])
  return <group position={[entrance.center[0], 0, -entrance.center[1]]} rotation={[0, entrance.angle, 0]}>
    <mesh position={[0, 0.61, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.paving} receiveShadow raycast={noRaycast}>
      <shapeGeometry args={[paving]} onUpdate={(g) => { const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.1, uv.getY(i) / 1.1); uv.needsUpdate = true }} />
    </mesh>
    <mesh position={[0, 0.64, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.garden} receiveShadow raycast={noRaycast}><shapeGeometry args={[turf]} /></mesh>
    <VintageBus finishes={{ ...finishes, glass }} mural={muralFinish} />
    <group position={[CAFE_OBELISK[0], 0.61, CAFE_OBELISK[1]]}>
      <Box at={[0, 0.17, 0]} size={[2.4, 0.34, 2.4]} material={materials.entranceStone} />
      <Box at={[0, 0.45, 0]} size={[1.8, 0.24, 1.8]} material={materials.redStone} />
      <mesh position={[0, 4.25, 0]} rotation={[0, Math.PI / 4, 0]} material={materials.redStone} castShadow raycast={noRaycast}><cylinderGeometry args={[0.53, 0.75, 7.4, 4]} /></mesh>
      <mesh position={[0, 8.55, 0]} rotation={[0, Math.PI / 4, 0]} material={materials.redStone} castShadow raycast={noRaycast}><coneGeometry args={[0.75, 1.25, 4]} /></mesh>
      <Box at={[0, 2.95, 0]} size={[2.35, 0.16, 2.35]} material={finishes.iron} />
    </group>
    {CAFE_TABLES.map(([x, z], i) => <group key={i} position={[x, 0.64, z]}>
      <CafeTable white={finishes.white} />
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, j) => <group key={j} position={[Math.sin(angle) * 1.08, 0, Math.cos(angle) * 1.08]} rotation={[0, angle, 0]}><CafeChair white={finishes.white} /></group>)}
      <Rod from={[0.16, 0, 0.1]} to={[0.16, 2.9, 0.1]} radius={0.045} material={finishes.iron} />
      <mesh position={[0.16, 2.9, 0.1]} rotation={[0, Math.PI / 4, 0]} material={finishes.red} castShadow raycast={noRaycast}><coneGeometry args={[2.1, 0.6, 4, 1, true]} /></mesh>
      <mesh position={[0.16, 3.23, 0.1]} material={finishes.red} raycast={noRaycast}><sphereGeometry args={[0.1, 8, 6]} /></mesh>
    </group>)}
    {CAFE_PLANTERS.map(([x, z], i) => <group key={i} position={[x, 0.61, z]}>
      <mesh position={[0, 0.46, 0]} rotation={[0, Math.PI / 4, 0]} material={materials.cream} castShadow raycast={noRaycast}><cylinderGeometry args={[0.61, 0.43, 0.92, 4]} /></mesh>
      <Box at={[0, 0.925, 0]} size={[0.77, 0.035, 0.77]} material={materials.soil} />
      <Rod from={[0, 0.9, 0]} to={[0.04, 3.3, 0]} radius={0.065} material={materials.bark} />
      {Array.from({ length: 5 }, (_, j) => {
        const angle = j * 2.4 + i, end: Position = [Math.sin(angle) * 0.58, 2.8 + j * 0.16, Math.cos(angle) * 0.58]
        return <Rod key={j} from={[0, 1.75 + j * 0.2, 0]} to={end} radius={0.025} material={materials.bark} />
      })}
      <Bush materials={materials} position={[0, 3.05, 0]} scale={[0.95, 0.55, 0.95]} rotation={i} tone="#c3d0a4" />
    </group>)}
    <CafeBalcony materials={materials} iron={finishes.iron} glass={glass} />
  </group>
}

type Finishes = { iron: Finish; white: Finish; bus: Finish; glass: Finish; red: Finish }
function VintageBus({ finishes: f, mural }: { finishes: Finishes; mural: Finish }) {
  const geometry = useMemo(() => {
    const s = new Shape(); s.moveTo(-4.4, 0.5); s.lineTo(4.1, 0.5); s.quadraticCurveTo(4.4, 0.5, 4.4, 0.8)
    s.lineTo(4.4, 2.55); s.quadraticCurveTo(4.4, 3.1, 3.8, 3.1); s.lineTo(-3.9, 3.1)
    s.quadraticCurveTo(-4.4, 3.1, -4.4, 2.6); s.closePath()
    return new ExtrudeGeometry(s, { depth: CAFE_BUS.width, bevelEnabled: false, curveSegments: 8 })
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group position={[CAFE_BUS.center[0], 0.61, CAFE_BUS.center[1]]}>
    <mesh geometry={geometry} position={[0, 0, -1.25]} material={f.bus} castShadow receiveShadow raycast={noRaycast} />
    <Box at={[0, 0.52, 0]} size={[8.9, 0.22, 2.65]} material={f.iron} />
    <Box at={[0, 3.08, 0]} size={[8.1, 0.19, 2.5]} material={f.iron} />
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[0, 1.19, side * 1.258]} rotation={[0, side < 0 ? Math.PI : 0, 0]} material={mural} raycast={noRaycast}><planeGeometry args={[8.45, 1.19]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <group key={i}>
        <Box at={[-3.67 + i * 0.96, 2.37, side * 1.263]} size={[0.84, 0.89, 0.055]} material={f.glass} />
        <Box at={[-3.67 + i * 0.96, 2.37, side * 1.298]} size={[0.025, 0.89, 0.025]} material={f.white} />
      </group>)}
      <Box at={[0, 1.87, side * 1.29]} size={[8.6, 0.065, 0.05]} material={f.iron} />
    </group>)}
    <Box at={[4.405, 2.33, 0]} size={[0.05, 1.08, 2.22]} material={f.glass} />
    <Box at={[4.44, 2.33, 0]} size={[0.07, 1.12, 0.09]} material={f.bus} />
    <Box at={[4.44, 0.69, 0]} size={[0.16, 0.22, 2.7]} material={f.iron} />
    <Box at={[4.44, 1.03, 0]} size={[0.045, 0.28, 0.86]} material={f.iron} />
    {[-0.82, 0.82].map((z) => <mesh key={z} position={[4.455, 1.19, z]} rotation={[0, 0, Math.PI / 2]} material={f.white} raycast={noRaycast}><cylinderGeometry args={[0.15, 0.15, 0.045, 12]} /></mesh>)}
    {[-2.8, 2.8].map((x) => <group key={x}>
      <Box at={[x, 0.2, 0]} size={[0.17, 0.4, 2.1]} material={f.iron} />
      <Box at={[x, 0.03, 0]} size={[0.6, 0.06, 2.5]} material={f.iron} />
    </group>)}
  </group>
}

function CafeTable({ white }: { white: Finish }) {
  return <group>
    <mesh position={[0, 0.78, 0]} material={white} castShadow raycast={noRaycast}><cylinderGeometry args={[0.69, 0.69, 0.055, 24]} /></mesh>
    <Rod from={[0, 0.08, 0]} to={[0, 0.76, 0]} radius={0.045} material={white} />
    {[0, 2.1, 4.2].map((a) => <Rod key={a} from={[0, 0.4, 0]} to={[Math.sin(a) * 0.48, 0.04, Math.cos(a) * 0.48]} radius={0.03} material={white} />)}
  </group>
}
function CafeChair({ white }: { white: Finish }) {
  return <group>
    <mesh position={[0, 0.46, 0]} material={white} castShadow raycast={noRaycast}><cylinderGeometry args={[0.26, 0.26, 0.04, 14]} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Rod key={`${x}/${z}`} from={[x * 0.23, 0.02, z * 0.23]} to={[x * 0.19, 0.46, z * 0.18]} material={white} />))}
    {[-1, 1].map((side) => <Rod key={side} from={[side * 0.2, 0.46, 0.18]} to={[side * 0.22, 1.02, 0.27]} material={white} />)}
    <Rod from={[-0.22, 1.02, 0.27]} to={[0.22, 1.02, 0.27]} material={white} />
    {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, 0.78, 0.24]} scale={[0.11, 0.19, 1]} material={white} raycast={noRaycast}><torusGeometry args={[1, 0.1, 5, 12]} /></mesh>)}
  </group>
}

function CafeBalcony({ materials, iron, glass }: { materials: CampusMaterials; iron: Finish; glass: Finish }) {
  const angle = -Math.atan2(1.7, 18.6)
  const top = CAFE_FACADE_HEIGHT
  const gable = useMemo(() => { const s = new Shape(); s.moveTo(-3.8, 0); s.lineTo(3.8, 0); s.lineTo(0, 2.5); s.closePath(); return s }, [])
  return <group>
    <group position={[-27.65, 0, -10.85]} rotation={[0, angle, 0]}>
      <Box at={[0, 4.05, 0.65]} size={[18.3, 0.23, 1.5]} material={materials.cream} />
      {[-8.7, -4.35, 0, 4.35, 8.7].map((x) => <Box key={x} at={[x, (4.2 + top) / 2, 1.28]} size={[0.4, top - 4.2, 0.4]} material={materials.cream} />)}
      <Box at={[0, top - 0.1, 1.28]} size={[18.5, 0.4, 0.63]} material={materials.cream} />
      <Rod from={[-9.1, 5.05, 1.38]} to={[9.1, 5.05, 1.38]} radius={0.04} material={iron} />
      {Array.from({ length: 29 }, (_, i) => <group key={i}>
        <Rod from={[-9.1 + i * 0.63, 4.2, 1.38]} to={[-9.1 + i * 0.63, 5.05, 1.38]} radius={0.022} material={iron} />
        {i < 28 && <><Rod from={[-9.1 + i * 0.63, 4.2, 1.38]} to={[-8.47 + i * 0.63, 5.05, 1.38]} radius={0.014} material={iron} /><Rod from={[-9.1 + i * 0.63, 5.05, 1.38]} to={[-8.47 + i * 0.63, 4.2, 1.38]} radius={0.014} material={iron} /></>}
      </group>)}
      {Array.from({ length: 35 }, (_, i) => <Box key={i} at={[-8.95 + i * 0.525, top - 0.38, 1.1]} size={[0.19, 0.3, 0.42]} material={materials.cream} />)}
    </group>
    <group position={[-36.99, top, -7.85]} rotation={[0, Math.atan2(7.9, 0.4), 0]}>
      <mesh material={materials.cream} raycast={noRaycast}><extrudeGeometry args={[gable, { depth: 0.2, bevelEnabled: false }]} /></mesh>
      {[[-2.35, 0.45, 0.46], [0, 1.63, 0.28], [2.35, 0.45, 0.46]].map(([x, y, radius], i) => <group key={i} position={[x, y, 0.22]}>
        <mesh material={glass} raycast={noRaycast}><circleGeometry args={[radius, 24]} /></mesh>
        <mesh material={materials.entranceStone} raycast={noRaycast}><torusGeometry args={[radius + 0.04, 0.07, 6, 24]} /></mesh>
      </group>)}
    </group>
    <Box at={[-36.98, top - 0.08, -7.85]} size={[0.4, 0.18, 7.9]} material={materials.cream} />
  </group>
}
