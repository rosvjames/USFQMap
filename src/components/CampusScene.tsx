import { Edges, Line, Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type Ref, memo, useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, DoubleSide, ExtrudeGeometry, Shape, ShapeGeometry, Vector2 } from 'three'
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
import { IllustratedRoof, LandmarkRoof } from './IllustratedRoof'
import { SportsGround } from './SportsGround'
import { CampusBridges } from './CampusBridges'
import { Casita } from './Casita'
import { ColiseoBuilding, ColiseoLandscape } from './Coliseo'
import { SportsAnnex } from './SportsAnnex'
import { HallFlags } from './HallFlags'
import { CampusAnimals } from './CampusAnimals'
import { campusSlopeOffsetAt, createGradedSurfaceGeometry } from '../lib/campusSlope'
import { HayekEntrance } from './HayekEntrance'
import { MaxwellEntrance } from './MaxwellEntrance'
import { MaxwellCourtyard } from './MaxwellCourtyard'
import { MiguelGardenEntrance } from './MiguelGardenEntrance'
import { MIGUEL_GARDEN_FORECOURT } from '../lib/miguelGarden'
import { MiguelBuilding, MiguelEntrance } from './MiguelDeSantiago'
import { CAMPUS_GATE, CAMPUS_GATE_CUTOUT, CAMPUS_GATE_LINTEL } from '../lib/miguel'
import { MIGUEL_WORLD_FORECOURT } from '../lib/miguel'
import { DaVinciPassage } from './DaVinciPassage'
import { DaVinciPlaza } from './DaVinciPlaza'
import { HallPlazaFacade } from './HallPlazaFacade'
import { EpicuroFront } from './EpicuroFront'
import { EPICURO_FORECOURT } from '../lib/epicuro'
import { NewtonEntrance } from './NewtonEntrance'
import { NEWTON_ENTRANCE, NEWTON_LAWNS } from '../lib/newton'
import { GalileoLagoon } from './GalileoLagoon'
import { GALILEO_LAWNS, GALILEO_LAGOON, LAGOON_GARDEN } from '../lib/galileo'
import { DA_VINCI_WORLD_PLAZA } from '../lib/daVinciPlaza'
import { DA_VINCI_WORLD_PAVING } from '../lib/daVinci'
import { MaxwellCafe } from './MaxwellCafe'
import { CAFE_WORLD_OUTLINE } from '../lib/maxwellCafe'
import { MaxwellDragon } from './MaxwellDragon'
import { COURTYARD_WORLD_OUTLINE } from '../lib/maxwellCourtyard'
import { HallEinsteinPassage } from './HallEinsteinPassage'
import { HALL_TUNNEL, HALL_TUNNEL_CUTOUT } from '../lib/hallPassage'
import { HallEntrance } from './HallEntrance'
import { HallMiniPlaza } from './HallMiniPlaza'
import { HALL_MINI_WORLD_OUTLINE } from '../lib/hallMiniPlaza'
import { Pagoda } from './Pagoda'
import { SPORT_ZONES, TERRAIN_CUTOUTS, terrainHeightAt } from '../lib/terrain'
import { LandscapeDetails } from './LandscapeDetails'
import { createWalkwayGeometry, createTerrainShapes, createPavedShapes } from '../lib/architecture'
import { createCampusMaterials, type CampusMaterials } from '../lib/materials'
import { SATELLITE_GARDENS, SATELLITE_PLAZAS, VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import { pointInPolygon } from '../lib/geo'
import { SceneMetrics } from './SceneMetrics'
import { StaticDetails } from './StaticDetails'
import { CachedShadows, useLightweightRendering } from './RenderSettings'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

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

// Includes the campus, the full bridge and Hayek across the Interoceánica.
const OVERVIEW_CENTER: Vec2 = [-5, -77]
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
  names: boolean
}

