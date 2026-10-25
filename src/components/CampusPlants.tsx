import type { CampusMaterials } from '../lib/materials'
import { palmCrownOffset } from '../lib/campusFoliage'

type Vec3 = [number, number, number]
const noRaycast = () => null

/** Radius of the old leaf-blob crowns, which the leaf-card canopy keeps (metres at scale 1). */
export const TREE_CROWN = 2.4

/**
 * A single tree from the shared geometry: bark trunk, limbs that reach into the crown and a volume of crossed leaf cards.
 * `height` is the trunk, `girth` scales its radii (1 = .16 m at the top, .26 m at the base), `crown` is the crown radius.
 * Three draw calls per tree; large plantings use the instanced groves in LandscapeDetails instead.
 */
export function Tree({ materials, position = [0, 0, 0], height = 5.2, girth = 1, crown = TREE_CROWN, rotation = 0, tone = '#bdc9aa' }: {
  materials: CampusMaterials; position?: Vec3; height?: number; girth?: number; crown?: number; rotation?: number; tone?: string
}) {
  const k = crown / TREE_CROWN
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh geometry={materials.plants.trunk} material={materials.bark} position={[0, height / 2, 0]} scale={[girth, height, girth]} castShadow raycast={noRaycast} />
    <mesh geometry={materials.plants.branches} material={materials.bark} position={[0, height, 0]} scale={k} castShadow raycast={noRaycast} />
    <mesh geometry={materials.plants.canopy} material={materials.leaf(tone)} position={[0, height + .1, 0]} scale={[crown, crown * .86, crown]} rotation={[0, rotation * 1.7, 0]} castShadow receiveShadow raycast={noRaycast} />
  </group>
}

/** A palm: gently leaning, ringed trunk and one crown of twelve fronds with transparent leaflets. */
export function Palm({ materials, position = [0, 0, 0], height = 6, girth = 1, crown = 1, yaw = 0, tone = '#ffffff' }: {
  materials: CampusMaterials; position?: Vec3; height?: number; girth?: number; crown?: number; yaw?: number; tone?: string
}) {
  const [dx, dz] = palmCrownOffset(girth, yaw)
  return <group position={position}>
    <mesh geometry={materials.plants.palmTrunk} material={materials.palmBark} position={[0, height / 2, 0]} scale={[girth, height, girth]} rotation={[0, yaw, 0]} castShadow raycast={noRaycast} />
    <mesh geometry={materials.plants.palmCrown} material={materials.leaf(tone, 'palm')} position={[dx, height, dz]} scale={crown} rotation={[0, yaw * 1.7 + 1, 0]} castShadow receiveShadow raycast={noRaycast} />
  </group>
}

/** A low leafy mass for hedges and shrubs, from the same cards as the crowns. */
export function Bush({ materials, position = [0, 0, 0], scale = [1, 1, 1], rotation = 0, tone = '#d3dba6' }: {
  materials: CampusMaterials; position?: Vec3; scale?: Vec3 | number; rotation?: number; tone?: string
}) {
  return <mesh geometry={materials.plants.bush} material={materials.leaf(tone)} position={position} scale={scale} rotation={[0, rotation, 0]} castShadow receiveShadow raycast={noRaycast} />
}
