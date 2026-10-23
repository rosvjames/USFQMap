import { Line } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D, RepeatWrapping, Shape, ShapeGeometry, Vector2 } from 'three'
import { boundarySegments, SPORT_ZONES, SPORT_STAIRS, SPORT_ACCESS_AREAS, SPORT_STAIRWAYS, NATURAL_PITCH_RAILING, SPORT_SEATING, wallStepsLevels, campusTerrainHeightAt, TERRAIN_CUTOUTS, PATH_LEVEL, sportStairTopHeight, type SportZone, type WallSteps } from '../lib/terrain'
import { createTerrainShapes } from '../lib/architecture'
import { campusBaseHeightAt, createGradedSurfaceGeometry } from '../lib/campusSlope'
import type { CampusMaterials } from '../lib/materials'
import { GardenTerrace, GARDEN_TABLES, SandCourtPlanting } from './SportsGarden'
import { pointInPolygon } from '../lib/geo'
import type { Vec2 } from '../types'

function frame(ring: Vec2[]) {
  const edge = ring.map((a, i) => [a, ring[(i + 1) % ring.length]])
    .filter(([a, b]) => Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]))
    .sort(([a, b], [c, d]) => Math.hypot(d[0] - c[0], d[1] - c[1]) - Math.hypot(b[0] - a[0], b[1] - a[1]))[0]
  let dx = edge[1][0] - edge[0][0], dy = edge[1][1] - edge[0][1]
  if (dx < 0) { dx = -dx; dy = -dy }
  const angle = Math.atan2(dy, dx), ux = Math.cos(angle), uy = Math.sin(angle)
  const us = ring.map(([x, y]) => x * ux + y * uy), vs = ring.map(([x, y]) => x * uy - y * ux)
  const u = (Math.max(...us) + Math.min(...us)) / 2, v = (Math.max(...vs) + Math.min(...vs)) / 2
  return { angle, center: [u * ux + v * uy, u * uy - v * ux] as Vec2, width: Math.max(...us) - Math.min(...us), length: Math.max(...vs) - Math.min(...vs) }
}

function Wire({ width, height, texture, white = false }: { width: number; height: number; texture: CanvasTexture; white?: boolean }) {
  return <mesh receiveShadow raycast={() => null}>
    <planeGeometry args={[width, height]} onUpdate={(geo) => {
      // onUpdate repeats on re-render; scale the UVs only once.
      if (geo.userData.scaled) return
      geo.userData.scaled = true
      const uv = geo.getAttribute('uv')
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 0.22, uv.getY(i) * height / 0.22)
      uv.needsUpdate = true
    }} />
    <meshStandardMaterial map={texture} color={white ? "#f4f1e2" : "#526057"} alphaTest={0.35} side={DoubleSide} roughness={0.6} metalness={0.4} />
  </mesh>
}

function Net({ width, bottom = 0, height, texture }: { width: number; bottom?: number; height: number; texture: CanvasTexture }) {
  return <group>
    <group position={[0, bottom + height / 2, 0]}><Wire width={width} height={height} texture={texture} white={bottom>0} /></group>
    {[-1, 1].map((side) => <mesh key={side} position={[side * width / 2, (height + bottom) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, height + bottom + 0.14, 8]} /><meshStandardMaterial color="#e0e0d5" metalness={0.6} roughness={0.45} />
    </mesh>)}
    <Line points={[[-width / 2, bottom + height, 0], [width / 2, bottom + height, 0]]} color="#ede9dc" lineWidth={0.06} worldUnits />
    {bottom > 0 && <Line points={[[-width/2,bottom,0],[width/2,bottom,0]]} color="#ede9dc" lineWidth={.045} worldUnits />}
  </group>
}

function Rectangle({ width, length, x = 0, z = 0, color = '#f0ede0' }: { width: number; length: number; x?: number; z?: number; color?: string }) {
  return <Line points={[[x - width / 2, 0.055, z - length / 2], [x + width / 2, 0.055, z - length / 2], [x + width / 2, 0.055, z + length / 2], [x - width / 2, 0.055, z + length / 2], [x - width / 2, 0.055, z - length / 2]]} color={color} lineWidth={0.065} worldUnits raycast={() => null} />
}

// The courts sit east of centre, leaving room for the bleachers along the west wall.
const TENNIS_SHIFT = 1.8

