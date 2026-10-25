import { ContactShadows, Edges, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type ReactNode, type Ref, Suspense, memo, useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, DoubleSide, ExtrudeGeometry, Shape, ShapeGeometry, Vector2 } from 'three'
import {
  CAMPUS_AREAS,
  CAMPUS_BOUNDARY,
  CAMPUS_BUILDINGS,
  CITY_ROADS,
  findCampusBuilding,
  type CampusBuilding,
} from '../lib/campus'
import type { OutdoorRoute } from '../lib/outdoor'
import type { BuildingPlan, GraphNode, Route, Vec2 } from '../types'
import { INITIAL_VIEW, MapCamera, type MapCameraHandle, type MapFocus } from './MapCamera'
import { WalkCamera } from './WalkCamera'
import type { WalkInput } from '../lib/walkInput'
import type { CampusAnimalId } from '../lib/campusAnimals'
import { MapLabel } from './MapLabel'
import { DestinationMarker, EndDot, OriginMarker } from './RouteMarkers'
import { LabelCollision } from './LabelCollision'
import { FacadeDetails } from './FacadeDetails'
import { IllustratedRoof, LandmarkRoof } from './IllustratedRoof'
import { SportsGround } from './SportsGround'
import { CampusBridges } from './CampusBridges'
import { Casita } from './Casita'
import { ColiseoBuilding, ColiseoLandscape } from './Coliseo'
import { SportsAnnex } from './SportsAnnex'
import { HallFlags } from './HallFlags'
import { CampusAnimals } from './CampusAnimals'
import { campusSlopeOffsetAt, createGradedSurfaceGeometry, buildingFoundationBase } from '../lib/campusSlope'
import { HayekEntrance } from './HayekEntrance'
import { MaxwellEntrance } from './MaxwellEntrance'
import { MaxwellCourtyard } from './MaxwellCourtyard'
import { MiguelGardenEntrance } from './MiguelGardenEntrance'
import { MiguelBuilding, MiguelEntrance } from './MiguelDeSantiago'
import { MiguelMaterials, useWaterReflection } from './MiguelMaterials'
import { CAMPUS_GATE, CAMPUS_GATE_CUTOUT, CAMPUS_GATE_LINTEL } from '../lib/miguel'
import { PIN_POSITIONS } from '../lib/entrances'
import { DaVinciPassage } from './DaVinciPassage'
import { DaVinciPlaza } from './DaVinciPlaza'
import { HallPlazaFacade } from './HallPlazaFacade'
import { EpicuroFront } from './EpicuroFront'
import { NewtonEntrance } from './NewtonEntrance'
import { GalileoLagoon } from './GalileoLagoon'
import { MaxwellCafe } from './MaxwellCafe'
import { MaxwellDragon } from './MaxwellDragon'
import { HallEinsteinPassage } from './HallEinsteinPassage'
import { HALL_TUNNEL, HALL_TUNNEL_CUTOUT } from '../lib/hallPassage'
import { HallEntrance } from './HallEntrance'
import { HallMiniPlaza } from './HallMiniPlaza'
import { Pagoda } from './Pagoda'
import { ColiseoInterior } from './ColiseoInterior'
import { AcademicComplexInterior } from './AcademicComplexInterior'
import { ACADEMIC_COMPLEX } from '../lib/academicComplex'
import { SPORT_ZONES, TERRAIN_CUTOUTS, PATH_LEVEL, terrainHeightAt } from '../lib/terrain'
import { LandscapeDetails } from './LandscapeDetails'
import { createWalkwayGeometry, createTerrainShapes, createPavedShapes } from '../lib/architecture'
import { createCampusMaterials, type CampusMaterials } from '../lib/materials'
import { CampusSky } from './CampusSky'
import { SceneLoadBoundary, SceneReady, useCampusTextures } from './CampusTextures'
import { NEWTON_ENTRANCE } from '../lib/newton'
import { GALILEO_LAGOON } from '../lib/galileo'
import { createCampusGroundShapes, createCampusRetainingGeometry, createLandscapePavingGeometry, createLandscapePavingWalls } from '../lib/ground'
import { CAMPUS_ELEVATION, cityBaseHeightAt } from '../lib/elevation'
import { CAMPUS_STREET_CUTOUTS } from '../lib/campus'
import { centroid, pointInPolygon } from '../lib/geo'
import { SATELLITE_PLAZAS } from '../data/siteAppearance'
import { SceneMetrics } from './SceneMetrics'
import { StaticDetails } from './StaticDetails'
import { CachedShadows, useLightweightRendering } from './RenderSettings'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const LEVEL_HEIGHT = 3.5
const ignoreSelection = () => {}
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
  red: '#e11b22',
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
  /** Building (or ACADEMIC_COMPLEX.id) drawn roofless with its modelled interior instead of its exterior volume. */
  interiorBuildingId?: string
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
  walking: boolean
  walkInput: WalkInput
  onExitWalk: () => void
  onNearbyAnimalChange: (id:CampusAnimalId|null) => void
  /** Called once the first frame of the campus is on screen. */
  onReady?: () => void
}

