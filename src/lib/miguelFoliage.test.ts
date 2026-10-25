import { expect, it } from 'vitest'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createMiguelCanopy } from './miguelFoliage'

it('keeps the leaf canopy visible from above and both sides when orbiting', () => {
  const geometry = createMiguelCanopy(), material = new MeshBasicMaterial({ side: DoubleSide }), mesh = new Mesh(geometry, material)
  for (const axis of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]) {
    const ray = new Raycaster(axis.clone().multiplyScalar(5), axis.clone().negate())
    expect(ray.intersectObject(mesh).length).toBeGreaterThan(0)
  }
  geometry.computeBoundingSphere()
  expect(geometry.boundingSphere!.radius).toBeLessThan(1.7)
  expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true)
  geometry.dispose(); material.dispose()
})
