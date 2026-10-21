import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ExtrudeGeometry, InstancedMesh, Object3D, Shape } from 'three'
import type { CampusBuilding } from '../lib/campus'
import { isMaxwellFrontEdge, MAXWELL_ENTRANCE } from '../lib/maxwell'
import { isEinsteinHallDoor, isHallTunnelMouthEdge } from '../lib/hallPassage'
import { campusToHall, isHallFrontEdge } from '../lib/hall'
import { HALL_PASSAGE } from '../lib/hallPassage'
import { isHallPlazaEdge } from '../lib/hallPlaza'
import { isHayekFrontEdge } from '../lib/hayek'
import { isEpicuroFrontEdge } from '../lib/epicuro'
import { campusSlopeOffsetAt } from '../lib/campusSlope'
import { NEWTON_ENTRANCE, isNewtonFrontEdge } from '../lib/newton'
import { isGalileoFrontEdge, campusToGalileo, GALILEO_ENTRANCE } from '../lib/galileo'

type Detail = { x: number; z: number; height: number; angle: number; width: number; tall: number; depth: number }

function FacadeInstances({ items, color, glass = false, arched = false }: { items: Detail[]; color: string; glass?: boolean; arched?: boolean }) {
  const geometry = useMemo(() => {
    if (!arched) return new BoxGeometry(1, 1, 1)
    const arch = new Shape()
    arch.moveTo(-0.5, -0.5); arch.lineTo(0.5, -0.5); arch.lineTo(0.5, 0)
    arch.absarc(0, 0, 0.5, 0, Math.PI, false); arch.lineTo(-0.5, -0.5)
    return new ExtrudeGeometry(arch, { depth: 1, bevelEnabled: false, curveSegments: 12 })
  }, [arched])
  useEffect(() => () => geometry.dispose(), [geometry])
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new Object3D(), tint = new Color()
    items.forEach((pane, i) => {
      object.position.set(pane.x, pane.height, pane.z)
      object.rotation.set(0, pane.angle, 0)
      object.scale.set(pane.width, pane.tall, pane.depth)
      object.updateMatrix()
      mesh.current?.setMatrixAt(i, object.matrix)
      tint.set(color).multiplyScalar(glass ? 0.72 + (Math.sin(i * 12.3) + 1) * 0.18 : 1)
      mesh.current?.setColorAt(i, tint)
    })
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true; mesh.current.computeBoundingSphere() }
  }, [items, color, glass])
  return <instancedMesh ref={mesh} args={[geometry, undefined, items.length]} castShadow={!glass} receiveShadow raycast={() => null}>
    <meshStandardMaterial color="white" roughness={glass ? 0.22 : 0.85} metalness={glass ? 0.45 : 0} />
  </instancedMesh>
}

