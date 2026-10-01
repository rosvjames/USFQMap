import { Line } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { CanvasTexture, DoubleSide, InstancedMesh, Object3D, RepeatWrapping, Shape, Vector2 } from 'three'
import { boundarySegments, SPORT_ZONES, SPORT_STAIRS, TENNIS_LANDING, SPORT_GATE, SPORT_ACCESS_AREAS, TERRAIN_CUTOUTS, PATH_LEVEL, type SportZone } from '../lib/terrain'
import { createTerrainShapes } from '../lib/architecture'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'
import { MapLabel } from './MapLabel'

function frame(ring: Vec2[]) {
  const edge = ring.map((a, i) => [a, ring[(i + 1) % ring.length]]).find(([a, b]) => Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]))!
  let dx = edge[1][0] - edge[0][0], dy = edge[1][1] - edge[0][1]
  if (dx < 0) { dx = -dx; dy = -dy }
  const angle = Math.atan2(dy, dx), ux = Math.cos(angle), uy = Math.sin(angle)
  const us = ring.map(([x, y]) => x * ux + y * uy), vs = ring.map(([x, y]) => x * uy - y * ux)
  const u = (Math.max(...us) + Math.min(...us)) / 2, v = (Math.max(...vs) + Math.min(...vs)) / 2
  return { angle, center: [u * ux + v * uy, u * uy - v * ux] as Vec2, width: Math.max(...us) - Math.min(...us), length: Math.max(...vs) - Math.min(...vs) }
}

function Wire({ width, height, texture }: { width: number; height: number; texture: CanvasTexture }) {
  return <mesh receiveShadow raycast={() => null}>
    <planeGeometry args={[width, height]} onUpdate={(geo) => {
      const uv = geo.getAttribute('uv')
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 0.22, uv.getY(i) * height / 0.22)
      uv.needsUpdate = true
    }} />
    <meshStandardMaterial map={texture} color="#526057" alphaTest={0.35} side={DoubleSide} roughness={0.6} metalness={0.4} />
  </mesh>
}

function Net({ width, bottom = 0, height, texture }: { width: number; bottom?: number; height: number; texture: CanvasTexture }) {
  return <group>
    <group position={[0, bottom + height / 2, 0]}><Wire width={width} height={height} texture={texture} /></group>
    {[-1, 1].map((side) => <mesh key={side} position={[side * width / 2, (height + bottom) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, height + bottom + 0.14, 8]} /><meshStandardMaterial color="#e0e0d5" metalness={0.6} roughness={0.45} />
    </mesh>)}
    <Line points={[[-width / 2, bottom + height, 0], [width / 2, bottom + height, 0]]} color="#ede9dc" lineWidth={0.06} worldUnits />
  </group>
}

function Rectangle({ width, length, x = 0, z = 0, color = '#f0ede0' }: { width: number; length: number; x?: number; z?: number; color?: string }) {
  return <Line points={[[x - width / 2, 0.055, z - length / 2], [x + width / 2, 0.055, z - length / 2], [x + width / 2, 0.055, z + length / 2], [x - width / 2, 0.055, z + length / 2], [x - width / 2, 0.055, z - length / 2]]} color={color} lineWidth={0.065} worldUnits raycast={() => null} />
}

function Tennis({ width, texture }: { width: number; texture: CanvasTexture }) {
  return <group>{[-1, 1].map((side) => <group key={side} position={[side * width / 4, 0, 0]}>
    <Rectangle width={10.97} length={23.77} />
    <Rectangle width={8.23} length={23.77} />
    <Rectangle width={8.23} length={12.8} />
    <Line points={[[0, 0.055, -6.4], [0, 0.055, 6.4]]} color="#f0ede0" lineWidth={0.065} worldUnits />
    <Net width={12.8} height={1.05} texture={texture} />
  </group>)}</group>
}

