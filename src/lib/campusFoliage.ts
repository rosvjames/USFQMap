import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, PlaneGeometry, Quaternion, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createMiguelCanopy } from './miguelFoliage'

/**
 * Metres covered by one repeat of the bark images (see the manifest): 1.2 m around, 2.4 m up.
 * The trunk UVs are written in those tiles, so unlike walls they do not take the world projection.
 */
const BARK_TILE: [number, number] = [1.2, 2.4]

/**
 * palm-frond.webp is square with the rachis along the middle, running from the base at u = 0 to the tip at u = 1, and the
 * leaflets filling about 60% of V. Flip here if the art changes.
 */
export const PALM_FROND = {
  /** Rachis length and half the card width, metres at scale 1; the blade itself is about 60% of the card's width. */
  length: 3.9,
  halfWidth: 1.3,
  /** Arch at mid-length and droop at the tip, metres: the rachis rises, then bows toward the ground. */
  arch: .85,
  droop: 1.55,
  /** How far the leaflet edges fold below the rachis per metre of distance from it, giving the blade a V section. */
  fold: .3,
  rows: 10,
}

/** Horizontal lean of a palm trunk at its crown, as a fraction of the trunk's own radius scale. */
export const PALM_LEAN = .5

function seeded(seed: number) {
  let value = seed
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296 }
}

/** Intersecting leaf cards inside a unit sphere: they keep their volume from any orbit angle. */
export function createLeafVolume(options: { cards: number; seed: number; size: [number, number]; flatten?: number; spread?: [number, number] }) {
  const { cards: count, seed, size, flatten = .82, spread = [.65, .93] } = options
  const random = seeded(seed)
  const cards = Array.from({ length: count }, (_, i) => {
    const angle = i * 2.39996, y = 1 - 2 * (i + .5) / count, radius = Math.sqrt(1 - y * y) * (spread[0] + random() * (spread[1] - spread[0]))
    const card = new PlaneGeometry(size[0] + random() * size[1], size[0] + random() * size[1])
    card.rotateX(random() * Math.PI).rotateY(angle).rotateZ(random() * Math.PI)
    card.translate(Math.cos(angle) * radius, y * flatten, Math.sin(angle) * radius)
    return card
  })
  const volume = mergeGeometries(cards)!
  cards.forEach((card) => card.dispose())
  return volume
}

/** Rescales a cylinder-like geometry's UVs from 0..1 to bark tiles. */
function barkUv(geometry: BufferGeometry, circumference: number, length: number) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circumference / BARK_TILE[0], uv.getY(i) * length / BARK_TILE[1])
}

/**
 * Four to five limbs that leave the trunk top and reach into the crown, so the branching stays visible through the leaves.
 * The origin is the trunk top; instance it with the tree's uniform scale.
 */
export function createBranchGeometry() {
  const random = seeded(77)
  const limbs = Array.from({ length: 5 }, (_, i) => {
    const angle = i * 2.4 + random() * .4, reach = .85 + random() * .55, rise = .7 + random() * .9
    const direction = new Vector3(Math.cos(angle) * reach, rise, Math.sin(angle) * reach)
    const length = direction.length() + .3
    const limb = new CylinderGeometry(.035, .09, length, 5, 1, true)
    barkUv(limb, .45, length)
    // Cylinders stand along +Y with their middle at the origin; the base sinks a little into the trunk.
    limb.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()))
    const start = direction.clone().normalize().multiplyScalar(length / 2 - .3)
    limb.translate(start.x, start.y - .2, start.z)
    return limb
  })
  const branches = mergeGeometries(limbs)!
  limbs.forEach((limb) => limb.dispose())
  return branches
}

/**
 * Unit-height trunk centred on the origin (y from -.5 to .5); instance scale gives height and girth.
 * Radii are those of the earlier cylinders (top .16, bottom .26), with a root flare and optional lean at the top.
 */
