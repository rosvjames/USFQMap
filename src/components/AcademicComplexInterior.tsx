import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, ExtrudeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Shape, Vector2 } from 'three'
import { ACADEMIC_COMPLEX_FLOORS } from '../data/academicComplexWalls'
import { ACADEMIC_COMPLEX as complex, complexFloorElevation } from '../lib/academicComplex'
import type { CampusMaterials } from '../lib/materials'
import type { Vec2 } from '../types'

const noRaycast = () => null
/** Floor 1 continues this far down so the plate stays closed where the lawn falls away. */
const FOOTING = 2.5
const SLAB = 0.25

function plate(ring: Vec2[], depth: number) {
  return new ExtrudeGeometry(new Shape(ring.map(([x, y]) => new Vector2(x, y))), { depth, bevelEnabled: false })
}

function Walls({ floor, material }: { floor: number; material: MeshStandardMaterial }) {
  const walls = ACADEMIC_COMPLEX_FLOORS[floor].walls
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => {
    const dummy = new Object3D(), base = complexFloorElevation(floor)
    walls.forEach(([x0, y0, x1, y1, thickness], index) => {
      const dx = x1 - x0, dy = y1 - y0
      dummy.position.set((x0 + x1) / 2, base + complex.wall / 2, -(y0 + y1) / 2)
      dummy.rotation.set(0, Math.atan2(dy, dx), 0)
      // Overlap the ends by a wall thickness so corners close.
      dummy.scale.set(Math.hypot(dx, dy) + thickness, complex.wall, thickness)
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(index, dummy.matrix)
    })
    mesh.current!.instanceMatrix.needsUpdate = true
    mesh.current!.computeBoundingSphere()
  }, [floor, walls])
  return <instancedMesh key={floor} ref={mesh} args={[geometry, material, walls.length]} castShadow receiveShadow raycast={noRaycast} />
}

/** Roofless cut through the Galileo–Einstein–Darwin–Newton complex at `floor`, over the floors below. */
export function AcademicComplexInterior({ materials, floor }: { materials: CampusMaterials; floor: number }) {
  const finishes = useMemo(() => ({
    floor: new MeshStandardMaterial({ color: '#e6ddcd', roughness: 0.85 }),
    partition: new MeshStandardMaterial({ color: '#f3eee4', roughness: 0.9 }),
  }), [])
  useEffect(() => () => Object.values(finishes).forEach((material) => material.dispose()), [finishes])

  const pieces = useMemo(() => complex.floors.filter((level) => level <= floor).flatMap((level) =>
    ACADEMIC_COMPLEX_FLOORS[level].slabs.map((ring, index) => {
      const base = complexFloorElevation(level) - (level === 1 ? FOOTING : SLAB)
      // Floors below the cut are solid storeys up to the next plate; the cut floor is just its plate.
      const below = level < floor
      const top = below ? complexFloorElevation(level + 1) - SLAB : complexFloorElevation(level)
      return { key: `${level}-${index}`, below, base, geometry: plate(ring, top - base) }
    })), [floor])
  useEffect(() => () => pieces.forEach((piece) => piece.geometry.dispose()), [pieces])

  return <group>
    {pieces.map((piece) => <mesh key={piece.key} geometry={piece.geometry} position={[0, piece.base, 0]} rotation={[-Math.PI / 2, 0, 0]} material={piece.below ? materials.stucco : finishes.floor} castShadow receiveShadow raycast={noRaycast} />)}
    <Walls floor={floor} material={finishes.partition} />
  </group>
}