function Football({ width, length, natural, texture }: { width: number; length: number; natural: boolean; texture: CanvasTexture }) {
  const w = width * 0.73, l = length * 0.78
  return <group>
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 0.015, -l / 2 + (i + 0.5) * l / 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, l / 8]} /><meshStandardMaterial color={i % 2 ? natural ? '#748c50' : '#45784b' : natural ? '#6b8447' : '#376b45'} roughness={1} />
    </mesh>)}
    <Rectangle width={w} length={l} />
    <Line points={[[-w / 2, 0.055, 0], [w / 2, 0.055, 0]]} color="#f0ede0" lineWidth={0.065} worldUnits />
    <Line points={Array.from({ length: 49 }, (_, i) => [Math.sin(i * Math.PI / 24) * w * 0.13, 0.055, Math.cos(i * Math.PI / 24) * w * 0.13] as [number, number, number])} color="#f0ede0" lineWidth={0.065} worldUnits />
    {[-1, 1].map((side) => <group key={side}>
      <Rectangle width={w * 0.6} length={l * 0.16} z={side * (l / 2 - l * 0.08)} />
      <group position={[0, 0, side * (l / 2 + 0.5)]}>
        <Net width={natural ? 5 : 3.6} height={2.1} texture={texture} />
        <Line points={[[-(natural ? 2.5 : 1.8), 2.1, 0], [-(natural ? 2.5 : 1.8), 2.1, side * 0.8], [(natural ? 2.5 : 1.8), 2.1, side * 0.8], [(natural ? 2.5 : 1.8), 2.1, 0]]} color="#dddcd0" lineWidth={0.065} worldUnits />
      </group>
    </group>)}
  </group>
}

function MetalFurniture() {
  const tubes = useRef<InstancedMesh>(null), backs = useRef<InstancedMesh>(null)
  const parts = useMemo(() => {
    const cylinders: { x: number; y: number; z: number; r: number; h: number }[] = []
    const chairs: { x: number; z: number; angle: number }[] = []
    for (const x of [-8, 0, 8]) for (const z of [-8, 0, 8]) {
      cylinders.push({ x, z, y: 0.75, r: 0.85, h: 0.04 }, { x, z, y: 0.37, r: 0.07, h: 0.74 }, { x, z, y: 0.07, r: 0.35, h: 0.06 })
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2, cx = x + Math.sin(angle) * 1.25, cz = z + Math.cos(angle) * 1.25
        cylinders.push({ x: cx, z: cz, y: 0.46, r: 0.28, h: 0.04 })
        for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) cylinders.push({ x: cx + dx, z: cz + dz, y: 0.23, r: 0.025, h: 0.46 })
        chairs.push({ x: cx + Math.sin(angle) * 0.24, z: cz + Math.cos(angle) * 0.24, angle })
        cylinders.push({ x: cx + Math.sin(angle) * 0.24, z: cz + Math.cos(angle) * 0.24, y: 0.64, r: 0.025, h: 0.37 })
      }
    }
    return { cylinders, chairs }
  }, [])
  useLayoutEffect(() => {
    const object = new Object3D()
    parts.cylinders.forEach((part, i) => {
      object.position.set(part.x, part.y, part.z); object.scale.set(part.r, part.h, part.r); object.updateMatrix(); tubes.current?.setMatrixAt(i, object.matrix)
    })
    parts.chairs.forEach((part, i) => {
      object.position.set(part.x, 0.8, part.z); object.scale.set(1, 1, 1); object.rotation.set(0, part.angle, 0); object.updateMatrix(); backs.current?.setMatrixAt(i, object.matrix)
    })
    for (const mesh of [tubes.current, backs.current]) if (mesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere() }
  }, [parts])
  return <group>
    <instancedMesh ref={tubes} args={[undefined, undefined, parts.cylinders.length]} castShadow receiveShadow><cylinderGeometry args={[1, 1, 1, 12]} /><meshStandardMaterial color="#697476" metalness={0.7} roughness={0.38} /></instancedMesh>
    <instancedMesh ref={backs} args={[undefined, undefined, parts.chairs.length]} castShadow><torusGeometry args={[0.25, 0.025, 6, 16, Math.PI]} /><meshStandardMaterial color="#697476" metalness={0.7} roughness={0.38} /></instancedMesh>
  </group>
}

function BoundaryWalls({ zone, texture }: { zone: SportZone; texture: CanvasTexture }) {
  return <group>{boundarySegments(zone).map(([a, b], i) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 0.1) return null
    const wallHeight = 0.25 - zone.height
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    const center: [number, number, number] = [(a[0] + b[0]) / 2, zone.height, -(a[1] + b[1]) / 2]
    return <group key={i} position={center} rotation={[0, angle, 0]}>
      {zone.height < 0 && <mesh position={[0, wallHeight / 2, 0]} receiveShadow><boxGeometry args={[length, wallHeight, 0.12]} /><meshStandardMaterial color="#a89e88" roughness={0.95} /></mesh>}
      {zone.kind === 'synthetic' && <group>
        <group position={[0, 2.5, 0]}><Wire width={length} height={5} texture={texture} /></group>
        <Line points={[[-length / 2, 5, 0], [length / 2, 5, 0]]} color="#3f5043" lineWidth={0.075} worldUnits />
        {Array.from({ length: Math.ceil(length / 3.5) + 1 }, (_, j) => <mesh key={j} position={[-length / 2 + j * length / Math.ceil(length / 3.5), 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 5.15, 8]} /><meshStandardMaterial color="#3f5043" metalness={0.6} roughness={0.6} />
        </mesh>)}
      </group>}
    </group>
  })}</group>
}