export const CampusScene = memo(function CampusScene(props: SceneProps) {
  const { selectedBuildingId, plan } = props
  const lightweight = useLightweightRendering()
  const materials = useMemo(createCampusMaterials, [])
  useEffect(() => () => materials.dispose(), [materials])
  const focus = useMemo((): MapFocus => {
    const aboveThePanel = !!selectedBuildingId
    // With a route, frame the whole walk; otherwise just the selected building.
    const points = props.outdoorRoute ? [...props.outdoorRoute.path, ...props.outdoorRoute.links.flat()] : []
    if (points.length === 0) {
      const center = (selectedBuildingId && findCampusBuilding(selectedBuildingId)?.center) || OVERVIEW_CENTER
      return { center, span: selectedBuildingId ? BUILDING_SPAN : 525, aboveThePanel }
    }
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    return { center, span: Math.max(BUILDING_SPAN, span * 1.25), aboveThePanel }
  }, [selectedBuildingId, props.outdoorRoute])

  return (
    <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 5, far: 4000 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1, antialias: true, powerPreference: 'high-performance' }} onCreated={({ scene }) => { scene.environmentIntensity = 0.4 }} dpr={[1, 2]} frameloop="demand" shadows="percentage">
      <color attach="background" args={[COLOR.city]} />
      {import.meta.env.DEV && <SceneMetrics />}
      <fog attach="fog" args={[COLOR.city, 900, 2400]} />
      <Sky distance={4500} sunPosition={[-140, 240, 100]} turbidity={4} rayleigh={0.6} mieCoefficient={0.005} />
      <primitive object={materials.environment} attach="environment" />
      <hemisphereLight args={['#e2edf0', '#72654d', 0.75]} />
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[-140, 240, 100]}
        color="#fff1da"
        intensity={2.8}
        castShadow
        shadow-mapSize={lightweight ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
        shadow-camera-left={-230}
        shadow-camera-right={230}
        shadow-camera-top={230}
        shadow-camera-bottom={-230}
        shadow-camera-near={10}
        shadow-camera-far={1200}
      />

      <StaticDetails>
      <CityContext />
      <Ground materials={materials} />
      <LandscapeDetails />
      <ColiseoLandscape materials={materials} />
      <SportsGround materials={materials} />
      <CampusBridges />
      <HayekEntrance materials={materials} />
      <Casita materials={materials} />
      <HallEntrance materials={materials} />
      <HallMiniPlaza materials={materials} />
      <HallFlags materials={materials} />
      <HallEinsteinPassage materials={materials} />
      <MaxwellEntrance materials={materials} />
      <MaxwellCourtyard materials={materials} />
      <MaxwellCafe materials={materials} />
      <DaVinciPassage materials={materials} />
      <DaVinciPlaza materials={materials} />
      <HallPlazaFacade materials={materials} />
      <GalileoLagoon materials={materials} />
      <NewtonEntrance materials={materials} />
      <EpicuroFront materials={materials} />
      <MiguelEntrance materials={materials} />
      <MiguelGardenEntrance materials={materials} />
      <MaxwellDragon materials={materials} />
      </StaticDetails>
      <CampusAnimals />
      <CachedShadows sceneKey={`${plan?.buildingId}|${props.activeFloor}|${lightweight}`} />

      {CAMPUS_BUILDINGS.filter((building) => building.onCampus).map((building) =>
        plan && building.info?.id === plan.buildingId ? null : (
          <BuildingMesh
            key={building.osmId}
            building={building}
            materials={materials}
            selected={!!building.info && building.info.id === selectedBuildingId}
            labelled={props.names && building.onCampus}
            onSelect={props.onSelectBuilding}
          />
        ),
      )}

      <FacadeDetails buildings={CAMPUS_BUILDINGS} />

      {plan && <IndoorPlan plan={plan} route={props.route} activeFloor={props.activeFloor} />}
      {props.outdoorRoute && <OutdoorRouteLine route={props.outdoorRoute} />}
      {props.userPosition && <UserMarker position={props.userPosition} />}

      <MapCamera
        ref={props.cameraRef}
        focus={focus}
        focusKey={`${selectedBuildingId}|${props.originId}|${!!props.outdoorRoute}`}
        onViewChange={props.onViewChange}
      />
    </Canvas>
  )
})

