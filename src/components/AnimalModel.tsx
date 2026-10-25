import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { animalModelUrl, createAnimalInstance } from '../lib/animalModels'
import type { CampusAnimalId } from '../lib/campusAnimals'
import { LIGHTWEIGHT_QUERY } from './RenderSettings'

export interface AnimalModelHandle { pose: (distance: number) => void }

export const AnimalModel = forwardRef<AnimalModelHandle, { id: CampusAnimalId }>(function AnimalModel({ id }, ref) {
  const [lightweight] = useState(() => window.matchMedia(LIGHTWEIGHT_QUERY).matches)
  const gl = useThree(state => state.gl)
  const source = useGLTF(animalModelUrl(id, lightweight))
  const instance = useMemo(() => createAnimalInstance(source.scene, id), [source.scene, id])
  useImperativeHandle(ref, () => ({ pose: instance.pose }), [instance])
  useEffect(() => {
    instance.scene.traverse(object => {
      if (!('isMesh' in object) || !('material' in object)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) if (material.map) material.map.anisotropy = Math.min(lightweight ? 2 : 4, gl.capabilities.getMaxAnisotropy())
    })
    return () => instance.dispose()
  }, [instance, gl, lightweight])
  return <primitive object={instance.scene} />
})
