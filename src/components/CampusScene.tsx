import { Edges, Line, Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type Ref, useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, DoubleSide, ExtrudeGeometry, Shape, Vector2 } from 'three'
import {
  CAMPUS_AREAS,
  CAMPUS_BOUNDARY,
  CAMPUS_BUILDINGS,
  CAMPUS_WALKWAYS,
  CITY_ROADS,
  findCampusBuilding,
  type CampusBuilding,
} from '../lib/campus'
import type { OutdoorRoute } from '../lib/outdoor'
import type { BuildingPlan, GraphNode, Route, Vec2 } from '../types'
import { INITIAL_VIEW, MapCamera, type MapCameraHandle, type MapFocus } from './MapCamera'
import { MapLabel } from './MapLabel'
import { FacadeDetails } from './FacadeDetails'
import { WalkCamera, type WalkInput } from './WalkCamera'
import { IllustratedRoof, LandmarkRoof } from './IllustratedRoof'
import { SportsGround } from './SportsGround'
import { CampusBridges } from './CampusBridges'
import { HallEntrance } from './HallEntrance'
import { SPORT_ZONES, TERRAIN_CUTOUTS, terrainHeightAt } from '../lib/terrain'
import { LandscapeDetails } from './LandscapeDetails'
import { createWalkwayGeometry, createTerrainShapes } from '../lib/architecture'
import { createCampusMaterials, type CampusMaterials } from '../lib/materials'

const LEVEL_HEIGHT = 3.5
// Floors of the open building are drawn further apart than in reality so each one stays visible.
const FLOOR_GAP = 9

// Palette taken from the campus itself: rose plaster walls, green-teal roofs, lawns and the lagoon.
// The city around it stays pale so the campus reads as the subject.
const COLOR = {
  city: '#deddd4',
  cityBuilding: '#cbc9bf',
  cityRoof: '#bfbdaf',
  road: '#f8f9f8',
  lawn: '#cfe0bb',
  green: '#b7d39e',
  pitch: '#668857',
  water: '#557e63',
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

const OVERVIEW_CENTER: Vec2 = [-5, 0]
const WALK_OVERVIEW_TARGET: Vec2 = [10, 40]
// Meters of ground that should fit on screen when looking at a single building.
const BUILDING_SPAN = 110

// North up, tilted like the 3D view of a maps app.
const INITIAL_CAMERA: [number, number, number] = [
  OVERVIEW_CENTER[0] + INITIAL_VIEW.distance * Math.sin(INITIAL_VIEW.tilt) * Math.sin(INITIAL_VIEW.azimuth),
  INITIAL_VIEW.distance * Math.cos(INITIAL_VIEW.tilt),
  -OVERVIEW_CENTER[1] + INITIAL_VIEW.distance * Math.sin(INITIAL_VIEW.tilt) * Math.cos(INITIAL_VIEW.azimuth),
]
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
  /** A building id, or 'gps'. */
  originId: string
  userPosition?: Vec2
  activeFloor: number
  onSelectBuilding: (buildingId: string) => void
  cameraRef: Ref<MapCameraHandle>
  onViewChange: (azimuth: number, tilted: boolean) => void
  walking: boolean
  names: boolean
  walkInput: WalkInput
  onExitWalk: () => void
}