/** Neutral city volumes share one draw; the university remains individually selectable. */
function CityContext() {
  const geometry = useMemo(() => {
    const bodies = CAMPUS_BUILDINGS.filter((building) => !building.onCampus).map((building) => new ExtrudeGeometry(ringShape(building.ring), { depth: Math.min(building.heightMeters ?? building.levels * LEVEL_HEIGHT, 5), bevelEnabled: false }))
    const merged = mergeGeometries(bodies, false)!
    bodies.forEach((body) => body.dispose())
    merged.computeBoundingSphere()
    return merged
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}><meshStandardMaterial color={COLOR.cityBuilding} roughness={1} /></mesh>
}

/** City ground, lawns, parks, courts, lagoon, streets and walkways. */
function Ground({ materials }: { materials: CampusMaterials }) {
  return (
    <group>
      <FlatArea ring={[[-3000, -3000], [3000, -3000], [3000, 3000], [-3000, 3000]]} height={-0.1} color={COLOR.city} city />

      {CITY_ROADS.map(({ line, major }, i) => (
        <PavedSurface key={i} line={line} width={major ? 10 : 6} height={0.1} material={materials.road} />
      ))}

      {CAMPUS_BOUNDARY.length > 0 && <FlatArea ring={CAMPUS_BOUNDARY} height={0.25} color={COLOR.lawn} material={materials.grass} cutTerrain graded />}
      {CAMPUS_BOUNDARY.length > 0 && <Line points={CAMPUS_BOUNDARY.map(([x, y]) => toScene(x, y, 0.6 + campusSlopeOffsetAt([x,y])))} color="#a0b69a" lineWidth={1} />}
      {CAMPUS_AREAS.filter((area) => !SPORT_ZONES.some((zone) => zone.area.osmId === area.osmId)).map((area, i) => (
        <group key={i}>
          <FlatArea ring={area.ring} height={0.4} color={AREA_COLOR[area.kind]} cutTerrain={area.kind !== 'water'} graded={area.kind !== 'water'} material={area.osmId === 'way/395847793' ? materials.paving : area.kind === 'green' ? materials.garden : area.kind === 'water' ? materials.pondWater : undefined} />
          {area.kind === 'water' && area.osmId !== GALILEO_LAGOON.osmId && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#a19a82" lineWidth={0.8} worldUnits />}
          {area.kind === 'pitch' && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#f2f4df" lineWidth={0.2} worldUnits />}
        </group>
      ))}

      <SatellitePlazas materials={materials} />

      {CAMPUS_WALKWAYS.filter((way) => !way.bridge && way.osmId !== 'way/395853824' && way.line.some((point) => pointInPolygon(point, CAMPUS_BOUNDARY))).map((way) => (
        <PavedSurface key={way.osmId} line={way.line} width={way.mappedWidth ?? VISUAL_PATH_WIDTHS[way.osmId] ?? way.width} height={terrainHeightAt} material={['way/1036865904','way/1431922073','way/1431922074'].includes(way.osmId)?materials.lakePaving:materials.paving} />
      ))}


    </group>
  )
}

function SatellitePlazas({ materials }: { materials: CampusMaterials }) {
  const { paving, gardens } = useMemo(() => {
    const obstacles = [...CAMPUS_BUILDINGS.map((building) => building.ring), ...CAMPUS_AREAS.filter((area) => area.kind === 'water').map((area) => area.ring), ...TERRAIN_CUTOUTS, COURTYARD_WORLD_OUTLINE, CAFE_WORLD_OUTLINE, DA_VINCI_WORLD_PAVING, DA_VINCI_WORLD_PLAZA, MIGUEL_WORLD_FORECOURT, MIGUEL_GARDEN_FORECOURT, ...GALILEO_LAWNS, ...NEWTON_LAWNS, EPICURO_FORECOURT, LAGOON_GARDEN, HALL_MINI_WORLD_OUTLINE]
    const mappedGardens = CAMPUS_AREAS.filter((area) => area.kind === 'green' && area.osmId !== 'way/395847793').map((area) => area.ring)
    return {
      paving: gradedShapes(createPavedShapes(SATELLITE_PLAZAS, [...obstacles, ...mappedGardens, ...SATELLITE_GARDENS])),
      gardens: gradedShapes(createPavedShapes(SATELLITE_GARDENS, obstacles)),
    }
  }, [])
  useEffect(()=>()=>{paving.dispose();gardens.dispose()},[paving,gardens])
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.48, 0]} receiveShadow raycast={() => null}>
      <primitive object={paving} attach="geometry" /><primitive object={materials.paving} attach="material" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.49, 0]} receiveShadow raycast={() => null}>
      <primitive object={gardens} attach="geometry" /><primitive object={materials.garden} attach="material" />
    </mesh>
  </group>
}