function Tennis({ width, texture }: { width: number; texture: CanvasTexture }) {
  return <group>{[-1, 1].map((side) => <group key={side} position={[side * width / 4 + TENNIS_SHIFT, 0, 0]}>
    <Rectangle width={10.97} length={23.77} />
    <Rectangle width={8.23} length={23.77} />
    <Rectangle width={8.23} length={12.8} />
    <Line points={[[0, 0.055, -6.4], [0, 0.055, 6.4]]} color="#f0ede0" lineWidth={0.065} worldUnits />
    <Net width={12.8} height={1.05} texture={texture} />
  </group>)}</group>
}

function Football({ width, length, natural, texture }: { width: number; length: number; natural: boolean; texture: CanvasTexture }) {
  // The natural pitch's margins leave room for the stairs behind its goal and the seating beside it.
  const w = width * (natural ? .66 : .73), l = length * (natural ? .74 : .78)
  return <group>
    {!natural && Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 0.015, -l / 2 + (i + 0.5) * l / 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, l / 8]} /><meshStandardMaterial color={i % 2 ? '#45784b' : '#376b45'} roughness={1} />
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

/** Steps against a retaining wall; their tops follow the wall as the ground above and below slopes. */
function StepsAgainstWall({ run, material }: { run: WallSteps; material: MeshStandardMaterial }) {
  const { a, b, count, tread, maxRise } = run
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]), angle = Math.atan2(b[1] - a[1], b[0] - a[0])
  const parts = useMemo(() => {
    const levelsA = wallStepsLevels(run, a), levelsB = wallStepsLevels(run, b)
    const riseA = Math.min(maxRise, Math.max(0, levelsA.upper - levelsA.low) / count)
    const riseB = Math.min(maxRise, Math.max(0, levelsB.upper - levelsB.low) / count)
    const base = Math.min(levelsA.low, levelsB.low) - .1
    // Heights are absolute, so they are applied once here rather than in onUpdate.
    const box = (width: number, depth: number, topA: number, topB: number) => {
      const geometry = new BoxGeometry(width, 1, depth), p = geometry.getAttribute('position')
      for (let j = 0; j < p.count; j++) p.setY(j, p.getY(j) > 0 ? (p.getX(j) < 0 ? topA : topB) : base)
      geometry.computeVertexNormals(); geometry.computeBoundingSphere()
      return geometry
    }
    return [
      ...Array.from({ length: count }, (_, i) => ({ x: 0, z: -(i + .5) * tread, geometry: box(length, tread + .01, levelsA.low + (count - i) * riseA, levelsB.low + (count - i) * riseB) })),
      ...(run.sides ? [-1, 1].map(side => ({ x: side * (length / 2 + .06), z: -count * tread / 2, geometry: box(.12, count * tread, ...(side < 0 ? [levelsA.upper, levelsA.upper] : [levelsB.upper, levelsB.upper]) as [number, number]) })) : []),
    ]
  }, [run, a, b, count, tread, maxRise, length])
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts])
  return <group position={[(a[0] + b[0]) / 2, 0, -(a[1] + b[1]) / 2]} rotation={[0, angle, 0]}>
    {parts.map((part, i) => <mesh key={i} position={[part.x, 0, part.z]} geometry={part.geometry} material={material} castShadow receiveShadow raycast={() => null} />)}
  </group>
}

function Railing({ line }: { line: Vec2[] }) {
  const posts = line.flatMap((b, i) => {
    if (!i) return [b]
    const a = line[i - 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.2))
    return Array.from({ length: n }, (_, j): Vec2 => [a[0] + (b[0] - a[0]) * (j + 1) / n, a[1] + (b[1] - a[1]) * (j + 1) / n])
  })
  const rail = (height: number) => posts.map(p => [p[0], campusBaseHeightAt(p) + height, -p[1]] as [number, number, number])
  return <group>
    {posts.map((p, i) => <mesh key={i} position={[p[0], campusBaseHeightAt(p) + .5, -p[1]]} castShadow raycast={() => null}>
      <cylinderGeometry args={[.03, .03, 1, 6]} /><meshStandardMaterial color="#3f5043" metalness={.6} roughness={.6} />
    </mesh>)}
    <Line points={rail(1)} color="#3f5043" lineWidth={.06} worldUnits />
    <Line points={rail(.5)} color="#3f5043" lineWidth={.035} worldUnits />
  </group>
}