export function CampusScene(props: SceneProps) {
  const { selectedBuildingId, plan } = props
  const materials = useMemo(createCampusMaterials, [])
  useEffect(() => () => materials.dispose(), [materials])
  const focus = useMemo((): MapFocus => {
    const aboveThePanel = !!selectedBuildingId
    // With a route, frame the whole walk; otherwise just the selected building.
    const points = props.outdoorRoute ? [...props.outdoorRoute.path, ...props.outdoorRoute.links.flat()] : []
    if (points.length === 0) {
      const center = (selectedBuildingId && findCampusBuilding(selectedBuildingId)?.center) || OVERVIEW_CENTER
      return { center, span: selectedBuildingId ? BUILDING_SPAN : 410, aboveThePanel }
    }
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    return { center, span: Math.max(BUILDING_SPAN, span * 1.25), aboveThePanel }
  }, [selectedBuildingId, props.outdoorRoute])

  return (
    <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 5, far: 4000 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }} onCreated={({ scene }) => { scene.environmentIntensity = 0.4 }} dpr={[1, 1.75]} frameloop={props.walking ? 'always' : 'demand'} shadows="percentage">
      <color attach="background" args={[props.walking ? '#dcebf0' : COLOR.city]} />
      <fog attach="fog" args={[props.walking ? '#dcebf0' : COLOR.city, props.walking ? 160 : 900, props.walking ? 750 : 2400]} />
      <Sky distance={4500} sunPosition={[-140, 240, 100]} turbidity={4} rayleigh={0.6} mieCoefficient={0.005} />
      <primitive object={materials.environment} attach="environment" />
      <hemisphereLight args={['#e2edf0', '#72654d', 0.75]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[-140, 240, 100]}
        color="#fff1da"
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
        shadow-camera-left={-230}
        shadow-camera-right={230}
        shadow-camera-top={230}
        shadow-camera-bottom={-230}
        shadow-camera-near={10}
        shadow-camera-far={1200}
      />

      <Ground materials={materials} />
      <LandscapeDetails />
      <SportsGround materials={materials} />
      <CampusBridges />
      <HallEntrance materials={materials} />

      {CAMPUS_BUILDINGS.map((building) =>
        plan && building.info?.id === plan.buildingId ? null : (
          <BuildingMesh
            key={building.osmId}
            building={building}
            materials={materials}
            selected={!props.walking && !!building.info && building.info.id === selectedBuildingId}
            labelled={props.names && building.onCampus}
            onSelect={props.walking ? () => {} : props.onSelectBuilding}
            walking={props.walking}
          />
        ),
      )}

      <FacadeDetails buildings={CAMPUS_BUILDINGS} />

      {plan && <IndoorPlan plan={plan} route={props.route} activeFloor={props.activeFloor} />}
      {props.outdoorRoute && !props.walking && <OutdoorRouteLine route={props.outdoorRoute} />}
      {props.userPosition && <UserMarker position={props.userPosition} />}

      {props.walking ? <WalkCamera buildingId={selectedBuildingId ?? 'pagoda'} lookAt={selectedBuildingId ? undefined : WALK_OVERVIEW_TARGET} input={props.walkInput} onExit={props.onExitWalk} /> : <MapCamera
        ref={props.cameraRef}
        focus={focus}
        focusKey={`${selectedBuildingId}|${props.originId}|${!!props.outdoorRoute}`}
        onViewChange={props.onViewChange}
      />}
    </Canvas>
  )
}

