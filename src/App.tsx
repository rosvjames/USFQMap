import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CampusScene } from './components/CampusScene'
import type { MapCameraHandle } from './components/MapCamera'
import { BUILDING_BY_ID, BUILDINGS } from './data/buildings'
import { PLANS } from './data/plans'
import { endpointForBuilding, endpointForPosition, findOutdoorRoute } from './lib/outdoor'
import { findRoute, floorName } from './lib/pathfinding'
import { search, type SearchResult } from './lib/search'
import { HAYEK_LOWER_FLOORS } from './lib/hayek'
import { COLISEO_CENTER, COLISEO_INTERIOR_VISIBLE } from './lib/coliseoInterior'
import { ACADEMIC_COMPLEX, ACADEMIC_COMPLEX_CENTER, complexFloorElevation, isAcademicComplexBuilding } from './lib/academicComplex'
import { useGeolocation } from './lib/useGeolocation'
import type { BuildingPlan } from './types'
import { SourcesDialog } from './components/SourcesDialog'
import { HomeSheet } from './components/HomeSheet'
import { DestinationSheet } from './components/DestinationSheet'
import { NavigationView } from './components/NavigationView'
import { useSplashExit } from './components/SplashScreen'
import { BackIcon, InfoIcon, LayersIcon, LocateIcon } from './components/icons'
import { viewsFor } from './lib/buildingViews'
import { useKeyboardInset } from './lib/useSheetGestures'
import { LOCATIONS, MAP_NUMBERS } from './data/references'
import { clearWalkInput, type WalkInputState } from './lib/walkInput'
import type { CampusAnimalId } from './lib/campusAnimals'
import { WalkControls } from './components/WalkControls'
import { CAMPUS_BOUNDARY, findCampusBuilding } from './lib/campus'
import { pointInPolygon } from './lib/geo'

const GPS = 'gps'
// Building next to the main gate on the official campus map.
const DEFAULT_ORIGIN = 'miguel-de-santiago'
// QR codes on site link to "?desde=<building id or indoor node id>" so the route starts where the user is standing.
const originFromUrl = new URLSearchParams(window.location.search).get('desde')

function initialOrigin(): string {
  if (!originFromUrl) return DEFAULT_ORIGIN
  if (BUILDING_BY_ID.has(originFromUrl)) return originFromUrl
  const owner = Object.values(PLANS).find((plan) => plan.nodes.some((n) => n.id === originFromUrl))
  return owner?.buildingId ?? DEFAULT_ORIGIN
}

function pickIndoorOrigin(plan: BuildingPlan): string {
  if (originFromUrl && plan.nodes.some((n) => n.id === originFromUrl)) return originFromUrl
  return (plan.nodes.find((n) => n.kind === 'entrance') ?? plan.nodes[0]).id
}

const SORTED_BUILDINGS = [...BUILDINGS].sort((a, b) => a.name.localeCompare(b.name, 'es'))

