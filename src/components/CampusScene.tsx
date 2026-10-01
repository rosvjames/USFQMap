import { Edges, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type Ref, useMemo } from 'react'
import { DoubleSide, Shape, Vector2 } from 'three'
import {
  CAMPUS_AREAS,
  CAMPUS_BOUNDARY,
  CAMPUS_BUILDINGS,
  CAMPUS_PATHS,
  CAMPUS_TREES,
  CITY_ROADS,
  findCampusBuilding,
  type CampusBuilding,
} from '../lib/campus'
import type { OutdoorRoute } from '../lib/outdoor'
import type { BuildingPlan, GraphNode, Route, Vec2 } from '../types'
import { INITIAL_VIEW, MapCamera, type MapCameraHandle, type MapFocus } from './MapCamera'
import { MapLabel } from './MapLabel'

const LEVEL_HEIGHT = 3.5
// Floors of the open building are drawn further apart than in reality so each one stays visible.
const FLOOR_GAP = 9

// Palette taken from the campus itself: rose plaster walls, green-teal roofs, lawns and the lagoon.
// The city around it stays pale so the campus reads as the subject.
const COLOR = {
  city: '#e6eae7',
  cityBuilding: '#d3d8d5',
  cityRoof: '#dde1df',
  road: '#f8f9f8',
  lawn: '#cfe0bb',
  green: '#b7d39e',
  pitch: '#93c181',
  water: '#8cc3da',
  path: '#f6eedd',
  wall: '#efd0bd',
  roof: '#86ada4',
  edge: '#b9917c',
  trunk: '#8a6a4f',
  leaves: '#6fa565',
  red: '#c8102e',
  redDark: '#96091f',
  user: '#1a73e8',
}
const AREA_COLOR = { green: COLOR.green, pitch: COLOR.pitch, water: COLOR.water }

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
    <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 5, far: 4000 }} dpr={[1, 2]} frameloop="demand" shadows>
      <color attach="background" args={[COLOR.city]} />
      <fog attach="fog" args={[COLOR.city, 900, 2400]} />
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[-220, 320, 160]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-450}
        shadow-camera-right={450}
        shadow-camera-top={450}
        shadow-camera-bottom={-450}
        shadow-camera-near={10}
        shadow-camera-far={1200}
      />

      <Ground />

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
      {props.userPosition && <UserMarker position={props.userPosition} />}

      <MapCamera ref={props.cameraRef} focus={focus} onViewChange={props.onViewChange} />
    </Canvas>
  )
}

/** Everything flat: city ground, campus lawn, parks, courts, the lagoon, streets, walkways and trees. */
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={COLOR.city} />
      </mesh>

      {CITY_ROADS.map(({ line, major }, i) => (
        <Line key={i} points={line.map(([x, y]) => toScene(x, y, 0.1))} color={COLOR.road} lineWidth={major ? 10 : 6} worldUnits />
      ))}

      {CAMPUS_BOUNDARY.length > 0 && <FlatArea ring={CAMPUS_BOUNDARY} height={0.25} color={COLOR.lawn} />}
      {CAMPUS_AREAS.map((area, i) => (
        <FlatArea key={i} ring={area.ring} height={0.4} color={AREA_COLOR[area.kind]} />
      ))}

      {CAMPUS_PATHS.map((path, i) => (
        <Line key={i} points={path.map(([x, y]) => toScene(x, y, 0.55))} color={COLOR.path} lineWidth={2.6} worldUnits />
      ))}

      {CAMPUS_TREES.map(([x, y], i) => (
        <group key={i} position={toScene(x, y)}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 4, 8]} />
            <meshStandardMaterial color={COLOR.trunk} />
          </mesh>
          <mesh position={[0, 6, 0]} castShadow>
            <icosahedronGeometry args={[3, 1]} />
            <meshStandardMaterial color={COLOR.leaves} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FlatArea({ ring, height, color }: { ring: Vec2[]; height: number; color: string }) {
  const shape = useMemo(() => ringShape(ring), [ring])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function BuildingMesh(props: { building: CampusBuilding; selected: boolean; labelled: boolean; onSelect: (id: string) => void }) {
  const { building, selected, onSelect } = props
  const shape = useMemo(() => ringShape(building.ring), [building])
  const info = building.info
  const height = building.levels * LEVEL_HEIGHT
  const roof = selected ? COLOR.red : building.onCampus ? COLOR.roof : COLOR.cityRoof
  const wall = selected ? COLOR.redDark : building.onCampus ? COLOR.wall : COLOR.cityBuilding
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
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
        {/* Extruded shapes have two material slots: the caps (roof) and the sides (walls). */}
        <meshStandardMaterial attach="material-0" color={roof} />
        <meshStandardMaterial attach="material-1" color={wall} />
        {building.onCampus && !selected && <Edges threshold={20} color={COLOR.edge} />}
      </mesh>
      {selected && <DestinationPin position={toScene(...building.center, height)} />}
      {info && (selected || props.labelled) && (
        <MapLabel text={info.name} position={toScene(...building.center, height + (selected ? 21 : 4))} variant={selected ? 'pill' : 'plain'} />
      )}
    </>
  )
}

function DestinationPin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 5, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2.6, 8, 20]} />
        <meshStandardMaterial color={COLOR.red} />
      </mesh>
      <mesh position={[0, 10.5, 0]}>
        <sphereGeometry args={[4, 24, 24]} />
        <meshStandardMaterial color={COLOR.red} />
      </mesh>
      <mesh position={[0, 10.5, 0]}>
        <sphereGeometry args={[1.6, 16, 16]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>
    </group>
  )
}

