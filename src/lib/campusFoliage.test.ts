import { describe, expect, it } from 'vitest'
import { type BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { PALM_CROWN_ROOT, PALM_FROND, PALM_LEAN, PALM_RINGS, createBranchGeometry, createFrondGeometry, createPalmCrownGeometry, createPlantGeometry, createTrunkGeometry, palmCrownOffset } from './campusFoliage'

const finite = (geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } }) =>
  ['position', 'normal', 'uv'].every((name) => Array.from(geometry.getAttribute(name).array).every(Number.isFinite))

/**
 * Measures how evenly a crown is spread. `helix` is the first azimuthal harmonic of height, so a crown that rises on one
 * side and falls on the other scores high; `sectorSpread` is the range of mean rim heights over eight sectors and
 * `countRatio` the weakest sector's share of rim vertices against the strongest.
 */
function crownBalance(geometry: BufferGeometry) {
  const p = geometry.getAttribute('position'), sectors = 8
  let reach = 0, cos = 0, sin = 0, n = 0, base = 0, baseCount = 0, rim = 0, rimCount = 0, heart = 0, heartCount = 0
  const sum: number[] = Array(sectors).fill(0), count: number[] = Array(sectors).fill(0)
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i)), y = p.getY(i), angle = Math.atan2(p.getZ(i), p.getX(i))
    reach = Math.max(reach, r)
    if (r < .01) { base += y; baseCount++; continue }
    cos += y * Math.cos(angle); sin += y * Math.sin(angle); n++
    if (r > 2.8) {
      const sector = Math.min(sectors - 1, Math.floor((angle + Math.PI) / (2 * Math.PI) * sectors))
      sum[sector] += y; count[sector]++; rim += y; rimCount++
    } else if (r > 1 && r < 2.2) { heart += y; heartCount++ }
  }
  const means = sum.map((total, i) => count[i] ? total / count[i] : NaN).filter(Number.isFinite)
  return {
    reach, baseHeight: base / baseCount, rimHeight: rim / rimCount, heartHeight: heart / heartCount,
    helix: Math.hypot(cos, sin) / n / (PALM_FROND.arch + PALM_FROND.droop),
    sectorSpread: means.length < sectors ? Infinity : Math.max(...means) - Math.min(...means),
    countRatio: Math.min(...count) / Math.max(...count),
  }
}