export function createTrunkGeometry(options: { top: number; bottom: number; lean?: number; vRepeat: number; segments?: number; rings?: number }) {
  const { top, bottom, lean = 0, vRepeat, segments = 9, rings = 6 } = options
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, flare = 1 + .4 * (1 - Math.min(1, t / .1)) ** 2
    const radius = (bottom + (top - bottom) * t) * flare, shift = lean * t * t
    for (let s = 0; s <= segments; s++) {
      const angle = s / segments * Math.PI * 2, c = Math.cos(angle), n = Math.sin(angle)
      positions.push(c * radius + shift, t - .5, n * radius)
      normals.push(c, 0, n)
      uvs.push(s / segments, t * vRepeat)
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < segments; s++) {
    const a = r * (segments + 1) + s, b = a + segments + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/** Horizontal offset of the crown of a palm built with createTrunkGeometry({ lean: PALM_LEAN }), for an instance yaw and radius scale. */
export function palmCrownOffset(radiusScale: number, yaw: number): [number, number] {
  const lean = PALM_LEAN * radiusScale
  // Rotation about +Y by yaw maps +X to (cos yaw, 0, -sin yaw).
  return [Math.cos(yaw) * lean, -Math.sin(yaw) * lean]
}

/** One pinnate frond: an arched rachis with a V-shaped blade. The origin is its base; it points along +X. */
export function createFrondGeometry() {
  const { length, halfWidth, arch, droop, fold, rows } = PALM_FROND
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let r = 0; r <= rows; r++) {
    const t = r / rows, x = t * length, y = Math.sin(t * Math.PI * .55) * arch - t * t * droop
    for (const side of [-1, 0, 1]) {
      positions.push(x, y - Math.abs(side * halfWidth) * fold, side * halfWidth)
      uvs.push(t, (side + 1) / 2)
    }
  }
  for (let r = 0; r < rows; r++) for (let s = 0; s < 2; s++) {
    const a = r * 3 + s, b = a + 3
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Two radial rings of fronds that leave the same bud at the trunk top: ten long, arched, drooping fronds evenly spread
 * over 360 degrees, and seven shorter ones between them, rising a little at the heart. Pitch and size depend only on the
 * ring, plus a small jitter that is independent of azimuth, so no sector is higher than the opposite one (no helix).
 * One draw call per palm.
 */
export const PALM_RINGS = [
  { count: 10, size: 1, pitch: .12, phase: 0 },
  { count: 7, size: .62, pitch: .6, phase: .5 },
] as const
/**
 * Height of the common root of every frond relative to the trunk top. Negative: the image has a transparent margin
 * before the rachis starts, so the root sinks a few centimetres into the trunk end and no gap of air shows.
 */
export const PALM_CROWN_ROOT = -.08
export function createPalmCrownGeometry() {
  const random = seeded(1291)
  const fronds = PALM_RINGS.flatMap(({ count, size, pitch, phase }) => Array.from({ length: count }, (_, i) => {
    const frond = createFrondGeometry(), scale = size * (.96 + random() * .08)
    frond.scale(scale, scale, scale)
    frond.rotateZ(pitch + (random() - .5) * .1)
    frond.rotateY((i + phase) * Math.PI * 2 / count + (random() - .5) * .16)
    frond.translate(0, PALM_CROWN_ROOT, 0)
    return frond
  }))
  const crown = mergeGeometries(fronds)!
  fronds.forEach((frond) => frond.dispose())
  return crown
}

export interface PlantGeometry {
  canopy: BufferGeometry
  bush: BufferGeometry
  branches: BufferGeometry
  trunk: BufferGeometry
  palmTrunk: BufferGeometry
  palmCrown: BufferGeometry
  dispose: () => void
}

/** Shared by every tree and palm of the campus; materials come from createCampusMaterials. */
export function createPlantGeometry(): PlantGeometry {
  const geometries = {
    canopy: createMiguelCanopy(),
    bush: createLeafVolume({ cards: 28, seed: 523, size: [.3, .3], flatten: .6 }),
    branches: createBranchGeometry(),
    trunk: createTrunkGeometry({ top: .16, bottom: .26, vRepeat: 2.3 }),
    palmTrunk: createTrunkGeometry({ top: .15, bottom: .24, lean: PALM_LEAN, vRepeat: 3.1 }),
    palmCrown: createPalmCrownGeometry(),
  }
  return { ...geometries, dispose: () => Object.values(geometries).forEach((geometry) => geometry.dispose()) }
}
