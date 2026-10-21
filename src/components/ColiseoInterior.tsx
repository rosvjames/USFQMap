import { useEffect, useMemo } from 'react'
import { DoubleSide, MeshStandardMaterial } from 'three'
import { BASKETBALL, COLISEO as hall, COLISEO_STAIR as stair, COLISEO_STANDS as stands, COLISEO_WALLS, VOLLEYBALL, wallPieces, type Court } from '../lib/coliseoInterior'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'

type Point = [number, number, number]
const noRaycast = () => null
const LINE = 0.08
// Plan frame (x east, y north, height above the floor) -> the group's three.js frame.
const at = (x: number, y: number, height = 0): Point => [x, hall.floor + height, -y]

function Block({ at: position, size, material, shadow = true }: { at: Point; size: Point; material: MeshStandardMaterial; shadow?: boolean }) {
  return <mesh position={position} material={material} castShadow={shadow} receiveShadow raycast={noRaycast}><boxGeometry args={size} /></mesh>
}

/** Painted rectangle outline, lying on the floor. */
function Outline({ center, length, width, material }: { center: Vec2; length: number; width: number; material: MeshStandardMaterial }) {
  const [x, y] = center
  return <group>
    {[-1, 1].map((side) => <Block key={`l${side}`} at={at(x, y + side * width / 2, 0.02)} size={[length + LINE, 0.02, LINE]} material={material} shadow={false} />)}
    {[-1, 1].map((side) => <Block key={`w${side}`} at={at(x + side * length / 2, y, 0.02)} size={[LINE, 0.02, width]} material={material} shadow={false} />)}
  </group>
}

function BasketballCourt({ court, finishes }: { court: Court; finishes: Finishes }) {
  const [x, y] = court.center
  return <group>
    <Outline {...court} material={finishes.line} />
    <Block at={at(x, y, 0.02)} size={[LINE, 0.02, court.width]} material={finishes.line} shadow={false} />
    <mesh position={at(x, y, 0.03)} rotation={[-Math.PI / 2, 0, 0]} material={finishes.line} raycast={noRaycast}><ringGeometry args={[1.8 - LINE, 1.8, 40]} /></mesh>
    {[-1, 1].map((end) => {
      const baseline = x + end * court.length / 2
      return <group key={end}>
        <Block at={at(baseline - end * 2.9, y, 0.015)} size={[5.8, 0.02, 4.9]} material={finishes.key} shadow={false} />
        {/* Three-point arc, open towards the centre line. */}
        <mesh position={at(baseline - end * 1.575, y, 0.03)} rotation={[-Math.PI / 2, 0, end > 0 ? Math.PI / 2 : -Math.PI / 2]} material={finishes.line} raycast={noRaycast}><ringGeometry args={[6.75 - LINE, 6.75, 40, 1, 0, Math.PI]} /></mesh>
        <Block at={at(baseline + end * 0.9, y, 1.55)} size={[0.16, 3.1, 0.16]} material={finishes.steel} />
        <Block at={at(baseline - end * 0.15, y, 3.1)} size={[2.2, 0.12, 0.12]} material={finishes.steel} />
        <Block at={at(baseline - end * 1.2, y, 3.3)} size={[0.05, 1.05, 1.8]} material={finishes.board} />
        <mesh position={at(baseline - end * 1.5, y, 3.05)} rotation={[Math.PI / 2, 0, 0]} material={finishes.rim} raycast={noRaycast}><torusGeometry args={[0.23, 0.025, 8, 24]} /></mesh>
      </group>
    })}
  </group>
}

function VolleyballCourt({ court, finishes }: { court: Court; finishes: Finishes }) {
  const [x, y] = court.center
  return <group>
    <Block at={at(x, y, 0.012)} size={[court.length, 0.02, court.width]} material={finishes.volley} shadow={false} />
    <Outline {...court} material={finishes.line} />
    {[-3, 0, 3].map((offset) => <Block key={offset} at={at(x + offset, y, 0.025)} size={[LINE, 0.02, court.width]} material={finishes.line} shadow={false} />)}
    {[-1, 1].map((side) => <Block key={side} at={at(x, y + side * (court.width / 2 + 0.8), 1.28)} size={[0.1, 2.55, 0.1]} material={finishes.steel} />)}
    <Block at={at(x, y, 1.95)} size={[0.03, 1, court.width + 1.6]} material={finishes.net} shadow={false} />
  </group>
}

