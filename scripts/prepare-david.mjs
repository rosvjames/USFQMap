import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { MeshoptSimplifier } from 'meshoptimizer/simplifier'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, process.argv[2] ?? 'output/david-real/source.stl')
const destination = path.join(root, 'public/models/david')
const sourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/4d/David_%28Michelangelo%29.stl'
const credit = {
  title: 'David (Michelangelo)', author: 'Scan the World @ Myminifactory.com',
  source: 'https://commons.wikimedia.org/wiki/File:David_(Michelangelo).stl',
  artwork: 'https://www.myminifactory.com/object/3d-print-michelangelo-s-david-in-florence-italy-2052',
  license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceSha1: '4d9648fad3882ea2fcb5c17232ef4826b23c045c',
  changes: 'STL converted to GLB, reoriented from Z-up to Y-up, centered, scaled to 4.4 metres, simplified and smooth normals recalculated.',
}
await fs.mkdir(path.dirname(source), { recursive: true })
await fs.mkdir(destination, { recursive: true })
try { await fs.access(source) } catch {
  const response = await fetch(sourceUrl)
  assert(response.ok, `STL download failed: ${response.status}`)
  await fs.writeFile(source, Buffer.from(await response.arrayBuffer()))
}
const data = await fs.readFile(source)
assert.equal(createHash('sha1').update(data).digest('hex'), credit.sourceSha1, 'Unexpected source: review upstream changes before importing')
const original = new STLLoader().parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
original.rotateX(-Math.PI / 2)
original.computeBoundingBox()
const size = original.boundingBox.getSize(new Vector3()), center = original.boundingBox.getCenter(new Vector3())
assert(size.y > size.x * 2 && size.y > size.z * 2, 'Expected an upright, complete statue')
original.translate(-center.x, -original.boundingBox.min.y, -center.z).scale(4.4 / size.y, 4.4 / size.y, 4.4 / size.y)
const positions = original.getAttribute('position').array
assert(Array.from(positions).every(Number.isFinite))
await MeshoptSimplifier.ready
// STL repeats every face's vertices. Weld exact positions before simplifying the scan.
const weldedIndices = MeshoptSimplifier.generatePositionRemap(positions, 3)
function compact(indices, input) {
  const [remap, count] = MeshoptSimplifier.compactMesh(indices)
  const output = new Float32Array(count * 3)
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) output.set(input.subarray(i * 3, i * 3 + 3), remap[i] * 3)
  return output
}
const weldedPositions = compact(weldedIndices, positions)
const variants = []
for (const [name, target] of [['david', 100000], ['david-mobile', 40000]]) {
  const [indices, error] = MeshoptSimplifier.simplify(weldedIndices, weldedPositions, 3, target * 3, .002)
  const points = compact(indices, weldedPositions)
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3)).setIndex(Array.from(indices))
  geometry.computeVertexNormals(); geometry.computeBoundingBox()
  const normals = geometry.getAttribute('normal').array
  assert(Array.from(normals).every(Number.isFinite))
  const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y
  assert(Math.abs(height - 4.4) < .015 && indices.length / 3 <= target + 1, 'Model budget or dimensions changed')
  const chunks = [Buffer.from(points.buffer), Buffer.from(normals.buffer), Buffer.from(indices.buffer)]
  const offsets = [0, chunks[0].length, chunks[0].length + chunks[1].length]
  const binary = Buffer.concat(chunks)
  const json = {
    asset: { version: '2.0', generator: 'MiCampus / meshoptimizer', copyright: `${credit.author}; ${credit.license}`, extras: credit },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'David — Scan the World', mesh: 0 }],
    meshes: [{ name: 'David', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ name: 'Warm ivory marble', pbrMetallicRoughness: { baseColorFactor: [.78, .76, .69, 1], metallicFactor: 0, roughnessFactor: .68 } }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: chunks.map((chunk, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: chunk.length, target: i === 2 ? 34963 : 34962 })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: points.length / 3, type: 'VEC3', min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
  }
  const rawJson = Buffer.from(JSON.stringify(json))
  const paddedJson = Buffer.concat([rawJson, Buffer.alloc((4 - rawJson.length % 4) % 4, 0x20)])
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + paddedJson.length + binary.length, 8)
  header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  const binaryHeader = Buffer.alloc(8); binaryHeader.writeUInt32LE(binary.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4)
  const glb = Buffer.concat([header, paddedJson, binaryHeader, binary])
  await fs.writeFile(path.join(destination, `${name}.glb`), glb)
  variants.push({ file: `${name}.glb`, triangles: indices.length / 3, vertices: points.length / 3, bytes: glb.length, error, bounds: geometry.boundingBox })
  geometry.dispose()
}
original.dispose()
await fs.writeFile(path.join(destination, 'attribution.json'), JSON.stringify({ ...credit, originalTriangles: positions.length / 9, variants }, null, 2) + '\n')
console.log(JSON.stringify(variants, null, 2))