function scaleGroundUV(geometry: import('three').BufferGeometry) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
  uv.needsUpdate = true
}

function PavedSurface({ line, width, height, material }: { line: Vec2[]; width: number; height: number | ((point: Vec2) => number); material: CampusMaterials['paving'] }) {
  const geometry = useMemo(() => {
    const sampled = typeof height === 'number' ? line : line.flatMap((b,i)=>{
      if(!i)return [b]
      const a=line[i-1],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.5))
      return Array.from({length:n},(_,j):Vec2=>[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n])
    })
    return createWalkwayGeometry(sampled, width, height)
  }, [line, width, height])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} receiveShadow raycast={() => null} />
}

function gradedShapes(shapes: Shape[]) {
  const source=new ShapeGeometry(shapes),geometry=createGradedSurfaceGeometry(source)
  source.dispose();scaleGroundUV(geometry)
  return geometry
}

function FlatArea({ ring, height, color, material, cutTerrain = false, graded = false, city = false }: { ring: Vec2[]; height: number; color: string; material?: CampusMaterials['grass']; cutTerrain?: boolean; graded?: boolean; city?: boolean }) {
  const geometry = useMemo(() => {
    const shapes = city ? createTerrainShapes(ring,[CAMPUS_BOUNDARY,...TERRAIN_CUTOUTS]) : cutTerrain ? createTerrainShapes(ring,TERRAIN_CUTOUTS) : [ringShape(ring)]
    if(graded)return gradedShapes(shapes)
    const flat=new ShapeGeometry(shapes);scaleGroundUV(flat);return flat
  },[ring,cutTerrain,graded,city])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} rotation={[-Math.PI/2,0,0]} position={[0,height,0]} receiveShadow>
    {material ? <primitive object={material} attach="material" /> : <meshStandardMaterial color={color} />}
  </mesh>
}