export function SportsGround({ materials, names }: { materials: CampusMaterials; names: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32
    const ctx = canvas.getContext('2d')!; ctx.strokeStyle = '#a6ada3'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(32, 32); ctx.moveTo(0, 32); ctx.lineTo(32, 0); ctx.stroke()
    const map = new CanvasTexture(canvas); map.wrapS = map.wrapT = RepeatWrapping; map.anisotropy = 4
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <group>
    {SPORT_ACCESS_AREAS.map((ring, i) => <mesh key={`access-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} material={materials.road} receiveShadow>
      <shapeGeometry args={[createTerrainShapes(ring, TERRAIN_CUTOUTS)]} onUpdate={(geo) => { const uv = geo.getAttribute('uv'); for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) / 2.4, uv.getY(j) / 2.4); uv.needsUpdate = true }} />
    </mesh>)}
    {SPORT_ZONES.map((zone) => {
      const f = frame(zone.area.ring), material = zone.kind === 'sand' ? materials.sand : zone.kind === 'tennis' ? materials.tennis : zone.kind === 'synthetic' ? materials.synthetic : zone.kind === 'terrace' ? materials.paving : materials.grass
      const shape = new Shape(zone.area.ring.map(([x, y]) => new Vector2(x, y)))
      return <group key={zone.area.osmId}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, zone.height, 0]} material={material} receiveShadow>
          <shapeGeometry args={[shape]} onUpdate={(geo) => { const uv = geo.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4); uv.needsUpdate = true }} />
        </mesh>
        <BoundaryWalls zone={zone} texture={texture} />
        <group position={[f.center[0], zone.height + 0.015, -f.center[1]]} rotation={[0, f.angle, 0]}>
          {zone.kind === 'sand' && [-1, 1].map((side) => <group key={side} position={[0, 0, side * 6]}>
            <Rectangle width={12} length={6} color="#476a86" /><group rotation={[0, Math.PI / 2, 0]}><Net width={6.4} bottom={1.43} height={1} texture={texture} /></group>
          </group>)}
          {zone.kind === 'terrace' && <MetalFurniture />}
          {zone.kind === 'tennis' && <Tennis width={f.width} texture={texture} />}
          {(zone.kind === 'synthetic' || zone.kind === 'football') && <Football width={f.width} length={f.length} natural={zone.kind === 'football'} texture={texture} />}
        </group>
        {names && <MapLabel text={zone.label} position={[f.center[0], 1.6, -f.center[1]]} variant="tag" />}
      </group>
    })}
    {SPORT_STAIRS.map((stair, i) => {
      const dx = stair.bottom[0] - stair.top[0], dy = stair.bottom[1] - stair.top[1], length = Math.hypot(dx, dy)
      const count = Math.ceil((PATH_LEVEL - stair.low) / 0.18)
      return <group key={i}>
        {Array.from({ length: count }, (_, j) => {
          const t = (j + 0.5) / count, level = PATH_LEVEL + (stair.low - PATH_LEVEL) * t
          return <mesh key={j} position={[stair.top[0] + dx * t, stair.low - 0.1 + (level - stair.low + 0.1) / 2, -stair.top[1] - dy * t]} rotation={[0, Math.atan2(dy, dx), 0]} receiveShadow castShadow>
            <boxGeometry args={[length / count + 0.025, level - stair.low + 0.1, stair.width]} /><meshStandardMaterial color="#b8b2a2" roughness={0.95} />
          </mesh>
        })}
        {names && <MapLabel text="Gradas" position={[stair.top[0], 1, -stair.top[1]]} variant="tag" />}
      </group>
    })}
    {[TENNIS_LANDING, SPORT_GATE].map((ring, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.24, 0]} material={materials.paving} receiveShadow><shapeGeometry args={[new Shape(ring.map(([x, y]) => new Vector2(x, y)))]} /></mesh>)}
  </group>
}