describe('campus foliage geometry', () => {
  it('gives every plant a shared, finite geometry and releases it together', () => {
    const plants = createPlantGeometry()
    for (const geometry of [plants.canopy, plants.bush, plants.branches, plants.trunk, plants.palmTrunk, plants.palmCrown]) {
      expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
      expect(finite(geometry as never)).toBe(true)
    }
    plants.dispose()
  })

  it('builds a frond as an arched, V-sectioned blade that droops at the tip and spreads its leaflets below the rachis', () => {
    const frond = createFrondGeometry(), p = frond.getAttribute('position'), uv = frond.getAttribute('uv')
    let tip = -Infinity, base = Infinity, widest = 0, edgeY = 0, centerY = 0
    for (let i = 0; i < p.count; i++) {
      expect(p.getX(i)).toBeGreaterThanOrEqual(0)
      expect(p.getX(i)).toBeLessThanOrEqual(PALM_FROND.length + 1e-6)
      widest = Math.max(widest, Math.abs(p.getZ(i)))
      if (uv.getX(i) === 1 && uv.getY(i) === .5) tip = p.getY(i)
      if (uv.getX(i) === 0 && uv.getY(i) === .5) base = p.getY(i)
      if (uv.getX(i) === .5 && uv.getY(i) === 0) edgeY = p.getY(i)
      if (uv.getX(i) === .5 && uv.getY(i) === .5) centerY = p.getY(i)
    }
    expect(widest).toBeCloseTo(PALM_FROND.halfWidth)
    expect(tip).toBeLessThan(base)
    expect(edgeY).toBeLessThan(centerY)
    expect(uv.count).toBe(p.count)
  })

  it('builds a radial palm crown: balanced over 360 degrees, drooping at the rim, with no helix', () => {
    const crown = createPalmCrownGeometry(), mesh = new Mesh(crown, new MeshBasicMaterial({ side: DoubleSide }))
    mesh.updateMatrixWorld()
    const rays: [Vector3, Vector3][] = [[new Vector3(.9, 6, .6), new Vector3(0, -1, 0)]]
    for (let k = 0; k < 4; k++) rays.push([new Vector3(Math.cos(k * 1.57) * 6, .3, Math.sin(k * 1.57) * 6), new Vector3(-Math.cos(k * 1.57), 0, -Math.sin(k * 1.57))])
    for (const [from, direction] of rays) expect(new Raycaster(from, direction).intersectObject(mesh).length, from.toArray().join()).toBeGreaterThan(0)
    const balance = crownBalance(crown)
    expect(balance.reach).toBeLessThan(4.5)
    expect(balance.reach).toBeGreaterThan(3)
    expect(balance.helix).toBeLessThan(.12)
    expect(balance.sectorSpread).toBeLessThan(.3)
    expect(balance.countRatio).toBeGreaterThan(.7)
    // The outer ends hang below the bud, the heart stands above them, and every frond starts at the same bud.
    expect(balance.rimHeight).toBeLessThan(0)
    expect(balance.heartHeight).toBeGreaterThan(balance.rimHeight + .4)
    // Every frond shares one root, sunk into the trunk end (the crown is placed at the trunk top) so no air shows between them.
    expect(balance.baseHeight).toBeCloseTo(PALM_CROWN_ROOT)
    expect(balance.baseHeight).toBeLessThan(0)
    expect(balance.baseHeight).toBeGreaterThan(-.3)
    expect(crown.getAttribute('position').count).toBeLessThan(PALM_RINGS.reduce((n, ring) => n + ring.count, 0) * 40)
    crown.dispose()
  })

  it('detects the original helical crown, whose pitch climbed with azimuth, as unbalanced', () => {
    const pitches = [.8, .72, .5, .45, .4, .2, .15, .1, -.05, -.12, -.2, -.3]
    const fronds = pitches.map((pitch, i) => {
      const frond = createFrondGeometry()
      frond.rotateZ(pitch); frond.rotateY(i * Math.PI * 2 / pitches.length); frond.translate(0, .12 + (i % 3) * .06, 0)
      return frond
    })
    const helix = mergeGeometries(fronds)!, balance = crownBalance(helix)
    // Both the azimuthal harmonic and the sector spread flag it (about .14 and 2.9 m against .005 and .13 m for the radial crown).
    expect(balance.helix).toBeGreaterThan(.12)
    expect(balance.sectorSpread).toBeGreaterThan(.3)
    expect(balance.rimHeight).toBeGreaterThan(0)
    helix.dispose()
  })

  it('puts the crown exactly where the leaning trunk ends, for any yaw and trunk width', () => {
    const trunk = createTrunkGeometry({ top: .15, bottom: .24, lean: PALM_LEAN, vRepeat: 3 }), p = trunk.getAttribute('position'), uv = trunk.getAttribute('uv')
    let topX = 0, count = 0
    // The ring centre is the mean of its distinct vertices (the seam vertex repeats at u = 1); scaled by the radius and rotated by yaw, it is the crown offset.
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - .5) < 1e-9 && uv.getX(i) < 1) { topX += p.getX(i); count++ }
    for (const [radius, yaw] of [[1, 0], [.7, 1.3], [1.4, 4.1]]) {
      const local = new Vector3(topX / count * radius, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), yaw)
      const [dx, dz] = palmCrownOffset(radius, yaw)
      expect(dx).toBeCloseTo(local.x, 5)
      expect(dz).toBeCloseTo(local.z, 5)
    }
    trunk.dispose()
  })

  it('makes trunks of unit height with the original radii, tiling the bark texture instead of stretching it', () => {
    const trunk = createTrunkGeometry({ top: .16, bottom: .26, vRepeat: 2.3 })
    trunk.computeBoundingBox()
    expect(trunk.boundingBox!.min.y).toBeCloseTo(-.5)
    expect(trunk.boundingBox!.max.y).toBeCloseTo(.5)
    const p = trunk.getAttribute('position'), uv = trunk.getAttribute('uv')
    let topRadius = 0, bottomRadius = 0, maxV = 0
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i))
      if (p.getY(i) > .49) topRadius = Math.max(topRadius, r)
      if (p.getY(i) < -.49) bottomRadius = Math.max(bottomRadius, r)
      maxV = Math.max(maxV, uv.getY(i))
    }
    expect(topRadius).toBeCloseTo(.16)
    // The root flare widens the very base beyond .26; it stays within a modest bulge.
    expect(bottomRadius).toBeGreaterThanOrEqual(.26)
    expect(bottomRadius).toBeLessThan(.26 * 1.5)
    expect(maxV).toBeCloseTo(2.3)
    trunk.dispose()
  })

  it('keeps tree limbs attached to the trunk top and reaching into the crown', () => {
    const branches = createBranchGeometry(), p = branches.getAttribute('position')
    let lowest = Infinity, highest = -Infinity, reach = 0
    for (let i = 0; i < p.count; i++) { lowest = Math.min(lowest, p.getY(i)); highest = Math.max(highest, p.getY(i)); reach = Math.max(reach, Math.hypot(p.getX(i), p.getZ(i))) }
    expect(lowest).toBeLessThan(0)
    expect(lowest).toBeGreaterThan(-.6)
    expect(highest).toBeGreaterThan(.7)
    expect(reach).toBeGreaterThan(.8)
    expect(reach).toBeLessThan(2.2)
    branches.dispose()
  })
})
