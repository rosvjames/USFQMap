import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, DoubleSide, InstancedMesh, Object3D, Shape, Vector2, Vector3 } from 'three'
import { palmFrond } from './LandscapeDetails'
import type { ThreeEvent } from '@react-three/fiber'
import { PAGODA, PAGODA_POND, PAGODA_POND_OUTLINE, createPagodaRoof, pagodaBridgeHeight } from '../lib/pagoda'
import type { CampusMaterials } from '../lib/materials'

type Point = [number, number, number]
type Timber = { p: Point; size: Point; angle?: number }

/** Repeated joinery shares one draw call and a locally generated wood-grain texture. */
function Timbers({ items, material }: { items: Timber[]; material: CampusMaterials['pagodaWood'] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const dummy = new Object3D()
    items.forEach(({ p, size, angle = 0 }, i) => {
      dummy.position.set(...p); dummy.scale.set(...size); dummy.rotation.set(0, angle, 0)
      dummy.updateMatrix(); ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [items, material])
  return <instancedMesh ref={ref} args={[undefined, material, items.length]} castShadow receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
  </instancedMesh>
}

function CurvedTimber({ points, radius, material }: { points: Point[]; radius: number; material: CampusMaterials['pagodaWood'] }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points])
  return <mesh material={material} castShadow><tubeGeometry args={[curve, 40, radius, 8, false]} /></mesh>
}

