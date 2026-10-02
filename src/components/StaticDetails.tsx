import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Group } from 'three'
import { batchStaticMeshes } from '../lib/staticBatch'

/** Collapse hundreds of fixed ornaments into shared draws; keep building selection separate. */
export function StaticDetails({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null), invalidate = useThree((state) => state.invalidate)
  const gl=useThree(state=>state.gl)
  useLayoutEffect(() => {
    const result = batchStaticMeshes(root.current!)
    for (const mesh of result.batches) root.current!.add(mesh)
    gl.shadowMap.needsUpdate=true
    invalidate()
    return result.dispose
  }, [children,gl,invalidate])
  return <group ref={root}>{children}</group>
}
