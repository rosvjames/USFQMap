import { BufferGeometry, Group, Matrix4, Mesh, MeshStandardMaterial } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Only for immutable, non-interactive decorations. Original resources remain owned by React. */
export function batchStaticMeshes(root: Group) {
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  const groups = new Map<string, { source: Mesh; meshes: Mesh[] }>()
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh) || 'isInstancedMesh' in object || 'isSkinnedMesh' in object || Array.isArray(object.material)) return
    const material = object.material
    if (!(material instanceof MeshStandardMaterial) || material.transparent) return
    const attributes = Object.keys(object.geometry.attributes).sort()
    // Equivalent local materials can share a draw, even if React created separate instances.
    const key = JSON.stringify([material.color.getHex(), material.emissive.getHex(), material.emissiveIntensity,
      material.roughness, material.metalness, material.side, material.vertexColors, material.opacity,
      material.map?.uuid, material.bumpMap?.uuid, material.bumpScale, material.normalMap?.uuid,
      material.normalScale.toArray(), material.envMap?.uuid, material.envMapIntensity, material.flatShading,
      material.alphaTest, material.depthTest, material.depthWrite, material.wireframe, material.toneMapped,
      object.castShadow, object.receiveShadow, object.renderOrder, attributes,
    ])
    const group = groups.get(key)
    if (group) group.meshes.push(object)
    else groups.set(key, { source: object, meshes: [object] })
  })
  const batches: Mesh[] = [], originals: Mesh[] = []
  for (const { source, meshes } of groups.values()) {
    if (meshes.length < 2) continue
    const geometries: BufferGeometry[] = meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
      return geometry
    })
    const merged = mergeGeometries(geometries, false)
    geometries.forEach((geometry) => geometry.dispose())
    if (!merged) continue
    merged.computeBoundingBox(); merged.computeBoundingSphere()
    const batch = new Mesh(merged, source.material)
    batch.name = 'static-batch'
    batch.castShadow = source.castShadow; batch.receiveShadow = source.receiveShadow; batch.renderOrder = source.renderOrder
    batch.raycast = () => {}
    batches.push(batch)
    for (const mesh of meshes) { mesh.visible = false; originals.push(mesh) }
  }
  return { batches, dispose: () => { batches.forEach((mesh) => { mesh.removeFromParent(); mesh.geometry.dispose() }); originals.forEach((mesh) => { mesh.visible = true }) } }
}