export function Pagoda({ materials, onSelect }: { materials: CampusMaterials; onSelect: () => void }) {
  const roof = useMemo(createPagodaRoof, [])
  useEffect(() => () => roof.dispose(), [roof])
  const pond = useMemo(() => new Shape(PAGODA_POND.map(([x, y]) => new Vector2(x, y))), [])
  const layout = useMemo(() => {
    const wood: Timber[] = [], dark: Timber[] = [], stone: Timber[] = [], red: Timber[] = [], green: Timber[] = []
    const add = (items: Timber[], p: Point, size: Point, angle = 0) => items.push({ p, size, angle })
    const floor = PAGODA.floor, hx = PAGODA.width / 2, hz = PAGODA.depth / 2
    // Raised veranda, perimeter beams, thin planks and stone foundation piers.
    add(wood, [0, floor - 0.18, 0], [hx * 2, 0.36, hz * 2])
    for (let x = -hx; x < hx; x += 0.28) add(wood, [x + 0.13, floor + 0.016, 0], [0.255, 0.032, hz * 2])
    for (const x of [-7.8, 0, 7.8]) for (const z of [-4.6, 4.6]) add(stone, [x, 0.83, z], [0.75, 0.96, 0.75])
    // Window bays are repeated on all four facades, inset behind the outer gallery.
    for (const face of [0, 1, 2, 3]) {
      const long = face % 2 === 0, extent = long ? hx - 1.3 : hz - 1.3
      const length = extent * 2, bays = long ? 8 : 4, bayWidth = length / bays
      const orientation = face * Math.PI / 2
      const fixed = long ? hz - 1.35 : hx - 1.35
      const local = (along: number, height: number, outward = 0): Point => [Math.cos(orientation) * along + Math.sin(orientation) * (fixed + outward), height, -Math.sin(orientation) * along + Math.cos(orientation) * (fixed + outward)]
      add(wood, local(0, floor + 0.33), [length, 0.66, 0.2], orientation)
      add(wood, local(0, 3.91), [length, 0.42, 0.22], orientation)
      for (let j = 0; j < bays; j++) {
        const x = -extent + bayWidth * (j + 0.5)
        // A dark recess behind closely spaced wooden lattice mullions.
        add(dark, local(x, 2.63, -0.03), [bayWidth - 0.1, 1.85, 0.065], orientation)
        for (let k = 0; k <= 5; k++) add(wood, local(x - bayWidth / 2 + 0.09 + (bayWidth - 0.18) * k / 5, 2.65, 0.055), [k === 0 || k === 5 ? 0.07 : 0.038, 1.9, 0.07], orientation)
        for (let k = 0; k <= 7; k++) add(wood, local(x, 1.7 + k * 0.27, 0.065), [bayWidth - 0.14, 0.038, 0.075], orientation)
      }
    }
    // Outer colonnade: square bases, round trunks, capitals and exposed rafters.
    const columns: Point[] = []
    for (const z of [-hz + 0.22, hz - 0.22]) for (let x = -hx + 0.3; x <= hx; x += (hx * 2 - 0.6) / 6) columns.push([x, 2.76, z])
    for (const x of [-hx + 0.3, hx - 0.3]) for (const z of [-2, 2]) columns.push([x, 2.76, z])
    columns.forEach(([x, , z]) => {
      add(wood, [x, 1.6, z], [0.43, 0.4, 0.43]); add(wood, [x, 4.04, z], [0.62, 0.22, 0.55])
    })
    for (const z of [-hz + 0.15, hz - 0.15]) {
      add(wood, [0, 4.05, z], [hx * 2 + 0.2, 0.24, 0.23])
      for (let x = -hx - 1; x <= hx + 1; x += 0.6) add(wood, [x, 4.12, z], [0.12, 0.14, 2.4])
    }
    for (const x of [-hx + 0.15, hx - 0.15]) add(wood, [x, 4.05, 0], [0.23, 0.24, hz * 2])
    // Gallery rails; leave the west-facing bridge entrance open.
    for (const z of [-hz + 0.15, hz - 0.15]) for (const height of [floor + 0.15, floor + 0.97]) add(wood, [0, height, z], [hx * 2, 0.14, 0.16])
    for (const x of [-hx + 0.15, hx - 0.15]) {
      for (const sign of [-1, 1]) {
        const from = x < 0 ? 1.65 : 0, length = hz - from
        for (const height of [floor + 0.15, floor + 0.97]) add(wood, [x, height, sign * (from + length / 2)], [0.16, 0.14, length])
      }
    }
    const balusters: Point[] = []
    for (const z of [-hz + 0.15, hz - 0.15]) for (let x = -hx + 0.5; x <= hx - 0.3; x += 0.43) balusters.push([x, floor + 0.15, z])
    for (const x of [-hx + 0.15, hx - 0.15]) for (let z = -hz + 0.5; z <= hz - 0.3; z += 0.43) if (x > 0 || Math.abs(z) > 1.65) balusters.push([x, floor + 0.15, z])
    // Arched bridge, plank joints, carved side fascias and continuous curved handrails.
    const bridgeStart = -hx - 4.15, bridgeEnd = -hx + 0.1, bridgeLength = bridgeEnd - bridgeStart
    for (let i = 0; i < 34; i++) {
      const t = (i + 0.5) / 34
      add(wood, [bridgeStart + bridgeLength * t, pagodaBridgeHeight(t) - 0.08, 0], [bridgeLength / 34 - 0.012, 0.16, 3.05])
    }
    for (const z of [-1.51, 1.51]) for (let i = 0; i <= 12; i++) {
      const t = i / 12, x = bridgeStart + bridgeLength * t, y = pagodaBridgeHeight(t)
      balusters.push([x, y + 0.08, z])
      if (i % 4 === 0) { add(wood, [x, y + 0.58, z], [0.23, 1.16, 0.23]); add(wood, [x, y + 1.18, z], [0.33, 0.12, 0.33]) }
    }
    // Broad approach steps with flanking red retaining walls and green coping.
    for (let i = 0; i < 6; i++) {
      const top = 0.55 + (6 - i) * (floor - 0.55) / 6
      add(stone, [bridgeStart - 0.3 - i * 0.43, (top + 0.25) / 2, 0], [0.46, top - 0.25, 3.4 + i * 0.38])
    }
    for (const z of [-3.02, 3.02]) {
      add(red, [bridgeStart - 1.2, 0.85, z], [3.2, 1.1, 0.35]); add(green, [bridgeStart - 1.2, 1.42, z], [3.3, 0.14, 0.44])
      add(red, [bridgeStart - 2.8, 0.9, z], [0.48, 1.2, 0.48]); add(green, [bridgeStart - 2.8, 1.53, z], [0.55, 0.13, 0.55])
    }
    return { wood, dark, stone, red, green, columns, balusters, bridgeStart, bridgeEnd, hx, hz }
  }, [])
  const select = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return
    event.stopPropagation(); onSelect()
  }
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.33, 0]} material={materials.pondWater} receiveShadow raycast={() => null}>
      <shapeGeometry args={[pond]} />
    </mesh>
    <group position={[PAGODA.center[0], 0, -PAGODA.center[1]]} rotation={[0, PAGODA.angle, 0]} onClick={select}>
      <Timbers items={layout.wood} material={materials.pagodaWood} />
      <Timbers items={layout.stone} material={materials.entranceStone} />
      <Timbers items={layout.red} material={materials.hallRed} />
      <Timbers items={layout.green} material={materials.metalRoof} />
      <Timbers items={layout.dark} material={materials.pagodaRoof} />
      {layout.columns.map((p, i) => <mesh key={i} position={p} material={materials.pagodaWood} castShadow><cylinderGeometry args={[0.16, 0.2, 2.45, 12]} /></mesh>)}
      <Balusters positions={layout.balusters} material={materials.pagodaWood} />
      <mesh geometry={roof} material={materials.pagodaRoof} castShadow receiveShadow />
      {/* Closed fascia edge hides the underside and emphasizes the upturned corners. */}
      {[-1, 1].map((side) => <CurvedTimber key={side} points={Array.from({ length: 17 }, (_, i): Point => {
        const s = i / 16; return [(s * 2 - 1) * (layout.hx + 1.5), 4.31 + 0.22 * Math.abs(2 * s - 1) ** 6, side * (layout.hz + 1.45)]
      })} radius={0.10} material={materials.pagodaWood} />)}
      {[-1, 1].map((side) => <group key={side}>
        <BridgeFascia start={layout.bridgeStart} end={layout.bridgeEnd} z={side * 1.5} material={materials.pagodaWood} />
        {[0.96, -0.22, -0.4].map((lift) => <CurvedTimber key={lift} points={Array.from({ length: 17 }, (_, i): Point => [layout.bridgeStart + (layout.bridgeEnd - layout.bridgeStart) * i / 16, pagodaBridgeHeight(i / 16) + lift, side * 1.53])} radius={lift > 0 ? 0.09 : 0.11} material={materials.pagodaWood} />)}
      </group>)}
      <CurvedTimber points={[[-4.6, 6.55, 0], [-2, 6.45, 0], [2, 6.45, 0], [4.6, 6.55, 0]]} radius={0.105} material={materials.pagodaRoof} />
      {[-1, 1].map((side) => <CurvedTimber key={side} points={[[side * 4.3, 6.4, 0], [side * 4.65, 6.55, 0], [side * 4.82, 6.92, 0]]} radius={0.11} material={materials.pagodaRoof} />)}
      <PondBorder materials={materials} />
      <PagodaPalm />
    </group>
  </group>
}