export const CampusScene = memo(function CampusScene(props: SceneProps) {
  const { selectedBuildingId } = props
  const plan = props.walking ? undefined : props.plan
  const interiorBuildingId = props.walking ? undefined : props.interiorBuildingId
  const exteriors = useMemo(() => CAMPUS_BUILDINGS.filter((building) => interiorBuildingId === ACADEMIC_COMPLEX.id
    ? !ACADEMIC_COMPLEX.buildings.includes(building.info?.id ?? '') && !ACADEMIC_COMPLEX.extraFootprints.includes(building.osmId)
    : !interiorBuildingId || building.info?.id !== interiorBuildingId), [interiorBuildingId])
  const lightweight = useLightweightRendering()
  const focus = useMemo((): MapFocus => {
    const aboveThePanel = !!selectedBuildingId
    // With a route, frame the whole walk; otherwise just the selected building.
    const points = props.outdoorRoute ? [...props.outdoorRoute.path, ...props.outdoorRoute.links.flat()] : []
    if (points.length === 0) {
      const center = (selectedBuildingId && findCampusBuilding(selectedBuildingId)?.center) || OVERVIEW_CENTER
      return { center, span: selectedBuildingId ? BUILDING_SPAN : 525, aboveThePanel, height: selectedBuildingId !== 'hayek' ? CAMPUS_ELEVATION : 0 }
    }
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const center: Vec2 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    return { center, span: Math.max(BUILDING_SPAN, span * 1.25), aboveThePanel }
  }, [selectedBuildingId, props.outdoorRoute])

  return (
    <SceneLoadBoundary onFail={props.onReady}>
    <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 5, far: 4000 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1, antialias: true, powerPreference: 'high-performance' }} dpr={[1, 2]} frameloop={props.walking ? 'always' : 'demand'} shadows="percentage">
      <Suspense fallback={null}><CampusSky walking={props.walking} /><MiguelMaterials><WithCampusMaterials>{(materials) => <>
      <color attach="background" args={[COLOR.city]} />
      {import.meta.env.DEV && <SceneMetrics />}
      <fog attach="fog" args={[COLOR.city, 900, 2400]} />
      {/* The scene has no environment map (no reflections, none of its cost): this sky/ground fill replaces the soft ambient light it used to add. */}
      <hemisphereLight args={['#e2edf0', '#8a7c63', 1]} />
      <ambientLight intensity={0.04} />
      <directionalLight
        position={[-140, 240, 100]}
        color="#fff1da"
        intensity={2.8}
        castShadow
        shadow-mapSize={lightweight ? [1024, 1024] : [4096, 4096]}
        shadow-radius={2}
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
      <CampusBridges materials={materials} />
      <HayekEntrance materials={materials} />
      <LandscapeDetails materials={materials} />
      <group position={[0, CAMPUS_ELEVATION, 0]}>
      <ColiseoLandscape materials={materials} />
      <SportsGround materials={materials} />
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
      </group>
      </StaticDetails>
      <ContactShadows position={[-94.5, CAMPUS_ELEVATION + .585, 28.6]} scale={1} width={54} height={24} opacity={.32} blur={1.8} far={22} frames={1} resolution={512} color="#514936" />
      <CampusAnimals walking={props.walking} onNearbyAnimalChange={props.onNearbyAnimalChange}/>
      <CachedShadows sceneKey={`${plan?.buildingId}|${interiorBuildingId}|${props.activeFloor}|${lightweight}`} />

      <LabelCollision>
      {exteriors.filter((building) => building.onCampus).map((building) =>
        plan && building.info?.id === plan.buildingId ? null : (
          <BuildingMesh
            key={building.osmId}
            building={building}
            materials={materials}
            selected={!props.walking && !!building.info && building.info.id === selectedBuildingId}
            labelled={!props.walking && props.names && building.onCampus}
            onSelect={props.walking ? ignoreSelection : props.onSelectBuilding}
          />
        ),
      )}
      </LabelCollision>

      <FacadeDetails buildings={exteriors} materials={materials} />
      <group position={[0, CAMPUS_ELEVATION, 0]}>
      {interiorBuildingId === 'coliseo' && <ColiseoInterior materials={materials} />}
      {interiorBuildingId === ACADEMIC_COMPLEX.id && <AcademicComplexInterior materials={materials} floor={props.activeFloor} />}

      {plan && <IndoorPlan plan={plan} route={props.route} activeFloor={props.activeFloor} />}
      </group>
      {props.outdoorRoute && !props.walking && <OutdoorRouteLine route={props.outdoorRoute} />}
      {/* With a walk from the GPS, the red origin marker already says where the visitor is. */}
      {props.userPosition && !props.walking && !(props.outdoorRoute && props.originId === 'gps') && <UserMarker position={props.userPosition} />}

      {props.walking ? <WalkCamera buildingId={selectedBuildingId} input={props.walkInput} onExit={props.onExitWalk}/> : <MapCamera
        ref={props.cameraRef}
        focus={focus}
        focusKey={`${selectedBuildingId}|${props.originId}|${!!props.outdoorRoute}`}
        onViewChange={props.onViewChange}
      />}
      <SceneReady onReady={props.onReady} />
      </>}</WithCampusMaterials></MiguelMaterials></Suspense>
    </Canvas>
    </SceneLoadBoundary>
  )
})