function UserMarker({ position }: { position: Vec2 }) {
  return (
    <group position={toScene(...position, 0.7)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9, 40]} />
        <meshBasicMaterial color={COLOR.user} transparent opacity={0.18} depthTest={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
        <circleGeometry args={[3.4, 32]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
        <circleGeometry args={[2.5, 32]} />
        <meshBasicMaterial color={COLOR.user} depthTest={false} />
      </mesh>
    </group>
  )
}

function OutdoorRouteLine({ route }: { route: OutdoorRoute }) {
  const lift = 0.8
  const start = route.links[0][0]
  const path = route.path.map(([x, y]) => toScene(x, y, lift))
  return (
    <group>
      {path.length > 1 && (
        <>
          {/* White casing under the red line, as on road maps, so it reads over any background. */}
          <Line points={path} color="#ffffff" lineWidth={9} depthTest={false} renderOrder={5} />
          <Line points={path} color={COLOR.red} lineWidth={5} depthTest={false} renderOrder={6} />
        </>
      )}
      {route.links.map(([a, b], i) => (
        // Dashed: a straight guess between a door and the walkways, not a mapped path.
        <Line
          key={i}
          points={[toScene(...a, lift), toScene(...b, lift)]}
          color={COLOR.red}
          lineWidth={4}
          dashed
          dashSize={2.5}
          gapSize={2}
          depthTest={false}
          renderOrder={6}
        />
      ))}
      <mesh position={toScene(...start, lift)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
        <circleGeometry args={[2.4, 24]} />
        <meshBasicMaterial color="#1a1a1a" depthTest={false} />
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
        <mesh key={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, floorElevation(plan, floor) + 0.7, 0]}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial
            color={floor === activeFloor ? '#ffffff' : COLOR.wall}
            transparent
            opacity={floor === activeFloor ? 0.96 : 0.4}
            side={DoubleSide}
          />
          <Edges color={COLOR.edge} />
        </mesh>
      ))}

      {plan.edges.map((edge) => {
        const a = nodes.get(edge.from)!
        const b = nodes.get(edge.to)!
        if (a.floor !== activeFloor || b.floor !== activeFloor) return null
        return <Line key={`${edge.from}-${edge.to}`} points={[at(a, 0.9), at(b, 0.9)]} color="#d8cfc4" lineWidth={2} />
      })}

      {plan.nodes
        .filter((n) => n.kind !== 'corridor' && (n.floor === activeFloor || n.id === destination?.id))
        .map((node) => (
          <group key={node.id} position={at(node, 1.5)}>
            <mesh>
              <sphereGeometry args={[node.id === destination?.id ? 1.4 : 0.9, 20, 20]} />
              <meshStandardMaterial color={node.id === destination?.id ? COLOR.red : node.kind === 'room' ? COLOR.roof : '#6b6b6b'} />
            </mesh>
            <MapLabel text={node.code ?? node.label ?? ''} position={[0, 3, 0]} variant={node.id === destination?.id ? 'pill' : 'tag'} />
          </group>
        ))}

      {route && route.nodes.length > 1 && (
        <Line points={route.nodes.map((n) => at(n, 1.2))} color={COLOR.red} lineWidth={5} depthTest={false} renderOrder={6} />
      )}
    </group>
  )
}