export default function App() {
  const [query, setQuery] = useState('')
  const [destination, setDestination] = useState<SearchResult | null>(null)
  const [originId, setOriginId] = useState(initialOrigin)
  const [activeFloor, setActiveFloor] = useState(1)
  const gps = useGeolocation(originId === GPS)
  const [tilted, setTilted] = useState(true)
  const [names, setNames] = useState(true)
  const [interiorOpen, setInteriorOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [navStep, setNavStep] = useState(0)
  const [sceneReady, setSceneReady] = useState(false)
  const markSceneReady = useCallback(() => setSceneReady(true), [])
  const [walking, setWalking] = useState(false)
  const [nearbyAnimal, setNearbyAnimal] = useState<CampusAnimalId|null>(null)
  const walkInput = useRef<WalkInputState>({actions:new Set(),movement:[0,0]})
  const exitWalk = useCallback(() => { clearWalkInput(walkInput.current); setNearbyAnimal(null); setWalking(false) }, [])
  const mapCamera = useRef<MapCameraHandle>(null)
  const compassNeedle = useRef<SVGSVGElement>(null)
  useKeyboardInset()
  useSplashExit(sceneReady)

  // Gastón's gestures stop while the tab is hidden.
  useEffect(() => {
    const pauseMascot = () => document.documentElement.classList.toggle('gaston-pausado', document.hidden)
    pauseMascot()
    document.addEventListener('visibilitychange', pauseMascot)
    return () => {
      document.removeEventListener('visibilitychange', pauseMascot)
      document.documentElement.classList.remove('gaston-pausado')
    }
  }, [])

  // The compass turns on every frame of a rotation, so it is moved directly instead of through state.
  const handleViewChange = useCallback((azimuth: number, isTilted: boolean) => {
    if (compassNeedle.current) compassNeedle.current.style.rotate = `${azimuth}rad`
    setTilted(isTilted)
  }, [])

  // Set by the locate button: the map flies to the user once, on the next GPS reading, and then leaves them free to pan.
  const locating = useRef(false)
  const showingDestination = !!destination
  useEffect(() => {
    if (!locating.current || !gps.position) return
    locating.current = false
    mapCamera.current?.flyTo({ center: gps.position, span: 140, aboveThePanel: showingDestination })
  }, [gps.position, showingDestination])

  function locateMe() {
    // With a destination open, switching the origin to GPS already reframes the route.
    locating.current = !destination || originId === GPS
    setOriginId(GPS)
    if (locating.current && gps.position) {
      locating.current = false
      mapCamera.current?.flyTo({ center: gps.position, span: 140, aboveThePanel: showingDestination })
    }
  }

  const results = useMemo(() => search(query), [query])
  const building = destination ? BUILDING_BY_ID.get(destination.buildingId) : undefined
  const plan = destination ? PLANS[destination.buildingId] : undefined
  const reference = destination?.kind === 'building' ? destination.reference : undefined
  const buildingLocations = LOCATIONS.filter((location) => location.buildingId === destination?.buildingId)
  const footprint = building && findCampusBuilding(building.id)
  const canWalkHere = footprint && (pointInPolygon(footprint.center, CAMPUS_BOUNDARY) || building?.id === 'hayek')
  function startWalk() {
    if(destination && !canWalkHere)closeDestination()
    clearWalkInput(walkInput.current)
    setWalking(true)
  }
  const route = useMemo(
    () => (plan && destination?.kind === 'room' ? findRoute(plan, pickIndoorOrigin(plan), destination.node.id) : null),
    [plan, destination],
  )
  const outdoorRoute = useMemo(() => {
    if (!destination || originId === destination.buildingId) return null
    const from = originId === GPS ? gps.position && endpointForPosition(gps.position) : endpointForBuilding(originId)
    const to = endpointForBuilding(destination.buildingId)
    return from && to ? findOutdoorRoute(from, to) : null
  }, [destination, originId, gps.position])

  const choose = useCallback((result: SearchResult) => {
    setDestination(result)
    setNavigating(false)
    setInteriorOpen(false)
    setQuery('')
    const targetPlan = PLANS[result.buildingId]
    if (!targetPlan) return
    // Start on the floor where the user is; they switch floors as they follow the steps.
    const origin = targetPlan.nodes.find((n) => n.id === pickIndoorOrigin(targetPlan))
    setActiveFloor(result.kind === 'room' && origin ? origin.floor : targetPlan.floors[0])
  }, [])

  function closeDestination() {
    setDestination(null)
    setNavigating(false)
  }

  const selectBuilding = useCallback((buildingId: string) => {
    const info = BUILDING_BY_ID.get(buildingId)
    if (info) choose({ kind: 'building', key: info.id, buildingId, title: info.name, subtitle: 'Edificio' })
  }, [choose])

  // What the door sign would say, when the destination is a room rather than a whole building.
  const landmark = destination?.kind === 'building' && destination.landmark
  const roomCode = destination?.kind === 'room' ? destination.node.code : destination?.floor !== undefined && !landmark ? destination.title : undefined
  const floor = destination?.kind === 'room' ? destination.node.floor : destination?.floor
  const floorLabel = floorName(floor ?? 1, building?.id).replace(/^./, (letter) => letter.toUpperCase())
  const heading = landmark ? destination.title : destination?.kind === 'room' ? (destination.node.label ?? destination.title) : reference ? reference.label : roomCode ? `Edificio ${building?.name}` : building?.name

  const steps: string[] = []
  if (outdoorRoute && building) {
    const from = originId === GPS ? 'Desde tu ubicación, sigue' : `Sal de ${BUILDING_BY_ID.get(originId)?.name} y sigue`
    steps.push(`${from} la línea roja hasta ${building.name}.`)
    if (outdoorRoute.unmapped > 0) {
      steps.push('El tramo punteado no está en nuestro mapa de senderos: es una línea recta de guía, busca el camino más cercano.')
    }
  }
  if (outdoorRoute?.usesHallPassage) steps.push('Recorre el pasillo exterior, con gradas a la derecha de la entrada del Hall. La puerta de Einstein está a la derecha del pasillo, justo antes del túnel.')
  if (outdoorRoute?.crossesHall) steps.push('Atraviesa el Hall Principal desde su entrada y sal por el patio trasero: la plaza de Da Vinci queda al frente y el paso hacia el patio de Maxwell, a la derecha.')
  if (outdoorRoute?.usesBridge) steps.push('Cruza por el puente peatonal elevado hacia Hayek; el recorrido pasa por encima de la vía.')
  if (outdoorRoute && (building?.id === 'newton' || originId === 'newton')) steps.push('La entrada de Newton mira a la laguna, junto a Galileo.')
  if (outdoorRoute && (building?.id === 'galileo' || originId === 'galileo')) steps.push('El acceso de Galileo está frente a la laguna: las gradas suben al portal acristalado.')
  if (route) {
    steps.push(...(outdoorRoute ? route.steps.slice(1) : route.steps))
  } else if (landmark) {
    steps.push('Ápice es la cafetería y punto de encuentro del piso 0 de Hayek, debajo de la terraza del puente. Desde el acceso del puente hay que bajar a ese nivel; el recorrido interior aún no está trazado.')
  } else if (floor !== undefined) {
    steps.push(`Busca el aula en el ${floorName(floor, building?.id)} de ${building?.name}: ${reference ? 'el piso viene de la referencia publicada' : 'el piso se deduce del código'}; la puerta exacta aún no está verificada.`)
  }

  const titleText = roomCode ?? heading ?? ''
  const kicker = roomCode ? `Aula · ${building?.name}` : landmark ? building?.name ?? '' : 'Edificio'
  const sub = roomCode
    ? [floorLabel, reference?.historical && 'código histórico', destination?.kind === 'building' && destination.inferred && 'código por confirmar'].filter(Boolean).join(' · ')
    : landmark ? floorLabel : MAP_NUMBERS[building?.id ?? ''] ? `N.º ${MAP_NUMBERS[building!.id]} del mapa oficial` : undefined
  const walk = outdoorRoute ? { minutes: outdoorRoute.minutes, meters: Math.round(outdoorRoute.distance / 10) * 10 } : undefined
  const notice = originId === GPS && !gps.position ? gps.error ?? 'Buscando tu ubicación…' : plan?.placeholder ? 'Plano de ejemplo: las aulas y pasillos aún no son los reales.' : undefined
  const navigatingNow = navigating && steps.length > 0

  return (
    <div className={`app${walking ? ' walking' : ''}`}>
      <CampusScene
        selectedBuildingId={destination?.buildingId}
        plan={plan}
        interiorBuildingId={!interiorOpen ? undefined : COLISEO_INTERIOR_VISIBLE && building?.id === 'coliseo' ? 'coliseo' : ACADEMIC_COMPLEX.visible && isAcademicComplexBuilding(building?.id) ? ACADEMIC_COMPLEX.id : undefined}
        route={route}
        outdoorRoute={outdoorRoute}
        originId={originId}
        userPosition={gps.position}
        activeFloor={activeFloor}
        onSelectBuilding={selectBuilding}
        cameraRef={mapCamera}
        onViewChange={handleViewChange}
        names={names}
        walking={walking}
        walkInput={walkInput}
        onExitWalk={exitWalk}
        onNearbyAnimalChange={setNearbyAnimal}
        onReady={markSceneReady}
      />

      {!walking && <>
      {!destination && <h1 className="brand-pill">Explora <span>USFQ</span></h1>}

      {destination && !navigatingNow && (
        <div className="route-top">
          <button className="round-button" onClick={closeDestination} aria-label="Volver"><BackIcon /></button>
          <label className="origin-pill">
            <span className="origin-dot" aria-hidden="true" />
            <span className="origin-label">Desde</span>
            <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
              <option value={GPS}>Mi ubicación (GPS)</option>
              {SORTED_BUILDINGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {interiorOpen && ACADEMIC_COMPLEX.visible && isAcademicComplexBuilding(building?.id) && (
        <nav className="floors" aria-label="Piso">
          {[...ACADEMIC_COMPLEX.floors].reverse().map((level) => (
            <button key={level} className={level === activeFloor ? 'active' : ''} onClick={() => setActiveFloor(level)}>{level}</button>
          ))}
        </nav>
      )}

      {plan && plan.floors.length > 1 && (
        <nav className="floors" aria-label="Piso">
          {[...plan.floors].reverse().map((level) => (
            <button key={level} className={level === activeFloor ? 'active' : ''} onClick={() => setActiveFloor(level)}>
              {level === 0 ? 'S' : level}
            </button>
          ))}
        </nav>
      )}

      {!navigatingNow && <div className="map-controls" role="group" aria-label="Herramientas del mapa">
        <button className="round-button" aria-pressed={names} onClick={() => setNames((visible) => !visible)} aria-label="Nombres de edificios" title="Nombres de edificios"><LayersIcon /></button>
        <button className="round-button" onClick={() => mapCamera.current?.faceNorth()} aria-label="Orientar al norte" title="Orientar al norte">
          <svg ref={compassNeedle} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 2.5 16 12H8z" fill="var(--red)" />
            <path d="M12 21.5 8 12h8z" fill="#b9b8c0" />
          </svg>
        </button>
        <button className="round-button view-mode" onClick={() => mapCamera.current?.setTilted(!tilted)} aria-label={tilted ? 'Ver en 2D' : 'Ver en 3D'}>{tilted ? '2D' : '3D'}</button>
        <button className={`round-button locate${originId === GPS ? ' active' : ''}`} onClick={locateMe} aria-label="Ir a mi ubicación" title="Ir a mi ubicación"><LocateIcon /></button>
        <button className="round-button zoom" onClick={() => mapCamera.current?.zoomBy(0.6)} aria-label="Acercar">+</button>
        <button className="round-button zoom" onClick={() => mapCamera.current?.zoomBy(1.6)} aria-label="Alejar">−</button>
      </div>}
      {!destination && originId === GPS && gps.error && <p className="toast" role="status"><InfoIcon size={20} /><span>{gps.error}</span></p>}

      {!destination && (
        <HomeSheet
          query={query}
          onQuery={setQuery}
          results={results}
          onChoose={choose}
          onSelectBuilding={selectBuilding}
          onWalk={startWalk}
          onPagoda={() => selectBuilding('pagoda')}
          onSports={() => mapCamera.current?.flyTo({ center: [-25, -97], span: 140, aboveThePanel: true })}
          onSources={() => setSourcesOpen(true)}
        />
      )}

      {destination && !navigatingNow && (
        <DestinationSheet
          kicker={kicker}
          title={titleText}
          sub={sub}
          walk={walk}
          notice={notice}
          noticeMascot={originId === GPS && !gps.position}
          onGo={steps.length > 0 ? () => { setNavStep(0); setNavigating(true) } : undefined}
          views={viewsFor(building?.id)}
          onView={(view) => 'animal' in view ? mapCamera.current?.flyToAnimal(view.animal) : mapCamera.current?.flyTo(view.focus())}
          onWalk={startWalk}
          onClose={closeDestination}
        >
          {COLISEO_INTERIOR_VISIBLE && building?.id === 'coliseo' && <button className="chip" aria-pressed={interiorOpen} onClick={() => {
            if (!interiorOpen) mapCamera.current?.flyTo({ center: COLISEO_CENTER, span: window.innerWidth < 760 ? 52 : 64, aboveThePanel: true, azimuth: 0, height: 1, tilt: 0.5 })
            setInteriorOpen(!interiorOpen)
          }}>{interiorOpen ? 'Volver al exterior' : 'Ver interior · piso 1'}</button>}
          {ACADEMIC_COMPLEX.visible && isAcademicComplexBuilding(building?.id) && <button className="chip" aria-pressed={interiorOpen} onClick={() => {
            if (!interiorOpen) {
              setActiveFloor(1)
              mapCamera.current?.flyTo({ center: ACADEMIC_COMPLEX_CENTER, span: window.innerWidth < 760 ? 90 : 110, aboveThePanel: true, azimuth: 0, height: complexFloorElevation(1), tilt: 0.55 })
            }
            setInteriorOpen(!interiorOpen)
          }}>{interiorOpen ? 'Volver al exterior' : 'Ver interior · Galileo, Einstein, Darwin y Newton'}</button>}

          {building?.id === 'hayek' && <div className="sheet-section">
            <h2>Niveles de Hayek</h2>
            <p className="sub">El acceso del puente está por encima de Ápice.</p>
            <ul className="level-list">{HAYEK_LOWER_FLOORS.map(({ floor: level, label, use }) => <li key={level}><strong>Piso {level} · {label}</strong><span>{use}</span></li>)}</ul>
            {!landmark && <button className="chip" onClick={() => choose(search('Ápice')[0])}>Ápice · cafetería y punto de encuentro</button>}
          </div>}

          {buildingLocations.length > 0 && !roomCode && <div className="sheet-section">
            <h2>Aulas en este edificio</h2>
            <div className="location-list">{buildingLocations.map((location) => <button key={location.code} onClick={() => choose(search(location.code)[0])}><strong>{location.code}</strong><span>{floorName(location.floor, building?.id)}{location.historical ? ' · código histórico' : ''}</span></button>)}</div>
          </div>}
        </DestinationSheet>
      )}

      {destination && navigatingNow && <>
        <NavigationView steps={steps} step={Math.min(navStep, steps.length - 1)} onStep={setNavStep} walk={walk} destination={`${titleText}${building && titleText !== building.name ? ` · ${building.name}` : ''}`} onEnd={() => setNavigating(false)} />
        <button className={`round-button nav-locate${originId === GPS ? ' active' : ''}`} onClick={locateMe} aria-label="Ir a mi ubicación"><LocateIcon /></button>
      </>}
      </>}
      {walking && <WalkControls input={walkInput} onExit={exitWalk} nearbyAnimal={nearbyAnimal}/>}
      {sourcesOpen && <SourcesDialog onClose={() => setSourcesOpen(false)} />}
    </div>
  )
}
