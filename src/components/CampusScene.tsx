import { Edges, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type Ref, useMemo } from 'react'
import { DoubleSide, Shape, Vector2 } from 'three'
import { CAMPUS_BUILDINGS, CAMPUS_PATHS, findCampusBuilding, type CampusBuilding } from '../lib/campus'
import type { OutdoorRoute } from '../lib/outdoor'
import type { BuildingPlan, GraphNode, Route, Vec2 } from '../types'
import { INITIAL_VIEW, MapCamera, type MapCameraHandle, type MapFocus } from './MapCamera'
import { MapLabel } from './MapLabel'

const LEVEL_HEIGHT = 3.5
// Floors of the open building are drawn further apart than in reality so each one stays visible.
const FLOOR_GAP = 9
const USFQ_RED = '#c8102e'
const USER_BLUE = '#1a73e8'

const DEFAULT_FOCUS = findCampusBuilding('hall-principal')?.center ?? ([0, 0] as Vec2)
// Meters of ground that should fit on screen when looking at a single building.
const BUILDING_SPAN = 110

// North up, tilted like the 3D view of a maps app.
const INITIAL_CAMERA: [number, number, number] = [
  DEFAULT_FOCUS[0],
  INITIAL_VIEW.distance * Math.cos(INITIAL_VIEW.tilt),
  -DEFAULT_FOCUS[1] + INITIAL_VIEW.distance * Math.sin(INITIAL_VIEW.tilt),
]
// Zoomed out past this, only the origin and destination keep their name so labels do not pile up.
const CROWDED_SPAN = 260

// Map frame (x east, y north, height) -> three.js frame (x, y up, z south).
function toScene(x: number, y: number, height = 0): [number, number, number] {
  return [x, height, -y]
}

function floorElevation(plan: BuildingPlan, floor: number): number {
  return (floor - Math.min(...plan.floors)) * FLOOR_GAP
}

function ringShape(ring: Vec2[]): Shape {
  return new Shape(ring.map(([x, y]) => new Vector2(x, y)))
}

interface SceneProps {
  selectedBuildingId?: string
  plan?: BuildingPlan
  route: Route | null
  outdoorRoute: OutdoorRoute | null
  originBuildingId?: string
  userPosition?: Vec2
  activeFloor: number
  onSelectBuilding: (buildingId: string) => void
  cameraRef: Ref<MapCameraHandle>
  onViewChange: (azimuth: number, tilted: boolean) => void
}

export function CampusScene(props: SceneProps) {
  const { selectedBuildingId, plan } = props
  const focus = useMemo((): MapFocus => {
    const aboveThePanel = !!selectedBuildingId
    // With a route, frame the whole walk; otherwise just the selected building.
    const points = props.outdoorRoute ? [...props.outdoorRoute.path, ...props.outdoorRoute.links.flat()] : []
    if (points.length === 0) {
      const center = (selectedBuildingId && findCampusBuilding(selectedBuildingId)?.center) || DEFAULT_FOCUS
      return { center, span: BUILDING_SPAN, aboveThePanel }
    }
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    return { center, span: Math.max(BUILDING_SPAN, span * 1.25), aboveThePanel }
  }, [selectedBuildingId, props.outdoorRoute])

  return (
    <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 1, far: 4000 }} dpr={[1, 2]} frameloop="demand">
      <color attach="background" args={['#f4f1ec']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[120, 200, 80]} intensity={1.6} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color="#e3ead9" />
      </mesh>

      {CAMPUS_PATHS.map((path, i) => (
        <Line key={i} points={path.map(([x, y]) => toScene(x, y, 0.05))} color="#b9b2a5" lineWidth={2} />
      ))}

      {CAMPUS_BUILDINGS.map((building) =>
        plan && building.info?.id === plan.buildingId ? null : (
          <BuildingMesh
            key={building.osmId}
            building={building}
            selected={!!building.info && building.info.id === selectedBuildingId}
            labelled={focus.span < CROWDED_SPAN || building.info?.id === props.originBuildingId}
            onSelect={props.onSelectBuilding}
          />
        ),
      )}

      {plan && <IndoorPlan plan={plan} route={props.route} activeFloor={props.activeFloor} />}
      {props.outdoorRoute && <OutdoorRouteLine route={props.outdoorRoute} />}
      {props.userPosition && (
        <mesh position={toScene(...props.userPosition, 1.5)}>
          <sphereGeometry args={[2.2, 24, 24]} />
          <meshStandardMaterial color={USER_BLUE} emissive={USER_BLUE} emissiveIntensity={0.4} />
        </mesh>
      )}

      <MapCamera ref={props.cameraRef} focus={focus} onViewChange={props.onViewChange} />
    </Canvas>
  )
}

