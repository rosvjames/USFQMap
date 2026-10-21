import { useEffect, useMemo } from 'react'
import { BufferGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, MeshStandardMaterial, Shape, SRGBColorSpace, TextureLoader, Vector2 } from 'three'
import { campusBaseHeightAt } from '../lib/campusSlope'
import { findCampusBuilding } from '../lib/campus'
import { COLISEO, campusToColiseo, coliseoToCampus } from '../lib/coliseo'
import type { CampusMaterials } from '../lib/materials'

/** The small red, low-roofed annex beside the Obelisk, not the timber-frame casita. */
export function SportsAnnex({ materials, onSelect }: { materials: CampusMaterials; onSelect: () => void }) {
  const details = useMemo(() => {
    const ring = findCampusBuilding('banos-deportes')!.ring, local = ring.map(campusToColiseo)
    const left = Math.min(...local.map(p => p[0])), right = Math.max(...local.map(p => p[0]))
    const front = Math.min(...local.map(p => p[1])), back = Math.max(...local.map(p => p[1]))
    const x = (left + right) / 2, z = (front + back) / 2
    const base = campusBaseHeightAt(coliseoToCampus([x,3.6]))-.35
    const body = new ExtrudeGeometry(new Shape(ring.map(p => new Vector2(...p))), { depth: 3.3-base, bevelEnabled: false })
    const roof = new BufferGeometry()
    const positions = [[left-.4,3.45,front-.45],[left-.4,3.65,back+.45],[right+.4,3.65,back+.45],[right+.4,3.45,front-.45]]
    roof.setAttribute('position', new Float32BufferAttribute(positions.flat(), 3)); roof.setIndex([0,1,2,0,2,3]); roof.computeVertexNormals()
    const texture = new TextureLoader().load('/textures/coliseo-annex-mural-reference.jpg')
    texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
    // Select the four corners of the mural in the original photo through UVs.
    // The supplied image stays intact; its street, sky and surrounding roof are outside the panel.
    const mural = new BufferGeometry(), w = Math.min(4.5, right-left-1.1), bottom = .72, top = 3.1
    mural.setAttribute('position', new Float32BufferAttribute([x-w/2,bottom,front-.13,x-w/2,top,front-.13,x+w/2,top,front-.13,x+w/2,bottom,front-.13], 3))
    mural.setAttribute('uv', new Float32BufferAttribute([229/1024,1-573/768,245/1024,1-115/768,814/1024,1-210/768,817/1024,1-531/768], 2))
    mural.setIndex([0,1,2,0,2,3]); mural.computeVertexNormals()
    const muralMaterial = new MeshStandardMaterial({ map: texture, roughness: 1, side: DoubleSide })
    const trim = new MeshStandardMaterial({ color: '#35443a', roughness: .85, side: DoubleSide })
    return { base, body, roof, mural, muralMaterial, texture, trim, x, z, left, right, front, back, w, bottom, top }
  }, [])
  useEffect(() => () => { details.body.dispose(); details.roof.dispose(); details.mural.dispose(); details.texture.dispose(); details.muralMaterial.dispose(); details.trim.dispose() }, [details])
  const click = (event: { delta: number; stopPropagation: () => void }) => { if (event.delta <= 5) { event.stopPropagation(); onSelect() } }
  const origin = coliseoToCampus([0,0])
  return <group>
    <mesh geometry={details.body} position={[0,details.base,0]} rotation={[-Math.PI/2,0,0]} material={materials.hallRed} castShadow receiveShadow onClick={click} />
    <group position={[origin[0],0,-origin[1]]} rotation={[0,COLISEO.angle,0]}>
      <mesh geometry={details.roof} material={details.trim} castShadow receiveShadow onClick={click} />
      <mesh geometry={details.mural} material={details.muralMaterial} receiveShadow onClick={click} />
      {[details.bottom,details.top].map(y => <mesh key={y} position={[details.x,y,details.front-.15]} material={details.trim} castShadow><boxGeometry args={[details.w+.12,.07,.12]} /></mesh>)}
      {[-1,1].map(side => <mesh key={side} position={[details.x+side*(details.w/2+.025),(details.top+details.bottom)/2,details.front-.15]} material={details.trim} castShadow><boxGeometry args={[.07,details.top-details.bottom,.12]} /></mesh>)}
      {/* Dark upper vents, reddish wall and a shallow single-slope roof. */}
      {[details.left,details.right].map((x,i) => <group key={x} position={[x,2.7,details.z]}>
        <mesh material={details.trim}><boxGeometry args={[.12,.55,details.back-details.front-1]} /></mesh>
        <mesh position={[i ? .08 : -.08,0,0]} material={materials.redStone}><boxGeometry args={[.1,.075,details.back-details.front-1]} /></mesh>
      </group>)}
      <mesh position={[details.x,3.38,details.front-.14]} material={details.trim}><boxGeometry args={[details.right-details.left+.8,.18,.5]} /></mesh>
    </group>
  </group>
}