type Finishes = ReturnType<typeof createFinishes>
function createFinishes(materials: CampusMaterials) {
  return {
    wood: new MeshStandardMaterial({ color: '#cfa468', roughness: 0.55 }),
    tile: new MeshStandardMaterial({ color: '#c9cdc6', roughness: 0.8 }),
    partition: new MeshStandardMaterial({ color: '#efe9dc', roughness: 0.9 }),
    line: new MeshStandardMaterial({ color: '#fbfaf3', roughness: 0.6, side: DoubleSide }),
    key: new MeshStandardMaterial({ color: '#b8463a', roughness: 0.6 }),
    volley: new MeshStandardMaterial({ color: '#4f8f8c', roughness: 0.6 }),
    concrete: new MeshStandardMaterial({ color: '#b9b5a8', roughness: 0.95 }),
    steel: new MeshStandardMaterial({ color: '#4c5553', roughness: 0.5, metalness: 0.5 }),
    board: new MeshStandardMaterial({ color: '#f4f6f3', roughness: 0.3, transparent: true, opacity: 0.85, envMap: materials.environment }),
    rim: new MeshStandardMaterial({ color: '#d9622b', roughness: 0.5 }),
    net: new MeshStandardMaterial({ color: '#f4f4ee', transparent: true, opacity: 0.45, side: DoubleSide }),
  }
}

/** Roofless ground floor of the Coliseo: walls cut low so the courts and rooms read from above. */
export function ColiseoInterior({ materials }: { materials: CampusMaterials }) {
  const finishes = useMemo(() => createFinishes(materials), [materials])
  useEffect(() => () => Object.values(finishes).forEach((material) => material.dispose()), [finishes])
  const walls = useMemo(() => COLISEO_WALLS.flatMap((wall, index) => {
    const dx = wall.to[0] - wall.from[0], dy = wall.to[1] - wall.from[1], length = Math.hypot(dx, dy)
    return wallPieces(wall).map(([start, end]) => {
      const middle = (start + end) / 2 / length
      return { key: `${index}-${start}`, outer: !!wall.outer, length: end - start, angle: Math.atan2(dy, dx), x: wall.from[0] + dx * middle, y: wall.from[1] + dy * middle }
    })
  }), [])
  const serviceCenter = hall.service / 2, hallCenter = (hall.service + hall.width) / 2
  const slab = hall.floor + hall.footing
  return <group position={[hall.origin[0], 0, -hall.origin[1]]} rotation={[0, hall.angle, 0]}>
    <Block at={[serviceCenter, hall.floor - slab / 2, -hall.depth / 2]} size={[hall.service, slab, hall.depth]} material={finishes.tile} shadow={false} />
    <Block at={[hallCenter, hall.floor - slab / 2, -hall.depth / 2]} size={[hall.width - hall.service, slab, hall.depth]} material={finishes.wood} shadow={false} />

    {walls.map((wall) => {
      const height = wall.outer ? hall.outerWall + slab : hall.innerWall
      return <mesh key={wall.key} position={at(wall.x, wall.y, wall.outer ? (hall.outerWall - slab) / 2 : height / 2)} rotation={[0, wall.angle, 0]} material={wall.outer ? materials.stucco : finishes.partition} castShadow receiveShadow raycast={noRaycast}>
        <boxGeometry args={[wall.length + (wall.outer ? 0.3 : 0), height, wall.outer ? 0.3 : 0.14]} />
      </mesh>
    })}

    <BasketballCourt court={BASKETBALL} finishes={finishes} />
    <VolleyballCourt court={VOLLEYBALL} finishes={finishes} />

    {/* Stand rising towards the south wall. */}
    {Array.from({ length: stands.tiers }, (_, tier) => {
      const rise = stands.riser * (stands.tiers - tier)
      return <Block key={tier} at={at((stands.from + stands.to) / 2, 0.3 + stands.tread * (tier + 0.5), rise / 2)} size={[stands.to - stands.from, rise, stands.tread]} material={finishes.concrete} />
    })}
    {/* Stair to the upper level, climbing east along the south wall. */}
    {Array.from({ length: stair.steps }, (_, step) => {
      const run = (stair.to - stair.from) / stair.steps, rise = stair.riser * (step + 1)
      return <Block key={step} at={at(stair.from + run * (step + 0.5), 0.3 + stair.depth / 2, rise / 2)} size={[run, rise, stair.depth]} material={finishes.concrete} />
    })}
  </group>
}
