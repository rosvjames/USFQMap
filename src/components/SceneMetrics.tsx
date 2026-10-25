import { useRef } from 'react'
import { Mesh } from 'three'
import { useFrame, useThree } from '@react-three/fiber'

/** Development-only measurements, exposed on the canvas for browser verification. */
export function SceneMetrics() {
  const gl = useThree((state) => state.gl), scene = useThree((state) => state.scene), camera = useThree((state) => state.camera)
  const checked=useRef(new WeakSet<object>()),invalid=useRef<string[]>([])
  useFrame(() => {
    const data = gl.domElement.dataset
    data.drawCalls = String(gl.info.render.calls)
    data.triangles = String(gl.info.render.triangles)
    data.pixelRatio = String(gl.getPixelRatio())
    data.antialias = String(gl.getContext().getContextAttributes()?.antialias)
    data.gpuTextures = String(gl.info.memory.textures)
    data.frame = String(gl.info.render.frame)
    data.shadowAutoUpdate = String(gl.shadowMap.autoUpdate)
    data.cameraPosition = camera.position.toArray().join(',')
    let batches = 0, hidden = 0
    scene.traverse((object) => { if (object.name === 'static-batch') batches++; if (!object.visible) hidden++ })
    data.batches = String(batches); data.hidden = String(hidden)
    scene.traverse(object=>{
      if(!(object instanceof Mesh)||checked.current.has(object.geometry))return
      checked.current.add(object.geometry)
      const p=object.geometry.getAttribute('position')
      if((p&&!Array.from(p.array).every(Number.isFinite))||!object.matrixWorld.elements.every(Number.isFinite)){
        const material=Array.isArray(object.material)?object.material[0]:object.material
        invalid.current.push(JSON.stringify({name:object.name,type:object.geometry.type,local:object.position.toArray(),rotation:object.rotation.toArray(),parent:object.parent?.position.toArray(),parentRotation:object.parent?.rotation.toArray(),color:'color' in material?material.color:material.type}))
      }
    })
    data.invalidGeometry=invalid.current.join('|')
  })
  return null
}
