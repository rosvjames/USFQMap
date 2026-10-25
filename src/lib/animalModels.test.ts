import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { MeshStandardMaterial, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { animalModelUrl, createAnimalInstance } from './animalModels'

const asset = (file: string) => new URL(`../../public/models/animals/${file}`, import.meta.url)

// Decode the actual shipped rig in Node, without requiring an image decoder or a WebGL context.
async function load(file: string) {
  const bytes = await readFile(asset(file)), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const jsonLength = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)))
  const image = json.images[0].uri as string
  expect((await readFile(asset(image))).length).toBeGreaterThan(1000)
  for (const material of json.materials) delete material.pbrMetallicRoughness.baseColorTexture
  delete json.images; delete json.textures; delete json.extensionsRequired; delete json.extensionsUsed
  const encoded = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(encoded.length / 4) * 4
  const binary = bytes.subarray(28 + jsonLength), buffer = new ArrayBuffer(28 + padded + binary.length)
  const output = new Uint8Array(buffer), header = new DataView(buffer)
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, buffer.byteLength, true)
  header.setUint32(12, padded, true); header.setUint32(16, 0x4e4f534a, true)
  output.fill(32, 20, 20 + padded); output.set(encoded, 20)
  header.setUint32(20 + padded, binary.length, true); header.setUint32(24 + padded, 0x004e4942, true)
  output.set(binary, 28 + padded)
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const meshes: SkinnedMesh[] = []
  gltf.scene.traverse(object => { if (object instanceof SkinnedMesh) meshes.push(object) })
  return { gltf, meshes, bytes: bytes.length }
}

describe.each(['pig', 'dog'] as const)('%s anatomical model', kind => {
  it.each([false, true])('has valid skin weights, bounded geometry and a lighter mobile variant (%s)', async mobile => {
    const file = `${kind}${mobile ? '-mobile' : ''}.glb`, { gltf, meshes, bytes } = await load(file)
    expect(meshes).toHaveLength(kind === 'pig' ? 2 : 3)
    let triangles = 0
    for (const mesh of meshes) {
      const geometry = mesh.geometry, weights = geometry.getAttribute('skinWeight'), joints = geometry.getAttribute('skinIndex')
      triangles += geometry.index!.count / 3
      for (const name of ['position', 'normal', 'uv', 'skinWeight']) expect(Array.from(geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
      for (let i = 0; i < weights.count; i++) {
        let total = 0
        for (let j = 0; j < 4; j++) {
          total += weights.getComponent(i, j)
          expect(joints.getComponent(i, j)).toBeLessThan(mesh.skeleton.bones.length)
        }
        expect(total).toBeCloseTo(1, 5)
      }
    }
    expect(triangles).toBeLessThan(mobile ? 8000 : 13000)
    expect(bytes).toBeLessThan(mobile ? 500_000 : 800_000)
    expect(gltf.parser.json.asset.extras.license).toBe('CC0-1.0')
    expect(gltf.parser.json.asset.extras.source).toContain('innerscene.com/tools/library/3d-parts/')
    if (mobile) expect(bytes).toBeLessThan((await readFile(asset(`${kind}.glb`))).length * .65)
  })

  it.each([false, true])('keeps the animated skin within its route clearance and above ground (%s)', async mobile => {
    const { gltf } = await load(`${kind}${mobile ? '-mobile' : ''}.glb`)
    const instance = createAnimalInstance(gltf.scene, kind === 'pig' ? 'gaston' : 'pancho')
    const point = new Vector3()
    let minHeight = Infinity, radius = 0
    for (let frame = 0; frame < 24; frame++) {
      instance.pose(frame / 24 * Math.PI * 2 / (kind === 'pig' ? 7 : 5.8))
      instance.scene.updateMatrixWorld(true)
      instance.scene.traverse(object => {
        if (!(object instanceof SkinnedMesh)) return
        object.skeleton.update()
        const positions = object.geometry.getAttribute('position')
        for (let vertex = 0; vertex < positions.count; vertex++) {
          object.applyBoneTransform(vertex, point.fromBufferAttribute(positions, vertex))
          expect(point.toArray().every(Number.isFinite)).toBe(true)
          minHeight = Math.min(minHeight, point.y)
          radius = Math.max(radius, Math.hypot(point.x, point.z))
        }
      })
    }
    // Animal roots sit 4 cm above terrain, with up to 1.9 cm of body bob.
    expect(minHeight).toBeGreaterThan(-.06)
    expect(radius).toBeLessThan(kind === 'pig' ? 1.25 : 1.6)
    instance.dispose()
  })
})

it('shares dog geometry while keeping Pancho and Pancha poses, collars and disposal independent', async () => {
  expect(animalModelUrl('pancho', true)).toBe(animalModelUrl('pancha', true))
  expect(animalModelUrl('gaston', false)).toBe('/models/animals/pig.glb')
  const { gltf, meshes } = await load('dog-mobile.glb')
  const pancho = createAnimalInstance(gltf.scene, 'pancho'), pancha = createAnimalInstance(gltf.scene, 'pancha')
  const a = pancho.scene.getObjectByName('FrontL0')!, b = pancha.scene.getObjectByName('FrontL0')!
  expect(a).not.toBe(b)
  pancho.pose(.25)
  expect(a.rotation.z).not.toBe(b.rotation.z)
  const getMeshes = (instance: typeof pancho) => {
    const result: SkinnedMesh[] = []
    instance.scene.traverse(object => { if (object instanceof SkinnedMesh) result.push(object) })
    return result
  }
  const ma = getMeshes(pancho), mb = getMeshes(pancha)
  expect(ma.map(mesh => mesh.geometry)).toEqual(mb.map(mesh => mesh.geometry))
  const collarA = ma.find(mesh => (mesh.material as MeshStandardMaterial).name === 'Collar')!.material as MeshStandardMaterial
  const collarB = mb.find(mesh => (mesh.material as MeshStandardMaterial).name === 'Collar')!.material as MeshStandardMaterial
  expect(collarA).not.toBe(collarB)
  expect(collarA.color.getHex()).not.toBe(collarB.color.getHex())
  const released = vi.fn()
  meshes.forEach(mesh => { mesh.geometry.addEventListener('dispose', released); (mesh.material as MeshStandardMaterial).addEventListener('dispose', released) })
  pancho.dispose()
  expect(released).not.toHaveBeenCalled()
  pancha.pose(2)
  expect(b.rotation.z).not.toBe(0)
  pancha.dispose()
})
