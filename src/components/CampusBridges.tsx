import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { ELEVATED_WALKWAYS, bridgeVertexHeight, PATH_LEVEL } from '../lib/terrain'
import { MapLabel } from './MapLabel'

type Point = [number, number, number]
const bridgeJunctions = (() => {
  const ends = new Map<string, number>()
  for (const way of ELEVATED_WALKWAYS) for (let i = 1; i < way.line.length; i++) {
    for (const point of [way.line[i - 1], way.line[i]]) {
      const key = point.join(',')
      ends.set(key, (ends.get(key) ?? 0) + 1)
    }
  }
  return new Set([...ends].filter(([, degree]) => degree > 2).map(([key]) => key))
})()

function Beam({ a, b, width, depth, color }: { a: Point; b: Point; width: number; depth: number; color: string }) {
  const { length, quaternion } = useMemo(() => {
    const delta = new Vector3(...b).sub(new Vector3(...a))
    return { length: delta.length(), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), delta.normalize()) }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={quaternion} castShadow receiveShadow>
    <boxGeometry args={[width, depth, length]} /><meshStandardMaterial color={color} roughness={0.65} metalness={color === '#6a7471' ? 0.55 : 0} />
  </mesh>
}

export function CampusBridges({ names }: { names: boolean }) {
  return <group>
    {ELEVATED_WALKWAYS.map((way) => <group key={way.osmId}>
      {way.line.slice(1).map((b, i) => {
        const a = way.line[i], ah = bridgeVertexHeight(way, i), bh = bridgeVertexHeight(way, i + 1)
        const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy), width = Math.max(way.width, 2.8)
        const nx = dy / length, nz = dx / length, count = Math.ceil(length / 2)
        // Leave the shared junction open instead of placing a ramp's rail across the main deck.
        const railStart = bridgeJunctions.has(a.join(',')) ? Math.min(0.4, width / length) : 0
        const railEnd = bridgeJunctions.has(b.join(',')) ? 1 - Math.min(0.4, width / length) : 1
        const point = (t: number, offset = 0, rise = 0): Point => [a[0] + dx * t + nx * offset, ah + (bh - ah) * t + rise, -a[1] - dy * t + nz * offset]
        return <group key={i}>
          <Beam a={point(0, 0, -0.15)} b={point(1, 0, -0.15)} width={width} depth={0.3} color="#aaa89a" />
          <Beam a={point(0, 0, -0.48)} b={point(1, 0, -0.48)} width={0.55} depth={0.4} color="#6a7471" />
          {[-1, 1].map((side) => <group key={side}>
            {[0.5, 1.15].map((rise) => <Beam key={rise} a={point(railStart, side * width / 2, rise)} b={point(railEnd, side * width / 2, rise)} width={0.065} depth={0.065} color="#6a7471" />)}
            {Array.from({ length: count + 1 }, (_, j) => j / count >= railStart && j / count <= railEnd && <Beam key={j} a={point(j / count, side * width / 2)} b={point(j / count, side * width / 2, 1.2)} width={0.07} depth={0.07} color="#6a7471" />)}
          </group>)}
          {length > 25 && [0.15, 0.85].map((t) => {
            const p = point(t), height = Math.max(0, p[1] - PATH_LEVEL - 0.35)
            return <mesh key={t} position={[p[0], PATH_LEVEL + height / 2, p[2]]} castShadow receiveShadow><cylinderGeometry args={[0.45, 0.6, height, 10]} /><meshStandardMaterial color="#a7a498" roughness={0.95} /></mesh>
          })}
        </group>
      })}
    </group>)}
    {names && <MapLabel text="Puente a Hayek" position={[-17.46, 8.1, 182.46]} variant="tag" />}
  </group>
}