function MetalFurniture() {
  const tubes = useRef<InstancedMesh>(null), backs = useRef<InstancedMesh>(null)
  const parts = useMemo(() => {
    const cylinders: { x: number; y: number; z: number; r: number; h: number }[] = []
    const chairs: { x: number; z: number; angle: number }[] = []
    for (const [x,z] of GARDEN_TABLES) {
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
    <instancedMesh ref={tubes} args={[undefined, undefined, parts.cylinders.length]} castShadow receiveShadow><cylinderGeometry args={[1, 1, 1, 12]} /><meshStandardMaterial color="#3b4841" metalness={0.7} roughness={0.38} /></instancedMesh>
    <instancedMesh ref={backs} args={[undefined, undefined, parts.chairs.length]} castShadow><torusGeometry args={[0.25, 0.025, 6, 16, Math.PI]} /><meshStandardMaterial color="#3b4841" metalness={0.7} roughness={0.38} /></instancedMesh>
  </group>
}

/** Ground just beyond a pitch's edge. A neighbouring sunken pitch keeps the campus level, so shared walls stay tall. */
function groundBeyond(zone: SportZone, p: Vec2, out: Vec2) {
  const beyond = SPORT_ZONES.some(z => z !== zone && pointInPolygon(out, z.area.ring)) ? campusBaseHeightAt(p) : campusTerrainHeightAt(out)
  return Math.max(zone.height, beyond)
}

/** A retaining wall whose top follows the ground behind it metre by metre, in the segment's local frame. */
function retainingWallGeometry(zone: SportZone, a: Vec2, b: Vec2) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(length))
  const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length, at = (t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const mid = at(.5), outside = pointInPolygon([mid[0] + nx * .2, mid[1] + ny * .2], zone.area.ring) ? -1 : 1
  const tops = Array.from({ length: n + 1 }, (_, k) => {
    const p = at(k / n)
    return groundBeyond(zone, p, [p[0] + nx * .2 * outside, p[1] + ny * .2 * outside]) - zone.height
  })
  const vertices: number[] = [], quad = (p: number[][]) => vertices.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3])
  for (let k = 0; k < n; k++) {
    const x0 = -length / 2 + length * k / n, x1 = -length / 2 + length * (k + 1) / n, y0 = tops[k], y1 = tops[k + 1]
    for (const z of [-.06, .06]) quad(z > 0 ? [[x0, 0, z], [x1, 0, z], [x1, y1, z], [x0, y0, z]] : [[x1, 0, z], [x0, 0, z], [x0, y0, z], [x1, y1, z]])
    quad([[x0, y0, .06], [x1, y1, .06], [x1, y1, -.06], [x0, y0, -.06]])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals()
  return geometry
}

function BoundaryWalls({ zone, texture }: { zone: SportZone; texture: CanvasTexture }) {
  const segments = useMemo(() => boundarySegments(zone).flatMap(([a,b]): [Vec2,Vec2][] => {
    const center = frame(zone.area.ring).center
    // Three metres of open entry through the western protective fence.
    if (zone.kind !== 'sand' || (a[0]+b[0])/2 > center[0] || Math.hypot(b[0]-a[0],b[1]-a[1]) < 20) return [[a,b]]
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]), at=(t:number):Vec2=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
    return [[a,at(.5-1.5/length)],[at(.5+1.5/length),b]]
  }), [zone])
  const walls = useMemo(() => zone.height < 0 ? segments.map(([a, b]) => retainingWallGeometry(zone, a, b)) : [], [zone, segments])
  useEffect(() => () => walls.forEach(g => g.dispose()), [walls])
  return <group>{segments.map(([a, b], i) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 0.1) return null
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    const center: [number, number, number] = [(a[0] + b[0]) / 2, zone.height, -(a[1] + b[1]) / 2]
    return <group key={i} position={center} rotation={[0, angle, 0]}>
      {walls[i] && <mesh receiveShadow geometry={walls[i]}><meshStandardMaterial color="#a89e88" roughness={0.95} /></mesh>}
      {(zone.kind === 'synthetic' || zone.kind === 'sand') && <group>
        <group position={[0, 2.5, 0]}><Wire width={length} height={5} texture={texture} /></group>
        <Line points={[[-length / 2, 5, 0], [length / 2, 5, 0]]} color="#3f5043" lineWidth={0.075} worldUnits />
        {Array.from({ length: Math.ceil(length / 3.5) + 1 }, (_, j) => <mesh key={j} position={[-length / 2 + j * length / Math.ceil(length / 3.5), 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 5.15, 8]} /><meshStandardMaterial color="#3f5043" metalness={0.6} roughness={0.6} />
        </mesh>)}
      </group>}
    </group>
  })}</group>
}

