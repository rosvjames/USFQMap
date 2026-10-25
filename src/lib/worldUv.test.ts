import { describe, expect, it } from 'vitest'
import { BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Texture, Vector3 } from 'three'
import { boxUv, projectWorldUv } from './worldUv'
import { batchStaticMeshes } from './staticBatch'

const TILE = 2.4
const textured = (normalMap = new Texture(), roughnessMap = new Texture(), map = new Texture()) => {
  const material = new MeshStandardMaterial({ color: '#e4ddc8', map, normalMap, roughnessMap })
  material.userData.worldUv = true
  return material
}

describe('world-metre UVs', () => {
  it('covers every flat face at one tile per 2.4 m, whatever its orientation', () => {
    // Faces within 14 degrees of horizontal are deliberately read as floor, (x, -z), so they are left out of the oblique case.
    for (const rotation of [new Euler(0, 0, 0), new Euler(Math.PI / 4, Math.PI / 3, 0), new Euler(0, Math.PI / 5, 0)]) {
      const matrix = new Matrix4().makeRotationFromEuler(rotation).setPosition(7, 2, -3)
      const box = projectWorldUv(new BoxGeometry(5, 3, .4), matrix)
      const p = box.getAttribute('position'), uv = box.getAttribute('uv')
      const world = (i: number) => new Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix)
      for (let t = 0; t < p.count; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const meters = world(t + a).distanceTo(world(t + b))
        const tiles = Math.hypot(uv.getX(t + a) - uv.getX(t + b), uv.getY(t + a) - uv.getY(t + b))
        expect(meters / tiles).toBeCloseTo(TILE, 4)
      }
    }
  })

  it('keeps a wall continuous across boxes of different lengths, also when the whole wall is rotated', () => {
    const angle = .6, root = new Group(), wall = new Group(), material = textured()
    wall.rotation.y = angle; wall.position.set(4, 0, 9)
    const left = new Mesh(new BoxGeometry(3, 2, .3), material), right = new Mesh(new BoxGeometry(5, 2, .3), material)
    left.position.x = -1.5; right.position.x = 2.5
    wall.add(left, right); root.add(wall)
    const result = batchStaticMeshes(root), geometry = result.batches[0].geometry
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
    const facing = new Vector3(Math.sin(angle), 0, Math.cos(angle)), along = new Vector3(Math.cos(angle), 0, -Math.sin(angle)), origin = new Vector3(4, 0, 9)
    const samples: { s: number; u: number }[] = []
    for (let i = 0; i < p.count; i++) if (new Vector3().fromBufferAttribute(n, i).dot(facing) > .95) {
      samples.push({ s: new Vector3().fromBufferAttribute(p, i).sub(origin).dot(along), u: uv.getX(i) })
    }
    // Front faces of both boxes: 12 vertices, spanning 8 m along the wall, so u must change by distance / 2.4 across the joint.
    expect(samples).toHaveLength(12)
    for (const sample of samples) expect(sample.u - samples[0].u).toBeCloseTo((sample.s - samples[0].s) / TILE, 4)
    result.dispose()
  })

  it('maps floors as (x, -z) in world metres and roofs along their slope', () => {
    const floor = projectWorldUv(new PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new Matrix4().makeTranslation(10, 0, 6))
    const p = floor.getAttribute('position'), uv = floor.getAttribute('uv')
    for (let i = 0; i < p.count; i++) {
      expect(uv.getX(i)).toBeCloseTo((p.getX(i) + 10) / TILE)
      expect(uv.getY(i)).toBeCloseTo(-(p.getZ(i) + 6) / TILE)
    }
    // A 45 degree roof still shows one tile per 2.4 m measured along the slope, not along the ground.
    const roof = projectWorldUv(new PlaneGeometry(4, 4).rotateX(-Math.PI / 4), new Matrix4())
    const rp = roof.getAttribute('position'), ruv = roof.getAttribute('uv')
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
      const meters = new Vector3().fromBufferAttribute(rp, i).distanceTo(new Vector3().fromBufferAttribute(rp, j))
      expect(meters / Math.hypot(ruv.getX(i) - ruv.getX(j), ruv.getY(i) - ruv.getY(j))).toBeCloseTo(TILE, 4)
    }
  })

  it('keeps the own UVs of curved triangles and creates UVs when a geometry has none', () => {
    const column = new CylinderGeometry(.3, .3, 3, 16).toNonIndexed(), uv = column.getAttribute('uv'), before = Array.from(uv.array)
    const sideValues = 16 * 2 * 3 * 2
    projectWorldUv(column, new Matrix4())
    expect(Array.from(uv.array).slice(0, sideValues)).toEqual(before.slice(0, sideValues))
    const bare = new BufferGeometry()
    bare.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
    bare.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
    expect(projectWorldUv(bare, new Matrix4()).getAttribute('uv').count).toBe(3)
  })

  it('writes metres per face for an unbatched box', () => {
    const box = new BoxGeometry(2.4, 4.8, .5)
    boxUv(box)
    const p = box.getAttribute('position'), n = box.getAttribute('normal'), uv = box.getAttribute('uv')
    for (let i = 0; i < p.count; i++) if (Math.abs(n.getZ(i)) > .5) {
      expect(uv.getX(i)).toBeCloseTo(p.getX(i) / TILE)
      expect(uv.getY(i)).toBeCloseTo(p.getY(i) / TILE)
    }
  })
})

describe('batching textured surfaces', () => {
  it('never merges meshes whose normal or roughness images differ, and merges those that share everything', () => {
    const root = new Group(), map = new Texture(), n1 = new Texture(), n2 = new Texture(), r1 = new Texture(), r2 = new Texture()
    const materials = [textured(n1, r1, map), textured(n1, r1, map), textured(n2, r1, map), textured(n1, r2, map)]
    const geometry = new BoxGeometry()
    materials.forEach((material, i) => { const mesh = new Mesh(geometry, material); mesh.position.x = i * 3; root.add(mesh) })
    const result = batchStaticMeshes(root)
    // Identical materials merge; the other two textured meshes are rebuilt on their own, so none shares a batch with a different image.
    expect(result.batches).toHaveLength(3)
    expect(new Set(result.batches.map((batch) => `${(batch.material as MeshStandardMaterial).normalMap!.uuid}|${(batch.material as MeshStandardMaterial).roughnessMap!.uuid}`)).size).toBe(3)
    result.dispose()
  })

  it('rebuilds a lone textured mesh so its UVs follow world metres', () => {
    const root = new Group()
    root.position.set(30, 0, 0)
    root.add(new Mesh(new BoxGeometry(2, 2, .2), textured()))
    root.updateMatrixWorld(true)
    const result = batchStaticMeshes(root)
    expect(result.batches).toHaveLength(1)
    const g = result.batches[0].geometry, p = g.getAttribute('position'), uv = g.getAttribute('uv'), n = g.getAttribute('normal')
    for (let i = 0; i < p.count; i++) if (n.getZ(i) > .5) expect(uv.getX(i)).toBeCloseTo((p.getX(i) + 30) / TILE)
    result.dispose()
  })
})