/** Builds the shared materials from the loaded images, so nothing is drawn before they exist. */
function WithCampusMaterials({ children }: { children: (materials: CampusMaterials) => ReactNode }) {
  const textures = useCampusTextures()
  const reflection = useWaterReflection()
  const materials = useMemo(() => createCampusMaterials(textures, reflection), [textures, reflection])
  useEffect(() => () => materials.dispose(), [materials])
  return <>{children(materials)}</>
}

/** Neutral city volumes share one draw; the university remains individually selectable. */
function CityContext() {
  const geometry = useMemo(() => {
    const bodies = CAMPUS_BUILDINGS.filter((building) => !building.onCampus).map((building) => new ExtrudeGeometry(ringShape(building.ring), { depth: Math.min(building.heightMeters ?? building.levels * LEVEL_HEIGHT, 5), bevelEnabled: false }).translate(0, 0, cityBaseHeightAt(building.center) - .55))
    const merged = mergeGeometries(bodies, false)!
    bodies.forEach((body) => body.dispose())
    merged.computeBoundingSphere()
    return merged
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}><meshStandardMaterial color={COLOR.cityBuilding} roughness={1} /></mesh>
}

/** Horizontal strips follow the city's north/south grade without subdividing a six-kilometre plane. */
function CityGround() {
  const geometry = useMemo(() => {
    const ys = [-3000, -145, ...Array.from({ length: 22 }, (_, i) => -140 + i * 5), 3000]
    const pieces = ys.slice(1).map((north, i) => {
      const ring: Vec2[] = [[-3000, ys[i]], [3000, ys[i]], [3000, north], [-3000, north]]
      const g = new ShapeGeometry(createTerrainShapes(ring, [CAMPUS_BOUNDARY]))
      const p = g.getAttribute('position')
      for (let j = 0; j < p.count; j++) p.setZ(j, cityBaseHeightAt([p.getX(j), p.getY(j)]) - .65)
      g.computeVertexNormals(); return g
    })
    const merged = mergeGeometries(pieces)!; pieces.forEach(g => g.dispose()); return merged
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}><meshStandardMaterial color={COLOR.city}/></mesh>
}

/** City ground, lawns, parks, courts, lagoon, streets and walkways. */
function Ground({ materials }: { materials: CampusMaterials }) {
  const street = useMemo(() => new ShapeGeometry(createPavedShapes(CAMPUS_STREET_CUTOUTS, CAMPUS_BUILDINGS.map(b => b.ring))), [])
  useEffect(() => () => street.dispose(), [street])
  return (
    <group>
      <CityGround />

      {CITY_ROADS.map(({ line, major }, i) => (
        <PavedSurface key={i} line={line} width={major ? 10 : 6} height={p => cityBaseHeightAt(p) - .45} material={materials.road} />
      ))}

      <CampusGround materials={materials} />
      <mesh geometry={street} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} material={materials.paving} receiveShadow raycast={() => null}/>
      {CAMPUS_BOUNDARY.length > 0 && <Line points={CAMPUS_BOUNDARY.map(([x, y]) => toScene(x, y, CAMPUS_ELEVATION + 0.6 + campusSlopeOffsetAt([x,y])))} color="#a0b69a" lineWidth={1} />}
      {CAMPUS_AREAS.filter((area) => (area.kind !== 'green' || !pointInPolygon(centroid(area.ring), CAMPUS_BOUNDARY)) && !SPORT_ZONES.some((zone) => zone.area.osmId === area.osmId)).map((area, i) => (
        <group key={i} position={[0, pointInPolygon(centroid(area.ring), CAMPUS_BOUNDARY) ? CAMPUS_ELEVATION : 0, 0]}>
          <FlatArea ring={area.ring} height={0.4} color={AREA_COLOR[area.kind]} cutTerrain={area.kind !== 'water'} graded={area.kind !== 'water' && pointInPolygon(centroid(area.ring), CAMPUS_BOUNDARY)} cityGrade={!pointInPolygon(centroid(area.ring), CAMPUS_BOUNDARY)} material={area.kind === 'water' ? materials.pondWater : area.kind === 'green' ? materials.grass : materials.synthetic} />
          {area.kind === 'water' && area.osmId !== GALILEO_LAGOON.osmId && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#a19a82" lineWidth={0.8} worldUnits />}
          {area.kind === 'pitch' && <Line points={area.ring.map(([x, y]) => toScene(x, y, 0.6))} color="#f2f4df" lineWidth={0.2} worldUnits />}
        </group>
      ))}
    </group>
  )
}

function CampusGround({ materials }: { materials: CampusMaterials }) {
  const retaining = useMemo(createCampusRetainingGeometry, [])
  const retainingWall = materials.surface('concrete', '#a89e88', { roughness: .96, side: DoubleSide })
  const cityPaving = useMemo(() => new ShapeGeometry(createPavedShapes(SATELLITE_PLAZAS.filter(r => !pointInPolygon(centroid(r), CAMPUS_BOUNDARY)), CAMPUS_BUILDINGS.map(b => b.ring))), [])
  useEffect(() => () => { retaining.dispose(); cityPaving.dispose() }, [retaining, cityPaving])
  const { paving, grass, landscapePaving, landscapeWalls } = useMemo(() => {
    const shapes = createCampusGroundShapes()
    const landscapePaving = createLandscapePavingGeometry(shapes.landscapePaving)
    scaleGroundUV(landscapePaving)
    return { paving: gradedShapes(shapes.paving), grass: gradedShapes(shapes.grass), landscapePaving, landscapeWalls: createLandscapePavingWalls(shapes.landscapePaving) }
  }, [])
  useEffect(() => () => { paving.dispose(); grass.dispose(); landscapePaving.dispose(); landscapeWalls.dispose() }, [paving, grass, landscapePaving, landscapeWalls])
  return <group>
    <mesh geometry={retaining} material={retainingWall} receiveShadow raycast={() => null} />
    <mesh geometry={cityPaving} material={materials.paving} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} receiveShadow raycast={() => null}/>
    <group position={[0, CAMPUS_ELEVATION, 0]}>
    <mesh geometry={paving} material={materials.paving} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} receiveShadow raycast={() => null} />
    <mesh geometry={grass} material={materials.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} receiveShadow raycast={() => null} />
    <mesh geometry={landscapePaving} material={materials.paving} rotation={[-Math.PI / 2, 0, 0]} position={[0, PATH_LEVEL, 0]} receiveShadow raycast={() => null} />
    <mesh geometry={landscapeWalls} material={materials.paving} receiveShadow raycast={() => null} />
    </group>
  </group>
}