/** Photo-inspired frames, glazing and cornices; openings are illustrative, not surveyed. */
export function FacadeDetails({ buildings }: { buildings: CampusBuilding[] }) {
  const details = useMemo(() => {
    const archFrames: Detail[] = [], archPanes: Detail[] = [], frames: Detail[] = [], panes: Detail[] = [], mullions: Detail[] = [], cornices: Detail[] = []
    for (const building of buildings.filter((b) => b.onCampus && !['obelisco', 'pagoda', 'miguel-de-santiago', 'gobe', 'coliseo', 'banos-deportes'].includes(b.info?.id ?? ''))) {
      const ring = building.ring
      const signedArea = ring.reduce((sum, a, i) => { const b = ring[(i + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1] }, 0)
      const sign = signedArea > 0 ? 1 : -1
      const floors = building.info?.id === 'newton' ? NEWTON_ENTRANCE.floors : building.levels
      const floorHeight = building.info?.id === 'newton' ? NEWTON_ENTRANCE.height/floors : building.info?.id === 'coliseo' ? 8 : building.info?.id === 'hall-principal' ? 5.5 : (building.heightMeters ?? building.levels * 3.5) / building.levels
      const curtain = building.info?.id === 'miguel-de-santiago'
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length]
        if (building.info?.id === 'epicuro' && isEpicuroFrontEdge(a,b)) continue
        if (building.info?.id === 'newton' && isNewtonFrontEdge(a,b)) continue
        if (building.info?.id === 'einstein' && isHallTunnelMouthEdge(a,b)) continue
        if (building.info?.id === 'hall-principal' && isHallFrontEdge(a, b)) continue
        if (building.info?.id === 'hall-principal' && isHallPlazaEdge(a,b)) continue
        if (building.info?.id === 'da-vinci' && i === 3) continue
        if (building.info?.id === 'hayek' && isHayekFrontEdge(a,b)) continue
        // The photo shows a plain end wall and circular gable windows in the bus patio.
        // MaxwellCafe supplies that cornice and gable in place of repeated arched windows.
        if (building.info?.id === 'maxwell' && i === 20) continue
        const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
        if (length < 0.3) continue
        const entranceFace = building.info?.id === 'maxwell' && isMaxwellFrontEdge(a, b)
        const galileoFace = building.info?.id === 'galileo' && isGalileoFrontEdge(a,b)
        const angle = Math.atan2(dy, dx)
        const at = (t: number, offset: number, height: number, width: number, tall: number, depth: number): Detail => ({
          x: a[0] + dx * t + sign * dy / length * offset, z: -(a[1] + dy * t - sign * dx / length * offset), height:height+campusSlopeOffsetAt(building.center), angle, width, tall, depth,
        })
        for (let floor = 0; floor < floors; floor++) {
          const corniceHeight = (floor + 1) * floorHeight - 0.12
          if (galileoFace) {
            const [x] = campusToGalileo(a), h=GALILEO_ENTRANCE
            for(const [from,to] of [[x,h.x-h.portalWidth/2],[h.x+h.portalWidth/2,x+length]]) {
              cornices.push(at(((from+to)/2-x)/length,.13,corniceHeight,to-from,.2,.4))
            }
          } else if (entranceFace) {
            const sideLength = (length - MAXWELL_ENTRANCE.width) / 2
            for (const t of [sideLength / length / 2, 1 - sideLength / length / 2]) cornices.push(at(t, 0.13, corniceHeight, sideLength, 0.2, 0.4))
          } else cornices.push(at(0.5, 0.13, corniceHeight, length + 0.22, floor === floors - 1 ? 0.35 : 0.2, 0.4))
          if (length < 3) continue
          const count = Math.max(1, Math.floor(length / (curtain ? 2.25 : 4.3)))
          for (let col = 0; col < count; col++) {
            const t = (col + 0.5) / count
            if (galileoFace && Math.abs(campusToGalileo([a[0]+dx*t,a[1]+dy*t])[0]-GALILEO_ENTRANCE.x)<GALILEO_ENTRANCE.portalWidth/2+.5) continue
            if (entranceFace && Math.abs((t - 0.5) * length) < MAXWELL_ENTRANCE.width / 2) continue
            if (building.info?.id === 'einstein' && floor === 0 && isEinsteinHallDoor([a[0]+dx*t,a[1]+dy*t])) continue
            if (building.info?.id === 'hall-principal') {
              const [x,z]=campusToHall([a[0]+dx*t,a[1]+dy*t])
              if (x>8 && x<8.5 && z<0 && z>HALL_PASSAGE.back) continue
            }
            const h = floor * floorHeight + floorHeight * 0.56
            const width = curtain ? length / count - 0.14 : 1.35, tall = curtain ? floorHeight - 0.4 : Math.min(2.05, floorHeight - 0.7)
            const arched = building.info?.id === 'maxwell'
            ;(arched ? archFrames : frames).push(at(t, 0.09, h, width + 0.3, tall + 0.3, 0.2))
            ;(arched ? archPanes : panes).push(at(t, arched ? 0.31 : 0.22, h, width, tall, 0.08))
            const detailOffset = arched ? 0.44 : 0.27
            mullions.push(at(t, detailOffset, h, 0.06, tall, 0.065), at(t, detailOffset, h - tall * 0.08, width, 0.065, 0.065))
          }
        }
      }
    }
    return { archFrames, archPanes, frames, panes, mullions, cornices }
  }, [buildings])
  return <group>
    <FacadeInstances items={details.archFrames} color="#e8dfc9" arched />
    <FacadeInstances items={details.archPanes} color="#476164" glass arched />
    <FacadeInstances items={details.frames} color="#e8dfc9" />
    <FacadeInstances items={details.panes} color="#476164" glass />
    <FacadeInstances items={details.mullions} color="#414844" />
    <FacadeInstances items={details.cornices} color="#e3dbc8" />
  </group>
}
