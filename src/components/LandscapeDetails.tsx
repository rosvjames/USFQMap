import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { CAMPUS_BOUNDARY } from '../lib/campus'
import { CAMPUS_ELEVATION, cityBaseHeightAt } from '../lib/elevation'
import { campusSlopeOffsetAt } from '../lib/campusSlope'
import { pointInPolygon } from '../lib/geo'
import { palmCrownOffset } from '../lib/campusFoliage'
import { planCampusTrees } from '../lib/campusTrees'
import type { CampusMaterials } from '../lib/materials'
import { TREE_CROWN } from './CampusPlants'

type Instance = { position: [number, number, number]; scale: [number, number, number]; rotation?: number; tone?: string }

// Light multipliers over the natural leaf colour; the one warm tone is the lone autumn tree of the original planting.
const TREE_TONES = ['#bdc9aa', '#c8d1ae', '#b2c29f', '#cbd0a8']
const AUTUMN_TONE = '#d9c3a4'
const PALM_TONES = ['#ffffff', '#ecf2dc', '#f6ffe6']

function setInstances(mesh: InstancedMesh | null, items: Instance[]) {
  if (!mesh) return
  const object = new Object3D(), color = new Color()
  items.forEach((item, i) => {
    object.position.set(...item.position)
    object.scale.set(...item.scale)
    object.rotation.set(0, item.rotation ?? 0, 0)
    object.updateMatrix()
    mesh.setMatrixAt(i, object.matrix)
    if (item.tone) mesh.setColorAt(i, color.set(item.tone))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

/** Open lawns keep clear centers; denser planting follows the satellite's wooded lagoon edge. */
export function LandscapeDetails({ materials }: { materials: CampusMaterials }) {
  const crowns = useRef<InstancedMesh>(null), branches = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null)
  const palmTrunks = useRef<InstancedMesh>(null), palmCrowns = useRef<InstancedMesh>(null)
  const { plants } = materials
  const instances = useMemo(() => {
    const crownItems: Instance[] = [], branchItems: Instance[] = [], trunkItems: Instance[] = [], palmTrunkItems: Instance[] = [], palmCrownItems: Instance[] = []
    for (const [index, tree] of planCampusTrees().entries()) {
      const [x, y] = tree.point, s = tree.size, h = (tree.palm ? 7.4 : 5.5) * s
      const ground = pointInPolygon(tree.point, CAMPUS_BOUNDARY) ? campusSlopeOffsetAt(tree.point) + CAMPUS_ELEVATION : cityBaseHeightAt(tree.point) - .55
      const trunkTop = h + 0.4 + ground
      if (tree.palm) {
        const girth = s * 0.7, yaw = index * 1.3, [dx, dz] = palmCrownOffset(girth, yaw)
        palmTrunkItems.push({ position: [x, h / 2 + 0.4 + ground, -y], scale: [girth, h, girth], rotation: yaw })
        palmCrownItems.push({ position: [x + dx, trunkTop, -y + dz], scale: [s, s, s], rotation: yaw * 1.7 + 1, tone: PALM_TONES[index % 3] })
      } else {
        const tone = tree.tone === 'autumn' ? AUTUMN_TONE : TREE_TONES[tree.tone]
        trunkItems.push({ position: [x, h / 2 + 0.4 + ground, -y], scale: [s, h, s] })
        branchItems.push({ position: [x, trunkTop, -y], scale: [s, s, s], rotation: index * 2.1 })
        // Every tree shares the leaf-card canopy that used to grow only beside Miguel de Santiago.
        crownItems.push({ position: [x, trunkTop + .1, -y], scale: [s * TREE_CROWN, s * TREE_CROWN * .86, s * TREE_CROWN], rotation: index * 1.7, tone })
      }
    }
    return { crownItems, branchItems, trunkItems, palmTrunkItems, palmCrownItems }
  }, [])
  useLayoutEffect(() => {
    setInstances(crowns.current, instances.crownItems)
    setInstances(branches.current, instances.branchItems)
    setInstances(trunks.current, instances.trunkItems)
    setInstances(palmTrunks.current, instances.palmTrunkItems)
    setInstances(palmCrowns.current, instances.palmCrownItems)
  }, [instances])
  return <group>
    <instancedMesh ref={trunks} args={[plants.trunk, materials.bark, instances.trunkItems.length]} castShadow receiveShadow raycast={() => null} />
    <instancedMesh ref={branches} args={[plants.branches, materials.bark, instances.branchItems.length]} castShadow raycast={() => null} />
    <instancedMesh ref={crowns} args={[plants.canopy, materials.leaf(), instances.crownItems.length]} castShadow receiveShadow raycast={() => null} />
    <instancedMesh ref={palmTrunks} args={[plants.palmTrunk, materials.palmBark, instances.palmTrunkItems.length]} castShadow receiveShadow raycast={() => null} />
    <instancedMesh ref={palmCrowns} args={[plants.palmCrown, materials.leaf('#ffffff', 'palm'), instances.palmCrownItems.length]} castShadow receiveShadow raycast={() => null} />
  </group>
}