export function SportsGround({ materials }: { materials: CampusMaterials }) {
  const access = useMemo(() => SPORT_ACCESS_AREAS.map(ring => {
    const flat = new ShapeGeometry(createTerrainShapes(ring, TERRAIN_CUTOUTS))
    const graded = createGradedSurfaceGeometry(flat)
    flat.dispose(); return graded
  }), [])
  useEffect(() => () => access.forEach(g => g.dispose()), [access])
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32
    const ctx = canvas.getContext('2d')!; ctx.strokeStyle = '#a6ada3'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(32, 32); ctx.moveTo(0, 32); ctx.lineTo(32, 0); ctx.stroke()
    const map = new CanvasTexture(canvas); map.wrapS = map.wrapT = RepeatWrapping; map.anisotropy = 4
    return map
  }, [])
  const volleyTexture = useMemo(() => {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=32
    const ctx=canvas.getContext('2d')!;ctx.strokeStyle='#fff';ctx.lineWidth=1.6
    ctx.strokeRect(.8,.8,30.4,30.4)
    const map=new CanvasTexture(canvas);map.wrapS=map.wrapT=RepeatWrapping;map.anisotropy=4;return map
  },[])
  const concrete = useMemo(() => new MeshStandardMaterial({ color: '#b8b2a2', roughness: .95 }), [])
  useEffect(() => () => { texture.dispose(); volleyTexture.dispose(); concrete.dispose() }, [texture,volleyTexture,concrete])
  return <group>
    {access.map((geometry, i) => <mesh key={`access-${i}`} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} material={materials.paving} receiveShadow />)}
    {SPORT_ZONES.map((zone) => {
      const f = frame(zone.area.ring), material = zone.kind === 'sand' ? materials.sand : zone.kind === 'tennis' ? materials.tennis : zone.kind === 'synthetic' ? materials.synthetic : materials.grass
      const shape = new Shape(zone.area.ring.map(([x, y]) => new Vector2(x, y)))
      return <group key={zone.area.osmId}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, zone.height, 0]} material={material} receiveShadow>
          <shapeGeometry args={[shape]} onUpdate={(geo) => { if (geo.userData.scaled) return; geo.userData.scaled = true; const uv = geo.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4); uv.needsUpdate = true }} />
        </mesh>
        <BoundaryWalls zone={zone} texture={texture} />
        <group position={[f.center[0], zone.height + 0.015, -f.center[1]]} rotation={[0, f.angle, 0]}>
          {zone.kind === 'sand' && <>
            {[-1,1].map(side=><group key={side} position={[0,0,side*6.1]}>
              <Rectangle width={12} length={8} color="#d98640" />
              <group rotation={[0,Math.PI/2,0]}><Net width={8.5} bottom={1.43} height={1} texture={volleyTexture} /></group>
            </group>)}
            <SandCourtPlanting width={f.width} length={f.length} />
            {[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}-${z}`} position={[x*(f.width/2+.3),0,z*(f.length/2-.5)]}>
              <mesh position={[0,3.9,0]} castShadow><cylinderGeometry args={[.06,.085,7.8,8]} /><meshStandardMaterial color="#35413b" /></mesh>
              <mesh position={[0,7.8,0]} rotation={[.2,0,0]}><boxGeometry args={[1.05,.25,.42]} /><meshStandardMaterial color="#ededdb" emissive="#e9e9ce" emissiveIntensity={.35} /></mesh>
            </group>))}
          </>}
          {zone.kind === 'terrace' && <><GardenTerrace materials={materials} /><MetalFurniture /></>}
          {zone.kind === 'tennis' && <Tennis width={f.width} texture={texture} />}
          {(zone.kind === 'synthetic' || zone.kind === 'football') && <Football width={f.width} length={f.length} natural={zone.kind === 'football'} texture={texture} />}
        </group>
      </group>
    })}
    {SPORT_STAIRS.map((stair, i) => {
      const dx = stair.bottom[0] - stair.top[0], dy = stair.bottom[1] - stair.top[1], length = Math.hypot(dx, dy)
      const top = sportStairTopHeight(stair)
      const count = Math.max(1, Math.ceil((top - stair.low) / 0.18))
      return <group key={i}>
        {Array.from({ length: count }, (_, j) => {
          const t = (j + 0.5) / count, level = top + (stair.low - top) * t
          return <mesh key={j} position={[stair.top[0] + dx * t, stair.low - 0.1 + (level - stair.low + 0.1) / 2, -stair.top[1] - dy * t]} rotation={[0, Math.atan2(dy, dx), 0]} receiveShadow castShadow>
            <boxGeometry args={[length / count + 0.025, level - stair.low + 0.1, stair.width]} /><meshStandardMaterial color="#b8b2a2" roughness={0.95} />
          </mesh>
        })}
      </group>
    })}
    {[...SPORT_STAIRWAYS, ...SPORT_SEATING].map((run, i) => <StepsAgainstWall key={i} run={run} material={concrete} />)}
    <Railing line={NATURAL_PITCH_RAILING} />
  </group>
}