function scaleGroundUV(geometry: import('three').BufferGeometry) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
  uv.needsUpdate = true
}

function PavedSurface({ line, width, height, material }: { line: Vec2[]; width: number; height: number | ((point: Vec2) => number); material: CampusMaterials['paving'] }) {
  const geometry = useMemo(() => {
    const sampled = typeof height === 'number' ? line : line.flatMap((b, i) => {
      if (!i) return [b]
      const a = line[i - 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5))
      return Array.from({ length: n }, (_, j): Vec2 => [a[0] + (b[0] - a[0]) * (j + 1) / n, a[1] + (b[1] - a[1]) * (j + 1) / n])
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

function FlatArea({ ring, height, color, material, cutTerrain = false, graded = false, cityGrade = false }: { ring: Vec2[]; height: number; color: string; material?: CampusMaterials['grass']; cutTerrain?: boolean; graded?: boolean; cityGrade?: boolean }) {
  const geometry = useMemo(() => {
    const shapes = cutTerrain ? createTerrainShapes(ring,TERRAIN_CUTOUTS) : [ringShape(ring)]
    if(cityGrade) { const flat = new ShapeGeometry(shapes), g = createGradedSurfaceGeometry(flat, 'shape', 5, p => cityBaseHeightAt(p) - .55); flat.dispose(); scaleGroundUV(g); return g }
    if(graded)return gradedShapes(shapes)
    const flat=new ShapeGeometry(shapes);scaleGroundUV(flat);return flat
  },[ring,cutTerrain,graded,cityGrade])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} rotation={[-Math.PI/2,0,0]} position={[0,height,0]} receiveShadow>
    {material ? <primitive object={material} attach="material" /> : <meshStandardMaterial color={color} />}
  </mesh>
}

/** The selected building always keeps its name; then catalogued university buildings, the larger first; then minor services. */
function labelPriority(building: CampusBuilding, selected: boolean): number {
  if (selected) return Infinity
  const area = Math.abs(building.ring.reduce((sum, [x, y], i) => {
    const [nx, ny] = building.ring[(i + 1) % building.ring.length]
    return sum + x * ny - nx * y
  }, 0)) / 2
  return (building.info ? 1e6 : 0) + area
}

function BuildingMesh(props: { building: CampusBuilding; materials: CampusMaterials; selected: boolean; labelled: boolean; onSelect: (id: string) => void }) {
  const { building, selected, onSelect, materials } = props
  const shape = useMemo(() => building.info?.id === 'guardiania-norte' ? createTerrainShapes(building.ring,[CAMPUS_GATE_CUTOUT]) : building.info?.id === 'einstein' ? createTerrainShapes(building.ring,[HALL_TUNNEL_CUTOUT]) : ringShape(building.ring), [building])
  const info = building.info
  const campusHeight = info?.id === 'obelisco' ? 0.6 : info?.id === 'banos-deportes' ? 3.5 : info?.id === 'coliseo' ? 5.7 : info?.id === 'newton' ? NEWTON_ENTRANCE.height : building.heightMeters ?? (info?.id === 'hall-principal' ? 5.5 : building.levels * LEVEL_HEIGHT)
  const height = building.onCampus ? campusHeight : Math.min(campusHeight, 5)
  const roofExtra = info?.id === 'maxwell' ? 13 : info?.id === 'obelisco' ? 20 : info?.id === 'coliseo' ? 7.8 : info?.id === 'pagoda' ? 3 : 3.5
  const base = buildingFoundationBase(building.ring)
  const grade = campusSlopeOffsetAt(building.center)
  const geometry = useMemo(() => {
    const body = new ExtrudeGeometry(shape, { depth: (info?.id === 'einstein' ? HALL_TUNNEL.ceiling : height) + grade - base, bevelEnabled: false })
    const uv = body.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.4, uv.getY(i) / 2.4)
    uv.needsUpdate = true
    return body
  }, [shape, height, info?.id, grade, base])
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
  const groundY = (info?.id === 'hayek' ? 0 : CAMPUS_ELEVATION) + (['coliseo','banos-deportes'].includes(info?.id ?? '') ? 0 : grade)
  const pin = PIN_POSITIONS[info?.id ?? '']
  return (
    <group position={[0,groundY,0]}>
      {info?.id === 'banos-deportes' ? <SportsAnnex materials={materials} onSelect={() => onSelect('banos-deportes')} /> : info?.id === 'coliseo' ? <ColiseoBuilding materials={materials} onSelect={() => onSelect('coliseo')} /> : info?.id === 'miguel-de-santiago' ? <MiguelBuilding materials={materials} onSelect={() => onSelect('miguel-de-santiago')} /> : info?.id === 'pagoda' ? <Pagoda materials={materials} onSelect={() => onSelect('pagoda')} /> : <mesh
        geometry={geometry}
        position={[0, base - grade, 0]}
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
      {selected && !pin && info?.id !== 'miguel-de-santiago' && <Line points={building.ring.map(([x, y]) => toScene(x, y, 0.8))} color={COLOR.red} lineWidth={0.35} worldUnits raycast={() => null} />}
      {selected && <DestinationMarker position={pin ? toScene(...pin, terrainHeightAt(pin) + 10 - groundY) : toScene(...building.center, height + roofExtra)} buildingId={info?.id} name={building.name} />}
      {props.labelled && building.name && !selected && (
        <MapLabel text={building.name} position={toScene(...building.center, height + roofExtra + 4)} depthTest={false} priority={labelPriority(building, false)} />
      )}
    </group>
  )
}

function UserMarker({ position }: { position: Vec2 }) {
  return (
    <group position={toScene(...position, terrainHeightAt(position) + .15)}>
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
          <Line points={path} color="#ffffff" lineWidth={11} depthTest={false} renderOrder={5} />
          <Line points={path} color={COLOR.red} lineWidth={6} depthTest={false} renderOrder={6} />
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
      {path.length > 1 && <EndDot position={path[path.length - 1]} />}
      <OriginMarker position={at(start)} toward={path[Math.min(1, path.length - 1)] ?? at(start)} />
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
