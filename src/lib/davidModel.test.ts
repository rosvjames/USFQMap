import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { Box3, type Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { SOURCES } from '../data/references'
import { DAVID_MODEL } from './davidModel'

const asset = (url: string) => new URL(`../../public${url}`, import.meta.url)

async function load(url: string) {
  const bytes = await readFile(asset(url))
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const gltf = await new GLTFLoader().parseAsync(buffer, '')
  const meshes: Mesh[] = []
  gltf.scene.traverse((object) => { if ((object as Mesh).isMesh) meshes.push(object as Mesh) })
  return { gltf, meshes }
}

describe.each([
  ['desktop', DAVID_MODEL.desktop, DAVID_MODEL.triangleBudget.desktop],
  ['mobile', DAVID_MODEL.mobile, DAVID_MODEL.triangleBudget.mobile],
] as const)('scanned David (%s variant)', (_name, url, budget) => {
  it('parses into one finite mesh with marble material, within the triangle budget', async () => {
    const { meshes } = await load(url)
    expect(meshes).toHaveLength(1)
    const geometry = meshes[0].geometry
    const triangles = geometry.index!.count / 3
    expect(triangles).toBeLessThanOrEqual(budget)
    // A scan decimated far below its budget would have lost the figure's detail.
    expect(triangles).toBeGreaterThan(budget * 0.95)
    for (const name of ['position', 'normal']) expect(Array.from(geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
    expect(meshes[0].material).toBeInstanceOf(MeshStandardMaterial)
    expect((meshes[0].material as MeshStandardMaterial).metalness).toBe(0)
  })

  it('is a complete, upright 4.4 m figure standing on y = 0 and centred on its footprint', async () => {
    const { gltf } = await load(url)
    const box = new Box3().setFromObject(gltf.scene), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3())
    expect(size.y).toBeCloseTo(DAVID_MODEL.height, 1)
    expect(Math.abs(box.min.y)).toBeLessThan(0.01)
    expect(Math.abs(center.x)).toBeLessThan(0.01)
    expect(Math.abs(center.z)).toBeLessThan(0.01)
    // Head to plinth: the statue is roughly 2.4 times taller than wide, and its depth stays under its width.
    expect(size.y / size.x).toBeGreaterThan(2)
    expect(size.y / size.x).toBeLessThan(3)
    expect(size.z).toBeGreaterThan(1)
    expect(size.z).toBeLessThan(size.x)
  })
})

describe('David attribution', () => {
  it('records the source, author, licence and changes in the metadata and in each file', async () => {
    const info = JSON.parse(new TextDecoder().decode(await readFile(asset('/models/david/attribution.json'))))
    expect(info.author).toBe('Scan the World @ Myminifactory.com')
    expect(info.license).toBe('CC BY-SA 4.0')
    expect(info.licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
    expect(info.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:David_\(Michelangelo\)\.stl$/)
    expect(info.changes).toMatch(/simplified/)
    expect(info.variants.map((variant: { file: string }) => `/models/david/${variant.file}`).sort())
      .toEqual([DAVID_MODEL.desktop, DAVID_MODEL.mobile].sort())
    for (const url of [DAVID_MODEL.desktop, DAVID_MODEL.mobile]) {
      const { gltf } = await load(url)
      const extras = gltf.parser.json.asset.extras
      expect(gltf.parser.json.asset.copyright).toContain('Scan the World @ Myminifactory.com')
      expect(extras).toMatchObject({ author: info.author, source: info.source, license: info.license, licenseUrl: info.licenseUrl })
    }
  })

  it('is credited among the visible sources with a link to the original', async () => {
    const info = JSON.parse(new TextDecoder().decode(await readFile(asset('/models/david/attribution.json'))))
    expect(SOURCES.davidScan.url).toBe(info.source)
    expect(SOURCES.davidScan.title).toContain(info.author)
    expect(SOURCES.davidScan.title).toContain(info.license)
  })
})