/** Everything flat: city ground, campus lawn, parks, courts, the lagoon, streets, walkways and trees. */
function Ground({ materials }: { materials: CampusMaterials }) {
  return (
    <group>
      <FlatArea ring={[[-3000, -3000], [3000, -3000], [3000, 3000], [-3000, 3000]]} height={-0.1} color={COLOR.city} cutTerrain />

      {CITY_ROADS.map(({ line, major }, i) => (
        <PavedSurface key={i} line={line} width={major ? 10 : 6} height={0.1} material={materials.road} />
      ))}

      {CAMPUS_BOUNDARY.length > 0 && <FlatArea ring={CAMPUS_BOUNDARY} height={0.25} color={COLOR.lawn} material={materials.grass} cutTerrain />}
      {CAMPUS_BOUNDARY.length > 0 && <Line points={CAMPUS_BOUNDARY.map(([x, y]) => toScene(x, y, 0.6))} color="#a0b69a" lineWidth={1} />}
      {CAMPUS_AREAS.filter((area) => !SPORT_ZONES.some((zone) => zone.area.osmId === area.osmId)).map((area, i) => (
        <group key={i}>
          <FlatArea ring={area.ring} height={0.4} color={AREA_COLOR[area.kind]} cutTerrain={area.kind !== 'water'} material={area.kind === 'green' ? materials.garden : area.kind === 'water' ? materials.water : undefined} />
          {area.kind === 'water' && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#a19a82" lineWidth={0.8} worldUnits />}
          {area.kind === 'pitch' && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#f2f4df" lineWidth={0.2} worldUnits />}
        </group>
      ))}

      {CAMPUS_WALKWAYS.filter((way) => !way.bridge).map((way) => (
        <PavedSurface key={way.osmId} line={way.line} width={way.width} height={terrainHeightAt} material={materials.paving} />
      ))}


    </group>
  )
}

function PavedSurface({ line, width, height, material }: { line: Vec2[]; width: number; height: number | ((point: Vec2) => number); material: CampusMaterials['paving'] }) {
  const geometry = useMemo(() => createWalkwayGeometry(line, width, height), [line, width, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} receiveShadow raycast={() => null} />
}

function FlatArea({ ring, height, color, material, cutTerrain = false }: { ring: Vec2[]; height: number; color: string; material?: CampusMaterials['grass']; cutTerrain?: boolean }) {
  const shape = useMemo(() => cutTerrain ? createTerrainShapes(ring, TERRAIN_CUTOUTS) : [ringShape(ring)], [ring, cutTerrain])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
      <shapeGeometry args={[shape]} onUpdate={(geometry) => {
        const uv = geometry.getAttribute('uv')
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
        uv.needsUpdate = true
      }} />
      {material ? <primitive object={material} attach="material" /> : <meshStandardMaterial color={color} />}
    </mesh>
  )
}

function BuildingMesh(props: { building: CampusBuilding; materials: CampusMaterials; selected: boolean; labelled: boolean; walking: boolean; onSelect: (id: string) => void }) {
  const { building, selected, onSelect, materials } = props
  const shape = useMemo(() => ringShape(building.ring), [building])
  const info = building.info
  const height = info?.id === 'obelisco' ? 0.6 : building.heightMeters ?? (info?.id === 'coliseo' ? 8 : info?.id === 'hall-principal' ? 5.5 : building.levels * LEVEL_HEIGHT)
  const roofExtra = info?.id === 'maxwell' ? 13 : info?.id === 'obelisco' ? 20 : info?.id === 'pagoda' ? 8 : 3.5
  const geometry = useMemo(() => {
    const body = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
    const uv = body.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
    uv.needsUpdate = true
    return body
  }, [shape, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  const brick = ['galileo', 'newton', 'einstein', 'hayek', 'miguel-de-santiago'].includes(info?.id ?? '')
  const wallMaterial = info?.id === 'hall-principal' ? materials.hallRed : info?.id === 'maxwell' || info?.id === 'casa-blanca' || info?.id === 'obelisco' ? materials.cream : brick ? materials.brick : materials.stucco
  return (
    <>
      <mesh
        geometry={geometry}
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
        {building.onCampus ? <>
          <primitive object={materials.terracotta} attach="material-0" />
          <primitive object={wallMaterial} attach="material-1" />
        </> : <>
          <meshStandardMaterial attach="material-0" color={COLOR.cityRoof} roughness={1} />
          <meshStandardMaterial attach="material-1" color={COLOR.cityBuilding} roughness={1} />
        </>}
      </mesh>
      {building.onCampus && info?.id !== 'obelisco' && <IllustratedRoof building={building} height={height} materials={materials} />}
      {building.onCampus && <LandmarkRoof building={building} height={height} materials={materials} />}
      {selected && <Line points={building.ring.map(([x, y]) => toScene(x, y, 0.8))} color={COLOR.red} lineWidth={2} worldUnits raycast={() => null} />}
      {selected && <DestinationPin position={toScene(...building.center, height + roofExtra)} />}
      {props.labelled && (
        <MapLabel text={building.name ?? 'Nombre pendiente'} position={toScene(...building.center, height + roofExtra + (selected ? 21 : 4))} variant={selected ? 'pill' : 'plain'} depthTest={props.walking} />
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
  const lift = 0.3
  const at = (p: Vec2) => toScene(...p, terrainHeightAt(p) + lift)
  const start = route.links[0][0]
  const path = route.path.map(at)
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
          points={[at(a), at(b)]}
          color={COLOR.red}
          lineWidth={4}
          dashed
          dashSize={2.5}
          gapSize={2}
          depthTest={false}
          renderOrder={6}
        />
      ))}
      <mesh position={at(start)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
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
