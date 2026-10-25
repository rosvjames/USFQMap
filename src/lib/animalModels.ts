import { Bone, Group, Mesh, MeshStandardMaterial, SkinnedMesh } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { CampusAnimalId } from './campusAnimals'

export function animalModelUrl(id: CampusAnimalId, lightweight: boolean) {
  return `/models/animals/${id === 'gaston' ? 'pig' : 'dog'}${lightweight ? '-mobile' : ''}.glb`
}

/** Clone bones per animal; meshes and decoded coat textures remain shared in the loader cache. */
export function createAnimalInstance(source: Group, id: CampusAnimalId) {
  const scene = clone(source) as Group
  const bones = new Map<string, Bone>(), owned = new Set<MeshStandardMaterial>(), meshes: SkinnedMesh[] = []
  scene.traverse(object => {
    if (object instanceof Bone) bones.set(object.name, object)
    if (!(object instanceof Mesh)) return
    object.castShadow = false; object.receiveShadow = true; object.raycast = () => null
    if (object instanceof SkinnedMesh) { object.frustumCulled = false; meshes.push(object) }
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const replacements = materials.map(material => {
      if (material.name !== 'Collar' || !(material instanceof MeshStandardMaterial)) return material
      const collar = material.clone()
      collar.color.set(id === 'pancha' ? '#f09879' : '#28baa9')
      owned.add(collar)
      return collar
    })
    object.material = Array.isArray(object.material) ? replacements : replacements[0]
  })
  for (const name of ['Head', 'Tail', 'FrontL0', 'FrontR0', 'HindL0', 'HindR0']) {
    if (!bones.has(name)) throw new Error(`Animal model is missing its ${name} joint`)
  }
  const legs = ['FrontL', 'FrontR', 'HindL', 'HindR'].map(prefix => [0, 1, 2, 3].map(index => bones.get(`${prefix}${index}`)))
  const pig = id === 'gaston', head = bones.get('Head')!, tail = bones.get('Tail')!
  return {
    scene,
    /** Phase follows distance travelled, so pausing to be petted also pauses the gait. */
    pose(distance: number) {
      const phase = distance * (pig ? 7 : 5.8)
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i], cycle = phase + [0, Math.PI, Math.PI / 2, Math.PI * 1.5][i]
        leg[0]!.rotation.z = Math.sin(cycle) * (pig ? .18 : .20)
        leg[1]!.rotation.z = Math.max(0, Math.cos(cycle)) * (pig ? .16 : .22)
        if (leg[2]) leg[2].rotation.z = -.10 * Math.sin(cycle)
        if (leg[3]) leg[3].rotation.z = -.10 * Math.sin(cycle)
      }
      tail.rotation.y = Math.sin(phase * .32) * (pig ? .10 : .14)
      head.rotation.z = Math.sin(phase * .5) * .012
    },
    dispose() {
      owned.forEach(material => material.dispose())
      // SkeletonUtils made new bone textures; geometries, coat maps and base materials still belong to useGLTF.
      new Set(meshes.map(mesh => mesh.skeleton)).forEach(skeleton => skeleton.dispose())
    },
  }
}