function Balusters({ positions, material }: { positions: Point[]; material: CampusMaterials['pagodaWood'] }) {
  const ref = useRef<InstancedMesh>(null)
  const profile = useMemo(() => [[0.065, 0], [0.065, 0.12], [0.04, 0.22], [0.085, 0.4], [0.045, 0.56], [0.05, 0.7], [0.065, 0.8]].map((p) => new Vector2(...p as [number, number])), [])
  useLayoutEffect(() => {
    const dummy = new Object3D()
    positions.forEach((p, i) => { dummy.position.set(...p); dummy.updateMatrix(); ref.current!.setMatrixAt(i, dummy.matrix) })
    ref.current!.instanceMatrix.needsUpdate = true; ref.current!.computeBoundingSphere()
  }, [positions, material])
  return <instancedMesh ref={ref} args={[undefined, material, positions.length]} castShadow><latheGeometry args={[profile, 8]} /></instancedMesh>
}

function PondBorder({ materials }: { materials: CampusMaterials }) {
  const rockMesh = useRef<InstancedMesh>(null)
  const rocks = useMemo(() => {
    const items: { p: Point; scale: Point }[] = []
    PAGODA_POND_OUTLINE.forEach((a, edge) => {
      const b = PAGODA_POND_OUTLINE[(edge + 1) % PAGODA_POND_OUTLINE.length]
      const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.55)
      for (let j = 0; j < count; j++) {
        const t = j / count, i = items.length, offset = Math.sin(i * 17) * 0.1
        items.push({ p: [a[0] + (b[0] - a[0]) * t + offset, 0.48, a[1] + (b[1] - a[1]) * t - offset],
          scale: [0.4 + i % 3 * 0.1, 0.25 + i % 2 * 0.12, 0.33 + i % 4 * 0.06] })
      }
    })
    return items
  }, [])
  useLayoutEffect(() => {
    const dummy = new Object3D()
    rocks.forEach(({ p, scale }, i) => {
      dummy.position.set(...p); dummy.scale.set(...scale); dummy.rotation.set(i, i * 1.7, 0)
      dummy.updateMatrix(); rockMesh.current!.setMatrixAt(i, dummy.matrix)
    })
    rockMesh.current!.instanceMatrix.needsUpdate = true; rockMesh.current!.computeBoundingSphere()
  }, [rocks, materials.pondRock])
  return <group>
    <instancedMesh ref={rockMesh} args={[undefined, materials.pondRock, rocks.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
    </instancedMesh>
    {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[-13.5 + Math.sin(i * 11) * 1.25, 0.355, (i % 2 ? -1 : 1) * (2 + Math.cos(i * 7) * 1.1)]} rotation={[-Math.PI / 2, 0, i * 2]}>
      <circleGeometry args={[0.22 + i % 3 * 0.07, 12, 0, Math.PI * 1.85]} /><meshStandardMaterial color={i % 2 ? '#526b35' : '#718344'} roughness={0.6} side={DoubleSide} />
    </mesh>)}
  </group>
}

