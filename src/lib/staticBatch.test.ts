import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { batchStaticMeshes } from './staticBatch'

describe('static scene batching', () => {
  it('combines identical materials while preserving world positions and shadow flags', () => {
    const root = new Group(), nested = new Group(); root.position.set(10, 0, 20); nested.position.x = 5; root.add(nested)
    for (const x of [-2, 2]) {
      const box = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#e4ddc8' }))
      box.position.x = x; box.castShadow = true; nested.add(box)
    }
    root.updateMatrixWorld(true)
    const result = batchStaticMeshes(root)
    expect(result.batches).toHaveLength(1)
    const mesh = result.batches[0]; mesh.geometry.computeBoundingBox()
    expect(mesh.geometry.boundingBox!.min.x).toBeCloseTo(2.5)
    expect(mesh.geometry.boundingBox!.max.x).toBeCloseTo(7.5)
    expect(mesh.castShadow).toBe(true)
    expect(nested.children.every((child) => !child.visible)).toBe(true)
    result.dispose()
    expect(nested.children.every((child) => child.visible)).toBe(true)
  })
  it('discards copied ornaments before batching an updated scene',()=>{
    const root=new Group(),material=new MeshStandardMaterial(),geometry=new BoxGeometry()
    const a=new Mesh(geometry,material),b=new Mesh(geometry,material)
    b.position.x=40;root.add(a,b)
    const previous=batchStaticMeshes(root);previous.batches.forEach(m=>root.add(m))
    previous.dispose();root.remove(b)
    const replacement=new Mesh(geometry,material);replacement.position.x=2;root.add(replacement)
    const updated=batchStaticMeshes(root)
    expect(root.children.some(child=>child.name==='static-batch')).toBe(false)
    expect(updated.batches).toHaveLength(1)
    expect(updated.batches[0].geometry.boundingBox!.max.x).toBeCloseTo(2.5)
    updated.dispose();geometry.dispose();material.dispose()
  })
  it('keeps instanced, transparent and hidden objects out of the batch', () => {
    const root = new Group(), solid = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
    const instance = new InstancedMesh(solid.geometry, solid.material, 2)
    const glass = new Mesh(solid.geometry, new MeshStandardMaterial({ transparent: true, opacity: 0.5 }))
    const hidden = new Group(); hidden.visible = false; hidden.add(solid)
    root.add(instance, glass, hidden)
    const result = batchStaticMeshes(root)
    expect(result.batches).toHaveLength(0)
    expect(instance.visible).toBe(true); expect(glass.visible).toBe(true)
    result.dispose()
  })
})
