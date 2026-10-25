import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion, Vector3, TorusGeometry } from 'three'
import { MeshoptSimplifier } from 'meshoptimizer/simplifier'

const directory = 'public/models/animals'
await fs.mkdir(directory, { recursive: true })
await MeshoptSimplifier.ready
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t) }
const sources = {
  pig: { file: 'output/animal-realism/farm-pig-source.glb', page: 'https://www.innerscene.com/tools/library/3d-parts/farm-pig-85281eb9', download: 'https://www.innerscene.com/api/library/farm-pig-85281eb9/download', sha256: '58b8f8d228f6eb8e962512526f100b8bab7d5d043fd882a4ef6d8909733742de' },
  dog: { file: 'output/animal-realism/dog-source.glb', page: 'https://www.innerscene.com/tools/library/3d-parts/large-dog-standing-6d1b30be', download: 'https://www.innerscene.com/api/library/large-dog-standing-6d1b30be/download', sha256: '168a27da95ecaa707c98c05c6fdacce0a788536c118acd5e9a031581a6a5b375' },
}
function deformation(kind, [x, y, z]) {
  if (kind === 'pig') return [x * 1.12 - .08, y * 1.3, z * 1.16]
  const waist = Math.exp(-(((x + .12) / .16) ** 2))
  let height = y + .30 * smooth(0, .43, y) + .5 * waist * Math.max(0, .66 - y) * smooth(.23, .32, y)
  const tail = smooth(.55, .74, -x) * smooth(.48, .63, y)
  height = height * (1 - tail) + (.62 - Math.max(0, y - .55) * 1.4 + .30) * tail
  const head = smooth(.35, .5, x) * smooth(.58, .72, y)
  return [x * 1.40 + Math.max(0, x - .48) * .55, height * 1.15, z * (.78 - head * .15 - waist * smooth(.32, .45, y) * .12)]
}
function readGlb(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF')
  const length = buffer.readUInt32LE(12), json = JSON.parse(buffer.toString('utf8', 20, 20 + length))
  const binary = buffer.subarray(28 + length)
  const read = index => {
    const accessor = json.accessors[index], view = json.bufferViews[accessor.bufferView]
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type]
    const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType]
    assert(width && bytes && !accessor.sparse, 'Unsupported accessor')
    const output = new Float32Array(accessor.count * width)
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = view.byteStride ?? bytes * width
    const method = { 5121: 'readUInt8', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[accessor.componentType]
    for (let i = 0; i < accessor.count; i++) for (let j = 0; j < width; j++) output[i * width + j] = binary[method](offset + i * stride + j * bytes)
    return output
  }
  const meshes = []
  const visit = (index, parent) => {
    const node = json.nodes[index], local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])))
    const matrix = new Matrix4().multiplyMatrices(parent, local)
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
      const positions = read(primitive.attributes.POSITION), uv = read(primitive.attributes.TEXCOORD_0), indices = Uint32Array.from(read(primitive.indices))
      const point = new Vector3()
      for (let i = 0; i < positions.length; i += 3) point.fromArray(positions, i).applyMatrix4(matrix).toArray(positions, i)
      meshes.push({ name: node.name, positions, uv, indices, material: json.materials[primitive.material].name })
    }
    node.children?.forEach(child => visit(child, matrix))
  }
  json.scenes[json.scene ?? 0].nodes.forEach(index => visit(index, new Matrix4()))
  return meshes
}
function skeleton(kind) {
  const bones = [{ name: 'Body', parent: -1, point: [0, 0, 0] }, { name: 'Head', parent: 0, point: kind === 'pig' ? [.56, .46, 0] : [.32, .63, 0] }]
  const legs = []
  for (const front of [true, false]) for (const side of [1, -1]) {
    const points = kind === 'pig'
      ? [[front ? .47 : -.49, .37, side * .15], [front ? .46 : -.51, .19, side * .15], [front ? .49 : -.51, .055, side * .15]]
      : front ? [[.25, .57, side * .105], [.255, .31, side * .105], [.27, .045, side * .105]] : [[-.38, .56, side * .105], [-.29, .33, side * .105], [-.40, .15, side * .105], [-.374, .04, side * .105]]
    const indices = points.map((point, i) => { const index = bones.length; bones.push({ name: `${front ? 'Front' : 'Hind'}${side > 0 ? 'L' : 'R'}${i}`, parent: i ? bones.length - 1 : 0, point }); return index })
    legs.push({ front, side, indices, points })
  }
  const tail = bones.length
  bones.push({ name: 'Tail', parent: 0, point: kind === 'pig' ? [-.68, .52, 0] : [-.57, .58, 0] })
  return { bones, legs, tail }
}
function weights(kind, point, rig, headPart = false) {
  const [x, y, z] = point, result = new Map([[0, 1]])
  const tail = smooth(kind === 'pig' ? .66 : .56, kind === 'pig' ? .79 : .72, -x) * smooth(kind === 'pig' ? .36 : .45, kind === 'pig' ? .43 : .58, y)
  const head = headPart ? 1 : smooth(kind === 'pig' ? .50 : .25, kind === 'pig' ? .74 : .46, x) * smooth(kind === 'pig' ? .22 : .46, kind === 'pig' ? .40 : .66, y)
  if (tail > .01) return [[0, 1 - tail], [rig.tail, tail]]
  if (head > .99) return [[1, 1]]
  if (head > 0) { result.set(0, 1 - head); result.set(1, head) }
  const legInfluence = (1 - smooth(kind === 'pig' ? .24 : .43, kind === 'pig' ? .39 : .60, y)) * smooth(.025, kind === 'pig' ? .10 : .07, Math.abs(z))
  if (legInfluence > 0) {
    const leg = rig.legs.filter(leg => (z > 0) === (leg.side > 0)).sort((a, b) => Math.abs(x - a.points[0][0]) - Math.abs(x - b.points[0][0]))[0]
    for (const [key, value] of result) result.set(key, value * (1 - legInfluence))
    let at = 0
    while (at < leg.points.length - 2 && y < leg.points[at + 1][1]) at++
    const next = Math.min(leg.indices.length - 1, at + 1), joint = leg.points[next][1]
    const blend = 1 - smooth(joint - .045, joint + .045, y)
    result.set(leg.indices[at], (result.get(leg.indices[at]) ?? 0) + legInfluence * (1 - blend))
    result.set(leg.indices[next], (result.get(leg.indices[next]) ?? 0) + legInfluence * blend)
  }
  const entries = [...result].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4), total = entries.reduce((s, [, w]) => s + w, 0)
  return entries.map(([joint, weight]) => [joint, weight / total])
}
function detailColor(name, kind) {
  if (/glint/.test(name)) return [.85, .87, .81]
  if (/iris/.test(name)) return [.15, .085, .028]
  if (/hoof/.test(name)) return [.09, .075, .064]
  if (/Nostril|Nose|Mouth|pupil|socket/.test(name)) return [.009, .011, .012]
  return kind === 'pig' ? [1, 1, 1] : [.045, .05, .055]
}
function writeGlb(json, chunks) {
  const binary = Buffer.concat(chunks), raw = Buffer.from(JSON.stringify(json)), data = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)])
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + data.length + binary.length, 8)
  header.writeUInt32LE(data.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, data, binHeader, binary])
}
const report = []
for (const [kind, source] of Object.entries(sources)) {
  try { await fs.access(source.file) } catch {
    const response = await fetch(source.download)
    assert(response.ok, `Cannot download ${source.page}: ${response.status}`)
    await fs.mkdir(path.dirname(source.file), { recursive: true })
    await fs.writeFile(source.file, Buffer.from(await response.arrayBuffer()))
  }
  const sourceData = await fs.readFile(source.file), input = readGlb(sourceData), rig = skeleton(kind)
  assert.equal(createHash('sha256').update(sourceData).digest('hex'), source.sha256, 'Source mesh changed; review its provenance before regenerating')
  // Replace the source pig's narrow pointed ears with broad, gently folded ear surfaces.
  if (kind === 'pig') {
    const skin = input.find(mesh => /skin/.test(mesh.name))
    for (let i = 0; i < skin.positions.length; i += 3) if (skin.positions[i] > .50 && Math.abs(skin.positions[i + 2]) > .09 && skin.positions[i + 1] > .66) skin.positions[i + 1] = .66
    for (const side of [1, -1]) {
      const positions = [], uv = [], indices = [], length = 12, width = 8
      for (const layer of [-1, 1]) for (let u = 0; u <= length; u++) for (let v = 0; v <= width; v++) {
        const t = u / length, across = v / width * 2 - 1, span = Math.sin(Math.PI * t) * .10 + .018 * (1 - t)
        positions.push(.64 + .18 * t + across * span, .65 + Math.sin(t * Math.PI) * .075 - .035 * t + layer * .006 - across * across * .018, side * (.13 + .17 * t))
        uv.push(v / width, t)
      }
      const layerSize = (length + 1) * (width + 1)
      for (let layer = 0; layer < 2; layer++) for (let u = 0; u < length; u++) for (let v = 0; v < width; v++) {
        const a = layer * layerSize + u * (width + 1) + v, b = a + width + 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
      input.push({ name: 'Folded ear skin', positions: Float32Array.from(positions), uv: Float32Array.from(uv), indices: Uint32Array.from(indices), material: 'Animal coat' })
    }
  }
  // Collar follows the same neck deformation as the skin; Pancho/Pancha share geometry and tint it at runtime.
  if (kind === 'dog') {
    const collar = new TorusGeometry(.155, .018, 6, 32)
    collar.rotateY(Math.PI / 2); collar.rotateZ(-.50); collar.translate(.32, .65, 0)
    input.push({ name: 'Collar', positions: collar.getAttribute('position').array, uv: collar.getAttribute('uv').array, indices: Uint32Array.from(collar.index.array), material: 'Collar' })
  }
  for (const mobile of [false, true]) {
    const buckets = [0, 1, 2].map(() => ({ positions: [], uv: [], colors: [], joints: [], weights: [], indices: [] }))
    for (const mesh of input) {
      const coat = /skin/.test(mesh.name), snout = /Snout disc/.test(mesh.name), collar = mesh.name === 'Collar'
      const target = coat ? mobile ? 2800 : 7000 : collar ? 384 : mobile ? 60 : 160
      const [reduced] = MeshoptSimplifier.simplify(mesh.indices, mesh.positions, 3, Math.min(mesh.indices.length, target * 3), coat ? mobile ? .03 : .008 : .025)
      const [remap, count] = MeshoptSimplifier.compactMesh(reduced)
      const bucket = buckets[collar ? 2 : coat || snout ? 0 : 1], offset = bucket.positions.length / 3
      const original = new Array(count)
      for (let old = 0; old < remap.length; old++) if (remap[old] !== 0xffffffff) original[remap[old]] = old
      for (const old of original) {
        const point = [...mesh.positions.subarray(old * 3, old * 3 + 3)]
        bucket.positions.push(...deformation(kind, point))
        bucket.uv.push(mesh.uv[old * 2] * (coat ? 3 : 1), mesh.uv[old * 2 + 1] * (coat ? 3 : 1))
        bucket.colors.push(...(collar || coat ? [1, 1, 1] : snout ? [.88, .64, .62] : detailColor(mesh.name, kind)))
        const influences = weights(kind, point, rig, /eye|Eye|ear|Nose|Nostril|Mouth|Snout|Collar/.test(mesh.name))
        for (let i = 0; i < 4; i++) { bucket.joints.push(influences[i]?.[0] ?? 0); bucket.weights.push(influences[i]?.[1] ?? 0) }
      }
      bucket.indices.push(...Array.from(reduced, index => index + offset))
    }
    const chunks = [], views = [], accessors = []
    const append = (typed, type, componentType, target) => {
      const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), offset = chunks.reduce((sum, b) => sum + b.length, 0)
      chunks.push(bytes, Buffer.alloc((4 - bytes.length % 4) % 4))
      views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) })
      const index = accessors.length
      accessors.push({ bufferView: views.length - 1, componentType, count: typed.length / ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type]), type })
      return index
    }
    const primitives = []
    let triangleCount = 0, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (const [material, bucket] of buckets.entries()) {
      if (!bucket.indices.length) continue
      const p = Float32Array.from(bucket.positions), geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(p, 3)).setIndex(bucket.indices)
      geometry.computeVertexNormals(); geometry.computeBoundingBox()
      assert(Array.from(p).every(Number.isFinite))
      const position = append(p, 'VEC3', 5126, 34962)
      accessors[position].min = geometry.boundingBox.min.toArray(); accessors[position].max = geometry.boundingBox.max.toArray()
      for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], accessors[position].min[axis]); max[axis] = Math.max(max[axis], accessors[position].max[axis]) }
      const normal = append(geometry.getAttribute('normal').array, 'VEC3', 5126, 34962), uv = append(Float32Array.from(bucket.uv), 'VEC2', 5126, 34962)
      const color = append(Float32Array.from(bucket.colors), 'VEC3', 5126, 34962), joints = append(Uint16Array.from(bucket.joints), 'VEC4', 5123, 34962), skin = append(Float32Array.from(bucket.weights), 'VEC4', 5126, 34962)
      const indices = append(Uint32Array.from(bucket.indices), 'SCALAR', 5125, 34963)
      primitives.push({ attributes: { POSITION: position, NORMAL: normal, TEXCOORD_0: uv, COLOR_0: color, JOINTS_0: joints, WEIGHTS_0: skin }, indices, material })
      triangleCount += bucket.indices.length / 3; geometry.dispose()
    }
    const bonePositions = rig.bones.map(b => deformation(kind, b.point)), bones = rig.bones.map((b, i) => ({ name: b.name, translation: b.parent < 0 ? bonePositions[i] : bonePositions[i].map((v, axis) => v - bonePositions[b.parent][axis]), children: rig.bones.flatMap((other, index) => other.parent === i ? [index] : []) }))
    // Body joint must stay at the origin, even though the pig's coordinate centering translates its skin.
    bones[0].translation = [0, 0, 0]
    for (let i = 1; i < bones.length; i++) if (rig.bones[i].parent === 0) bones[i].translation = bonePositions[i]
    bonePositions[0] = [0, 0, 0]
    const inverse = append(Float32Array.from(bonePositions.flatMap(p => new Matrix4().makeTranslation(-p[0], -p[1], -p[2]).elements)), 'MAT4', 5126)
    const texture = `${kind}-coat${mobile ? '-mobile' : ''}.webp`
    const json = {
      asset: { version: '2.0', generator: 'MiCampus animal adaptation / meshoptimizer', copyright: 'Base mesh Innerscene, CC0-1.0', extras: { source: source.page, license: 'CC0-1.0', adaptation: kind === 'dog' ? 'Greyhound proportions, black coat, collar and skeletal weights' : 'Pig proportions and skeletal weights' } },
      extensionsUsed: ['EXT_texture_webp'], extensionsRequired: ['EXT_texture_webp'],
      scene: 0, scenes: [{ nodes: [bones.length + 1] }], nodes: [...bones, { name: `${kind}-skin`, mesh: 0, skin: 0 }, { name: kind === 'pig' ? 'Gaston' : 'Greyhound', children: [0, bones.length] }],
      meshes: [{ name: `${kind}-continuous-skin`, primitives }], skins: [{ joints: rig.bones.map((_, i) => i), skeleton: 0, inverseBindMatrices: inverse }],
      materials: [
        { name: 'Coat', doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: kind === 'pig' ? .82 : .7 } },
        { name: 'Features', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .48 } },
        { name: 'Collar', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .8 } },
      ], textures: [{ sampler: 0, extensions: { EXT_texture_webp: { source: 0 } } }], images: [{ uri: texture }], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
      buffers: [{ byteLength: chunks.reduce((sum, b) => sum + b.length, 0) }], bufferViews: views, accessors,
    }
    const data = writeGlb(json, chunks), name = `${kind}${mobile ? '-mobile' : ''}.glb`
    await fs.writeFile(path.join(directory, name), data)
    assert(min[1] > -.005 && max[1] < 1.8 && Math.max(Math.abs(min[0]), Math.abs(max[0])) < (kind === 'pig' ? 1.23 : 1.55), 'Animal must fit its existing turning clearance')
    report.push({ kind, file: name, texture, bytes: data.length, triangles: triangleCount, bones: bones.length, bounds: { min, max }, source: source.page, sourceSha256: createHash('sha256').update(sourceData).digest('hex'), license: 'CC0-1.0' })
  }
}
await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ author: 'Innerscene (base meshes); MiCampus adaptations', license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', variants: report }, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