/** The spreading date palm on the lake-facing side is visible in the rear reference photo. */
function PagodaPalm() {
  const frond = useMemo(palmFrond, [])
  useEffect(() => () => frond.dispose(), [frond])
  return <group position={[1, 0, -10]} raycast={() => null}>
    <mesh position={[0, 3.5, 0]} castShadow><cylinderGeometry args={[0.32, 0.48, 6.4, 14]} /><meshStandardMaterial color="#716143" roughness={1} /></mesh>
    {Array.from({ length: 24 }, (_, i) => <mesh key={i} geometry={frond} position={[0, 6.3 + i % 3 * 0.4, 0]} rotation={[0, i * Math.PI * 2 / 24, i % 3 === 0 ? -0.34 : i % 3 === 1 ? 0.06 : 0.48]} scale={[1.25, 1.3, 0.85]} castShadow>
      <meshStandardMaterial color={i % 4 ? '#4a6031' : '#777846'} roughness={0.95} side={DoubleSide} />
    </mesh>)}
  </group>
}

function BridgeFascia({ start, end, z, material }: { start: number; end: number; z: number; material: CampusMaterials['pagodaWood'] }) {
  const shape = useMemo(() => {
    const outline = Array.from({ length: 33 }, (_, i) => new Vector2(start + (end - start) * i / 32, pagodaBridgeHeight(i / 32) - 0.12))
    outline.push(...Array.from({ length: 33 }, (_, i) => new Vector2(end - (end - start) * i / 32, pagodaBridgeHeight(1 - i / 32) - 0.52)))
    return new Shape(outline)
  }, [start, end])
  return <mesh position={[0, 0, z - 0.06]} material={material} castShadow receiveShadow>
    <extrudeGeometry args={[shape, { depth: 0.12, bevelEnabled: false }]} />
  </mesh>
}