function BuildingMesh(props: { building: CampusBuilding; selected: boolean; labelled: boolean; onSelect: (id: string) => void }) {
  const { building, selected, onSelect } = props
  const shape = useMemo(() => ringShape(building.ring), [building])
  const info = building.info
  const height = building.levels * LEVEL_HEIGHT
  const color = selected ? USFQ_RED : info ? '#e9dcc6' : '#d6d3cc'
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={
          info &&
          ((event) => {
            // Ignore the release of a drag that happened to end on a building.
            if (event.delta > 5) return
            event.stopPropagation()
            onSelect(info.id)
          })
        }
      >
        <extrudeGeometry args={[shape, { depth: height, bevelEnabled: false }]} />
        <meshStandardMaterial color={color} />
        <Edges threshold={20} color={selected ? '#7d0a1c' : '#a8a092'} />
      </mesh>
      {info && (selected || props.labelled) && <MapLabel text={info.name} position={toScene(...building.center, height + 4)} variant={selected ? 'pill' : 'plain'} />}
    </>
  )
}

function OutdoorRouteLine({ route }: { route: OutdoorRoute }) {
  const lift = 0.6
  const start = route.links[0][0]
  return (
    <group>
      {route.path.length > 1 && <Line points={route.path.map(([x, y]) => toScene(x, y, lift))} color={USFQ_RED} lineWidth={5} depthTest={false} renderOrder={5} />}
      {route.links.map(([a, b], i) => (
        // Dashed: a straight guess between a door and the walkways, not a mapped path.
        <Line key={i} points={[toScene(...a, lift), toScene(...b, lift)]} color={USFQ_RED} lineWidth={4} dashed dashSize={2.5} gapSize={2} depthTest={false} renderOrder={5} />
      ))}
      <mesh position={toScene(...start, 1.2)}>
        <sphereGeometry args={[1.6, 20, 20]} />
        <meshStandardMaterial color="#2b2926" />
      </mesh>
    </group>
  )
}

function IndoorPlan({ plan, route, activeFloor }: { plan: BuildingPlan; route: Route | null; activeFloor: number }) {
  const building = findCampusBuilding(plan.buildingId)
  const shape = useMemo(() => (building ? ringShape(building.ring) : null), [building])
  const nodes = useMemo(() => new Map(plan.nodes.map((n) => [n.id, n])), [plan])
  const at = (node: GraphNode, lift = 0.3) => toScene(node.x, node.y, floorElevation(plan, node.floor) + lift)
  const destination = route?.nodes[route.nodes.length - 1]

  if (!shape) return null
  return (
    <group>
      {plan.floors.map((floor) => (
        <mesh key={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, floorElevation(plan, floor), 0]}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial
            color={floor === activeFloor ? '#ffffff' : '#cfcac1'}
            transparent
            opacity={floor === activeFloor ? 0.95 : 0.35}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {plan.edges.map((edge) => {
        const a = nodes.get(edge.from)!
        const b = nodes.get(edge.to)!
        if (a.floor !== activeFloor || b.floor !== activeFloor) return null
        return <Line key={`${edge.from}-${edge.to}`} points={[at(a, 0.15), at(b, 0.15)]} color="#c9c3b8" lineWidth={1.5} />
      })}

      {plan.nodes
        .filter((n) => n.kind !== 'corridor' && (n.floor === activeFloor || n.id === destination?.id))
        .map((node) => (
          <group key={node.id} position={at(node, 0.8)}>
            <mesh>
              <sphereGeometry args={[node.id === destination?.id ? 1.4 : 0.9, 20, 20]} />
              <meshStandardMaterial color={node.id === destination?.id ? USFQ_RED : node.kind === 'room' ? '#3b6ea5' : '#6b6b6b'} />
            </mesh>
            <MapLabel text={node.code ?? node.label ?? ''} position={[0, 3, 0]} variant="tag" />
          </group>
        ))}

      {route && route.nodes.length > 1 && <Line points={route.nodes.map((n) => at(n, 0.5))} color={USFQ_RED} lineWidth={5} />}
    </group>
  )
}
