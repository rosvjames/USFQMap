import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace } from 'three'
import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_WALKWAYS, CAMPUS_TREES } from '../lib/campus'
import { isMaxwellApproach } from '../lib/maxwell'
import { isMaxwellCourtyard } from '../lib/maxwellCourtyard'
import { miguelEntranceHeightAt } from '../lib/miguel'
import { isDaVinciPassage } from '../lib/daVinci'
import { isDaVinciPlaza } from '../lib/daVinciPlaza'
import { isMaxwellCafe } from '../lib/maxwellCafe'
import { isGalileoLandscape } from '../lib/galileo'
import { isMiguelGardenForecourt } from '../lib/miguelGarden'
import { isEpicuroForecourt } from '../lib/epicuro'
import { campusToPagoda, isPagodaStairApproach } from '../lib/pagoda'
import { isHallFlagGarden } from '../lib/hallFlags'
import { campusSlopeOffsetAt } from '../lib/campusSlope'
import { isHallMiniPlaza } from '../lib/hallMiniPlaza'
import { pointInPolygon } from '../lib/geo'
import type { Vec2 } from '../types'
import { SATELLITE_GARDENS, VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import { segmentProjection } from '../lib/terrain'

type Tree = { point: Vec2; size: number; palm: boolean; tone: string }
type Instance = { position: [number, number, number]; scale: [number, number, number]; rotation?: number; tone?: string }

export function foliageTexture() {
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

/** Open lawns keep clear centers; denser planting follows the satellite's wooded lagoon edge. */
export function LandscapeDetails() {
  const crowns = useRef<InstancedMesh>(null), trunks = useRef<InstancedMesh>(null), palms = useRef<InstancedMesh>(null)
  const texture = useMemo(foliageTexture, []), frond = useMemo(palmFrond, [])
  useEffect(() => () => { texture.dispose(); frond.dispose() }, [texture, frond])
  const instances = useMemo(() => {
    const trees: Tree[] = CAMPUS_TREES.filter((point) => !isMiguelGardenForecourt(point) && !isEpicuroForecourt(point) && !isHallMiniPlaza(point) && !isHallFlagGarden(point) && !isPagodaStairApproach(campusToPagoda(point),3) && !isGalileoLandscape(point) && !isMaxwellCourtyard(point) && !isMaxwellCafe(point) && !isDaVinciPassage(point) && !isDaVinciPlaza(point) && miguelEntranceHeightAt(point) === undefined).map((point) => ({ point, size: 1.1, palm: false, tone: '#576b3d' }))
    let index = 0
    const gardens = [
      ...CAMPUS_AREAS.filter((a) => a.kind === 'green' && a.osmId !== 'way/395847793').map((area) => ({ ring: area.ring, wooded: false })),
      ...SATELLITE_GARDENS.map((ring, i) => ({ ring, wooded: i === 1 })),
    ]
    for (const { ring, wooded } of gardens) {
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1])
      for (let x = Math.min(...xs) + 3; x < Math.max(...xs); x += 9) {
        for (let y = Math.min(...ys) + 3; y < Math.max(...ys); y += 9) {
          const point: Vec2 = [x + Math.sin(y * 0.7) * 2.3, y + Math.cos(x * 0.6) * 2.3]
          if (isMiguelGardenForecourt(point) || isEpicuroForecourt(point) || isHallMiniPlaza(point) || isHallFlagGarden(point) || isPagodaStairApproach(campusToPagoda(point),3) || isGalileoLandscape(point) || !pointInPolygon(point, ring) || !pointInPolygon(point, CAMPUS_BOUNDARY)) continue
          if (CAMPUS_BUILDINGS.some((b) => pointInPolygon(point, b.ring)) || isMaxwellApproach(point) || isMaxwellCourtyard(point) || isMaxwellCafe(point) || isDaVinciPassage(point) || isDaVinciPlaza(point) || miguelEntranceHeightAt(point) !== undefined) continue
          if (CAMPUS_AREAS.some((a) => a.kind === 'water' && pointInPolygon(point, a.ring))) continue
          if (!wooded && Math.min(...ring.map((a, i) => segmentProjection(point, a, ring[(i + 1) % ring.length]).distance)) > 4) continue
          const nearPath = CAMPUS_WALKWAYS.some((way) => way.line.some((a, i) => i > 0 &&
            segmentProjection(point, way.line[i - 1], a).distance < (way.mappedWidth ?? VISUAL_PATH_WIDTHS[way.osmId] ?? way.width) / 2 + 1.8,
          ))
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
      trunkItems.push({ position: [x, h / 2 + 0.4 + campusSlopeOffsetAt(tree.point), -y], scale: [s * (tree.palm ? 0.7 : 1), h, s * (tree.palm ? 0.7 : 1)] })
      if (tree.palm) {
        for (let i = 0; i < 11; i++) palmItems.push({ position: [x, h + 0.2 + i % 3 * 0.22 + campusSlopeOffsetAt(tree.point), -y], scale: [s, s * (0.8 + i % 3 * 0.18), s], rotation: i * Math.PI * 2 / 11 + index, tone: tree.tone })
      } else {
        for (let i = 0; i < 7; i++) {
          const angle = i * 2.4 + index, radius = i === 0 ? 0 : s * 1.35
          crownItems.push({ position: [x + Math.sin(angle) * radius, h + 0.7 + Math.sin(i * 7) * s * 0.7 + campusSlopeOffsetAt(tree.point), -y + Math.cos(angle) * radius],
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
