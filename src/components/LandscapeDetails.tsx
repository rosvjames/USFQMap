import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace } from 'three'
import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_PATHS, CAMPUS_TREES } from '../lib/campus'
import { pointInPolygon } from '../lib/geo'
import type { Vec2 } from '../types'

type Tree = { point: Vec2; size: number; palm: boolean; tone: string }
type Instance = { position: [number, number, number]; scale: [number, number, number]; rotation?: number; tone?: string }

function foliageTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  let seed = 403
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < 1200; i++) {
    const tone = 125 + Math.floor(random() * 130)
    ctx.fillStyle = 'rgb(' + tone + ',' + tone + ',' + tone + ')'
    const x = random() * 128, y = random() * 128, radius = 1 + random() * 3
    // Wrap leaf clusters across the edges of the repeat tile.
    for (const dx of [-128, 0, 128]) for (const dy of [-128, 0, 128]) {
      ctx.beginPath(); ctx.ellipse(x + dx, y + dy, radius, radius * 0.55, random() * Math.PI, 0, Math.PI * 2); ctx.fill()
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(3, 2)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function palmFrond() {
  const positions: number[] = [], uv: number[] = []
  // A drooping rachis with separate narrow leaflets, rather than a solid cartoon fan.
  for (let i = 0; i < 18; i++) {
    const t = i / 18, next = (i + 1) / 18
    const x = t * 4.2, y = Math.sin(t * Math.PI) * 1.1 - t * t * 1.2
    const nx = next * 4.2, ny = Math.sin(next * Math.PI) * 1.1 - next * next * 1.2
    const width = Math.sin(t * Math.PI) * 0.65 + 0.02
    for (const side of [-1, 1]) {
      positions.push(x, y, 0, nx, ny, 0, x + 0.3, y - 0.28, width * side)
      uv.push(t, 0.5, next, 0.5, t + 0.05, side > 0 ? 1 : 0)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}

function setInstances(mesh: InstancedMesh | null, items: Instance[]) {
  if (!mesh) return
  const object = new Object3D(), color = new Color()
  items.forEach((item, i) => {
    object.position.set(...item.position)
    object.scale.set(...item.scale)
    object.rotation.set(0, item.rotation ?? 0, 0)
    object.updateMatrix()
    mesh.setMatrixAt(i, object.matrix)
    if (item.tone) mesh.setColorAt(i, color.set(item.tone))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

/** Additional planting follows mapped gardens; species and individual positions are illustrative. */
export function LandscapeDetails() {
  const crowns = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null), palms = useRef<InstancedMesh>(null)
  const texture = useMemo(foliageTexture, []), frond = useMemo(palmFrond, [])
  useEffect(() => () => { texture.dispose(); frond.dispose() }, [texture, frond])
  const instances = useMemo(() => {
    const trees: Tree[] = CAMPUS_TREES.map((point) => ({ point, size: 1.1, palm: false, tone: '#576b3d' }))
    let index = 0
    for (const area of CAMPUS_AREAS.filter((a) => a.kind === 'green')) {
      const xs = area.ring.map((p) => p[0]), ys = area.ring.map((p) => p[1])
      for (let x = Math.min(...xs) + 3; x < Math.max(...xs); x += 9) {
        for (let y = Math.min(...ys) + 3; y < Math.max(...ys); y += 9) {
          const point: Vec2 = [x + Math.sin(y * 0.7) * 2.3, y + Math.cos(x * 0.6) * 2.3]
          if (!pointInPolygon(point, area.ring) || !pointInPolygon(point, CAMPUS_BOUNDARY)) continue
          if (CAMPUS_BUILDINGS.some((b) => pointInPolygon(point, b.ring))) continue
          const nearPath = CAMPUS_PATHS.some((path) => path.some((a, i) => {
            if (!i) return false
            const b = path[i - 1], dx = b[0] - a[0], dy = b[1] - a[1]
            const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
            return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy) < 2.6
          }))
          if (!nearPath) {
            const palm = index % 4 === 0
            const tone = index % 9 === 1 ? '#7f6550' : ['#536c39', '#657a40', '#425e38', '#778050'][index % 4]
            trees.push({ point, size: 0.75 + (Math.sin(index * 17) + 1) * 0.25, palm, tone })
            index++
          }
        }
      }
    }
    const crownItems: Instance[] = [], trunkItems: Instance[] = [], palmItems: Instance[] = []
    for (const [index, tree] of trees.entries()) {
      const [x, y] = tree.point, s = tree.size, h = (tree.palm ? 7.4 : 5.5) * s
      trunkItems.push({ position: [x, h / 2 + 0.4, -y], scale: [s * (tree.palm ? 0.7 : 1), h, s * (tree.palm ? 0.7 : 1)] })
      if (tree.palm) {
        for (let i = 0; i < 11; i++) palmItems.push({ position: [x, h + 0.2 + i % 3 * 0.22, -y], scale: [s, s * (0.8 + i % 3 * 0.18), s], rotation: i * Math.PI * 2 / 11 + index, tone: tree.tone })
      } else {
        for (let i = 0; i < 7; i++) {
          const angle = i * 2.4 + index, radius = i === 0 ? 0 : s * 1.35
          crownItems.push({ position: [x + Math.sin(angle) * radius, h + 0.7 + Math.sin(i * 7) * s * 0.7, -y + Math.cos(angle) * radius],
            scale: [s * (1.5 + i % 3 * 0.2), s * (1.35 + i % 2 * 0.4), s * (1.35 + i % 3 * 0.22)], rotation: angle, tone: tree.tone })
        }
      }
    }
    return { crownItems, trunkItems, palmItems }
  }, [])
  useLayoutEffect(() => {
    setInstances(crowns.current, instances.crownItems)
    setInstances(trunks.current, instances.trunkItems)
    setInstances(palms.current, instances.palmItems)
  }, [instances])
  return <group>
    <instancedMesh ref={trunks} args={[undefined, undefined, instances.trunkItems.length]} castShadow receiveShadow raycast={() => null}>
      <cylinderGeometry args={[0.16, 0.26, 1, 8]} /><meshStandardMaterial color="#645643" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, instances.crownItems.length]} castShadow receiveShadow raycast={() => null}>
      <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial map={texture} alphaTest={0.45} roughness={1} side={DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={palms} args={[frond, undefined, instances.palmItems.length]} castShadow receiveShadow raycast={() => null}>
      <meshStandardMaterial roughness={0.9} side={DoubleSide} />
    </instancedMesh>
  </group>
}
