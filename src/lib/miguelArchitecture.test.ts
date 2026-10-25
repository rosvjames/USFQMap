import { describe, expect, it } from 'vitest'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createRecessedMiguelWall, createPlanarMiguelRoof, MIGUEL_FACADES } from './miguelArchitecture'

describe('Miguel architectural depth', () => {
  it('cuts a real window opening and gives its reveals depth', () => {
    const parts = createRecessedMiguelWall(8, 7, [{ x: 0, y: 1.98, width: 1.8, height: 2.25 }])
    const material = new MeshBasicMaterial({ side: DoubleSide })
    const meshes = Object.values(parts).map(geometry => new Mesh(geometry, material))
    const ray = new Raycaster(new Vector3(0, 1.98, 2), new Vector3(0, 0, -1))
    expect(ray.intersectObjects(meshes)).toHaveLength(0)
    ray.set(new Vector3(3, 1.98, 2), new Vector3(0, 0, -1))
    expect(ray.intersectObjects(meshes)[0].point.z).toBeCloseTo(0)
    ray.set(new Vector3(0, 1.98, -.16), new Vector3(1, 0, 0))
    expect(ray.intersectObjects(meshes)[0].point.x).toBeCloseTo(.9)
    for (const geometry of Object.values(parts)) {
      geometry.computeBoundingBox()
      expect(geometry.boundingBox!.min.z).toBeGreaterThanOrEqual(-.321)
      expect(geometry.boundingBox!.max.z).toBe(0)
      const colors = geometry.getAttribute('color')
      expect(colors.count).toBe(geometry.getAttribute('position').count)
      expect(Array.from(colors.array).every(v => v > 0 && v <= 1)).toBe(true)
      geometry.dispose()
    }
    material.dispose()
  })

  it('builds straight roof planes without covering a courtyard cutout', () => {
    const ring: [number, number][] = [[0, 0], [10, 0], [10, 20], [0, 20]]
    const hole: [number, number][] = [[3, 8], [7, 8], [7, 12], [3, 12]]
    const { roof, fascia } = createPlanarMiguelRoof(ring, 10, 1.5, [hole])
    roof.computeBoundingBox()
    expect(roof.boundingBox!.max.y).toBeCloseTo(11.56)
    const normals = roof.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) {
      const y = normals.getY(i)
      expect(Math.min(Math.abs(y - 1), Math.abs(y - 1 / Math.hypot(1, .45)))).toBeLessThan(.0001)
    }
    const material = new MeshBasicMaterial({ side: DoubleSide })
    const mesh = new Mesh(roof, material)
    expect(new Raycaster(new Vector3(5, 30, -10), new Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0)
    expect(new Raycaster(new Vector3(1, 30, -10), new Vector3(0, -1, 0)).intersectObject(mesh).length).toBeGreaterThan(0)
    expect(Array.from(roof.getAttribute('position').array).every(Number.isFinite)).toBe(true)
    roof.dispose(); fascia.dispose(); material.dispose()
  })

  it('keeps every window inside an exterior facade and every floor band', () => {
    expect(MIGUEL_FACADES.filter(face => face.windows.length).length).toBeGreaterThan(4)
    for (const face of MIGUEL_FACADES) for (const window of face.windows) {
      expect(face.kind).toBe('windows')
      expect(Math.abs(window.x) + window.width / 2).toBeLessThan(face.length / 2)
      expect(window.y - window.height / 2).toBeGreaterThan(0)
      expect(window.y + window.height / 2).toBeLessThan(face.height)
    }
  })
})