function BuildingMesh(props: { building: CampusBuilding; materials: CampusMaterials; selected: boolean; labelled: boolean; onSelect: (id: string) => void }) {
  const { building, selected, onSelect, materials } = props
  const shape = useMemo(() => building.info?.id === 'guardiania-norte' ? createTerrainShapes(building.ring,[CAMPUS_GATE_CUTOUT]) : building.info?.id === 'einstein' ? createTerrainShapes(building.ring,[HALL_TUNNEL_CUTOUT]) : ringShape(building.ring), [building])
  const info = building.info
  const campusHeight = info?.id === 'obelisco' ? 0.6 : info?.id === 'banos-deportes' ? 3.5 : info?.id === 'coliseo' ? 5.7 : info?.id === 'newton' ? NEWTON_ENTRANCE.height : building.heightMeters ?? (info?.id === 'hall-principal' ? 5.5 : building.levels * LEVEL_HEIGHT)
  const height = building.onCampus ? campusHeight : Math.min(campusHeight, 5)
  const roofExtra = info?.id === 'maxwell' ? 13 : info?.id === 'obelisco' ? 20 : info?.id === 'coliseo' ? 7.8 : info?.id === 'pagoda' ? 3 : 3.5
  const geometry = useMemo(() => {
    const body = new ExtrudeGeometry(shape, { depth: info?.id === 'einstein' ? HALL_TUNNEL.ceiling : height, bevelEnabled: false })
    const uv = body.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
    uv.needsUpdate = true
    return body
  }, [shape, height, info?.id])
  useEffect(() => () => geometry.dispose(), [geometry])
  const gateLintel = useMemo(() => info?.id === 'guardiania-norte' ? new ExtrudeGeometry(CAMPUS_GATE_LINTEL.map(p=>ringShape(p[0] as Vec2[])),{depth:height-CAMPUS_GATE.lintel,bevelEnabled:false}) : null,[info?.id,height])
  useEffect(()=>()=>gateLintel?.dispose(),[gateLintel])
  const tunnelUpper = useMemo(() => {
    if(info?.id!=='einstein')return null
    const g=new ExtrudeGeometry(ringShape(building.ring),{depth:height-HALL_TUNNEL.ceiling,bevelEnabled:false}),uv=g.getAttribute('uv')
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4)
    uv.needsUpdate=true;return g
  },[info?.id,building.ring,height])
  useEffect(()=>()=>tunnelUpper?.dispose(),[tunnelUpper])
  const brick = ['galileo', 'newton', 'einstein', 'hayek', 'miguel-de-santiago'].includes(info?.id ?? '')
  const wallMaterial = info?.id === 'gobe' ? materials.casitaWhite : info?.id === 'epicuro' ? materials.epicuroStone : ['newton','galileo'].includes(info?.id ?? '') ? materials.academicOrange : ['guardiania-norte','galileo'].includes(info?.id ?? '') ? materials.hallRed : info?.id === 'da-vinci' ? materials.daVinciYellow : info?.id === 'hall-principal' ? materials.hallRed : info?.id === 'maxwell' || info?.id === 'casa-blanca' || info?.id === 'obelisco' ? materials.cream : brick ? materials.brick : materials.stucco
  return (
    <group position={[0,['coliseo','banos-deportes'].includes(info?.id ?? '') ? 0 : campusSlopeOffsetAt(building.center),0]}>
      {info?.id === 'banos-deportes' ? <SportsAnnex materials={materials} onSelect={() => onSelect('banos-deportes')} /> : info?.id === 'coliseo' ? <ColiseoBuilding materials={materials} onSelect={() => onSelect('coliseo')} /> : info?.id === 'miguel-de-santiago' ? <MiguelBuilding materials={materials} onSelect={() => onSelect('miguel-de-santiago')} /> : info?.id === 'pagoda' ? <Pagoda materials={materials} onSelect={() => onSelect('pagoda')} /> : <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow={building.onCampus}
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
      </mesh>}
      {gateLintel && <mesh geometry={gateLintel} position={[0,CAMPUS_GATE.lintel,0]} rotation={[-Math.PI/2,0,0]} material={materials.hallRed} castShadow receiveShadow raycast={()=>null}/>}
      {tunnelUpper && <mesh geometry={tunnelUpper} position={[0,HALL_TUNNEL.ceiling,0]} rotation={[-Math.PI/2,0,0]} material={materials.brick} castShadow receiveShadow onClick={event=>{if(event.delta>5)return;event.stopPropagation();onSelect('einstein')}}/>}
      {building.onCampus && !['obelisco', 'pagoda', 'miguel-de-santiago', 'gobe', 'coliseo', 'banos-deportes'].includes(info?.id ?? '') && <IllustratedRoof building={building} height={height} materials={materials} />}
      {building.onCampus && <LandmarkRoof building={building} height={height} materials={materials} />}
      {selected && <Line points={building.ring.map(([x, y]) => toScene(x, y, 0.8))} color={COLOR.red} lineWidth={0.35} worldUnits raycast={() => null} />}
      {selected && <DestinationPin position={toScene(...building.center, height + roofExtra)} scale={info?.id === 'pagoda' ? 0.5 : info?.id === 'gobe' ? .3 : 1} />}
      {props.labelled && (
        <MapLabel text={building.name ?? 'Nombre pendiente'} position={toScene(...building.center, height + roofExtra + (selected ? 21 : 4))} variant={selected ? 'pill' : 'plain'} depthTest={false} />
      )}
    </group>
  )
}

function DestinationPin({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
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
        <circleGeometry args={[route.usesHallPassage ? 0.5 : 2.4, 24]} />
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
