import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CampusScene } from './components/CampusScene'
import type { MapCameraHandle } from './components/MapCamera'
import { BUILDING_BY_ID, BUILDINGS } from './data/buildings'
import { PLANS } from './data/plans'
import { endpointForBuilding, endpointForPosition, findOutdoorRoute } from './lib/outdoor'
import { findRoute, floorName } from './lib/pathfinding'
import { search, type SearchResult } from './lib/search'
import { useGeolocation } from './lib/useGeolocation'
import type { BuildingPlan } from './types'
import { CampusGuide, SourcesDialog } from './components/CampusGuide'
import { LOCATIONS, MAP_NUMBERS, SOURCES } from './data/references'
import type { WalkAction } from './components/WalkCamera'
import { CAMPUS_BOUNDARY, findCampusBuilding } from './lib/campus'
import { pointInPolygon } from './lib/geo'

const GPS = 'gps'
// Building next to the main gate on the official campus map.
const DEFAULT_ORIGIN = 'miguel-de-santiago'
// Places visitors ask for most, offered before they type anything.
const SHORTCUTS = [
  { label: 'Biblioteca', buildingId: 'ciceron' },
  { label: 'Hall Principal', buildingId: 'hall-principal' },
  { label: 'Coliseo', buildingId: 'coliseo' },
  { label: 'Hayek', buildingId: 'hayek' },
]

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
  const [walking, setWalking] = useState(false)
  const [names, setNames] = useState(true)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const walkInput = useRef(new Set<WalkAction>())
  const exitWalk = useCallback(() => setWalking(false), [])
  const mapCamera = useRef<MapCameraHandle>(null)
  const compassNeedle = useRef<SVGSVGElement>(null)

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

  function choose(result: SearchResult) {
    setDestination(result)
    setQuery('')
    const targetPlan = PLANS[result.buildingId]
    if (!targetPlan) return
    // Start on the floor where the user is; they switch floors as they follow the steps.
    const origin = targetPlan.nodes.find((n) => n.id === pickIndoorOrigin(targetPlan))
    setActiveFloor(result.kind === 'room' && origin ? origin.floor : targetPlan.floors[0])
  }

  function selectBuilding(buildingId: string) {
    const info = BUILDING_BY_ID.get(buildingId)
    if (info) choose({ kind: 'building', key: info.id, buildingId, title: info.name, subtitle: 'Edificio' })
  }

  // What the door sign would say, when the destination is a room rather than a whole building.
  const roomCode = destination?.kind === 'room' ? destination.node.code : destination?.floor !== undefined ? destination.title : undefined
  const floor = destination?.kind === 'room' ? destination.node.floor : destination?.floor
  const floorLabel = floorName(floor ?? 1).replace(/^./, (letter) => letter.toUpperCase())
  const heading = destination?.kind === 'room' ? (destination.node.label ?? destination.title) : reference ? reference.label : roomCode ? `Edificio ${building?.name}` : building?.name
  const place = destination?.kind === 'room' ? `${building?.name}, ${floorName(floor ?? 1)}` : roomCode ? `${building?.name} · ${floorLabel}` : 'Edificio'

  const steps: string[] = []
  if (outdoorRoute && building) {
    const from = originId === GPS ? 'Desde tu ubicación, sigue' : `Sal de ${BUILDING_BY_ID.get(originId)?.name} y sigue`
    steps.push(`${from} la línea roja hasta ${building.name}.`)
    if (outdoorRoute.unmapped > 0) {
      steps.push('El tramo punteado no está en nuestro mapa de senderos: es una línea recta de guía, busca el camino más cercano.')
    }
  }
  if (outdoorRoute?.usesBridge) steps.push('Cruza por el puente peatonal elevado hacia Hayek; el recorrido pasa por encima de la vía.')
  if (route) {
    steps.push(...(outdoorRoute ? route.steps.slice(1) : route.steps))
  } else if (floor !== undefined) {
    steps.push(`${reference ? 'La referencia publicada indica' : 'El código se interpreta como'}: ${floorName(floor)}. La puerta y el recorrido interior están pendientes de verificar.`)
  }

  return (
    <div className={`app${walking ? ' walking' : ''}`}>
      <CampusScene
        selectedBuildingId={destination?.buildingId}
        plan={plan}
        route={route}
        outdoorRoute={outdoorRoute}
        originId={originId}
        userPosition={gps.position}
        activeFloor={activeFloor}
        onSelectBuilding={selectBuilding}
        cameraRef={mapCamera}
        onViewChange={handleViewChange}
        walking={walking}
        names={names}
        walkInput={walkInput}
        onExitWalk={exitWalk}
      />

      <div className="brand-bar"><div className="brand"><span className="brand-mark">U</span><div><strong>USFQ<span>Explora</span></strong><small>Campus Santiago Gangotena</small></div></div><span className="exhibit-label">Cumbayá, Ecuador <i /> Casa abierta</span></div>

      {!walking && <>
      <header className="search">
        <div className="search-field">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) choose(results[0]) }}
            placeholder="¿A dónde vas? Prueba M302 o Galileo"
            aria-label="Buscar aula o edificio"
          />
        </div>
        {results.length > 0 && (
          <ul className="results">
            {results.map((result) => (
              <li key={result.key}>
                <button onClick={() => choose(result)}>
                  <strong>{result.title}</strong>
                  <span>{result.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && <p className="empty-results" role="status">No encontramos ese lugar. Prueba con un edificio o un código como M302.</p>}
        {!query && !destination && (
          <div className="shortcuts">
            {SHORTCUTS.map((shortcut) => (
              <button key={shortcut.buildingId} onClick={() => selectBuilding(shortcut.buildingId)}>
                {shortcut.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {!destination && !query && <CampusGuide onSelectBuilding={selectBuilding} onWalk={() => setWalking(true)} onSports={() => mapCamera.current?.flyTo({ center: [-25, -97], span: 140, aboveThePanel: false })} />}

      {plan && plan.floors.length > 1 && (
        <nav className="floors" aria-label="Piso">
          {[...plan.floors].reverse().map((level) => (
            <button key={level} className={level === activeFloor ? 'active' : ''} onClick={() => setActiveFloor(level)}>
              {level === 0 ? 'S' : level}
            </button>
          ))}
        </nav>
      )}

      <div className="map-controls">
        <button aria-label={names ? 'Ocultar nombres' : 'Mostrar nombres'} aria-pressed={names} onClick={() => setNames(!names)}>Aa</button>
        <button onClick={() => mapCamera.current?.faceNorth()} aria-label="Orientar al norte" title="Orientar al norte">
          <svg ref={compassNeedle} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 2.5 16 12H8z" fill="var(--red)" />
            <path d="M12 21.5 8 12h8z" fill="#b9bdbb" />
          </svg>
        </button>
        <button onClick={() => mapCamera.current?.setTilted(!tilted)} aria-label={tilted ? 'Ver en 2D' : 'Ver en 3D'}>
          {tilted ? '2D' : '3D'}
        </button>
        <button
          className={originId === GPS ? 'active' : ''}
          onClick={locateMe}
          aria-label="Ir a mi ubicación"
          title="Ir a mi ubicación"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
        <button className="zoom" onClick={() => mapCamera.current?.zoomBy(0.6)} aria-label="Acercar">
          +
        </button>
        <button className="zoom" onClick={() => mapCamera.current?.zoomBy(1.6)} aria-label="Alejar">
          −
        </button>
      </div>
      {!destination && originId === GPS && gps.error && <p className="toast">{gps.error}</p>}

      {destination && (
        <section className="panel">
          <button className="close" onClick={() => setDestination(null)} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div className="destination">
            {roomCode && <span className="door-sign">{roomCode}</span>}
            <div>
              <h1>{heading}</h1>
              <p>{place}</p>
            </div>
          </div>

          {MAP_NUMBERS[building?.id ?? ''] && <p className="official-number">N.º {MAP_NUMBERS[building!.id]} en el mapa oficial USFQ de 2023</p>}
          {reference && <div className="reference-note"><span className="status-tag">{reference.historical ? 'Referencia histórica' : 'Referencia publicada por USFQ'}</span><a href={SOURCES[reference.source].url} target="_blank" rel="noreferrer">{SOURCES[reference.source].title} ↗</a>{reference.historical && <p>Confirma que el código siga vigente. La fuente es anterior a esta versión del mapa.</p>}</div>}
          {destination.kind === 'building' && destination.inferred && <p className="warning">Código interpretado por su prefijo y numeración. La existencia de esta aula no está confirmada.</p>}

          {outdoorRoute && (
            <p className="walk">
              <strong>{outdoorRoute.minutes} min</strong> a pie, unos {Math.round(outdoorRoute.distance / 10) * 10} m
            </p>
          )}

          <label className="origin">
            Desde
            <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
              <option value={GPS}>Mi ubicación (GPS)</option>
              {SORTED_BUILDINGS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {originId === GPS && !gps.position && <p className={gps.error ? 'warning' : 'note'}>{gps.error ?? 'Buscando tu ubicación…'}</p>}

          {steps.length > 0 && (
            <ol className="steps">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {!plan && <p className="note">La ruta llega al exterior del edificio, a un acceso aproximado. El plano interior aún no está disponible.</p>}
          {plan?.placeholder && <p className="warning">Plano de ejemplo: las aulas y pasillos aún no son los reales.</p>}
          {buildingLocations.length > 0 && !roomCode && <div className="location-list"><h2>Aulas y oficinas documentadas</h2>{buildingLocations.map((location) => <button key={location.code} onClick={() => choose(search(location.code)[0])}><strong>{location.code}</strong><span>{floorName(location.floor)} · {location.historical ? 'histórica' : location.label}</span><span aria-hidden="true">↗</span></button>)}</div>}
          {!canWalkHere && <p className="note">Este lugar queda fuera del perímetro del recorrido a pie. Puedes explorar el campus principal.</p>}
          <button className="walk-button panel-walk" onClick={() => { if (!canWalkHere) setDestination(null); setWalking(true) }}>{canWalkHere ? 'Explorar este sector a pie' : 'Recorrer el campus principal'} <span aria-hidden="true">↗</span></button>
        </section>
      )}
      </>}

      {walking && <>
        <div className="walking-banner"><span className="status-tag">Recorrido exterior</span><h1>Camina por el campus</h1><p>WASD para caminar · flechas para girar<br />Arrastra para mirar · Esc para volver</p><button onClick={exitWalk}>Volver al mapa <span aria-hidden="true">↗</span></button></div>
        <div className="crosshair" aria-hidden="true">＋</div>
        <nav className="walk-pad" aria-label="Controles para caminar">
          {([['turnLeft', '↶', 'Girar a la izquierda'], ['forward', '↑', 'Avanzar'], ['turnRight', '↷', 'Girar a la derecha'], ['left', '←', 'Mover a la izquierda'], ['back', '↓', 'Retroceder'], ['right', '→', 'Mover a la derecha']] as const).map(([action, label, name]) => <button key={action} aria-label={name}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); walkInput.current.add(action) }}
            onPointerUp={() => walkInput.current.delete(action)} onPointerCancel={() => walkInput.current.delete(action)} onLostPointerCapture={() => walkInput.current.delete(action)}
            onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); walkInput.current.add(action) } }}
            onKeyUp={() => walkInput.current.delete(action)} onBlur={() => walkInput.current.delete(action)}>{label}</button>)}
        </nav>
      </>}
      <footer className="map-footer"><span><i className="legend-dot" /> {walking ? 'Exterior · desniveles y puente peatonal' : 'Modelo 3D · detalles visuales aproximados'}</span><button onClick={() => setSourcesOpen(true)}>Fuentes y cobertura ↗</button><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></footer>
      {sourcesOpen && <SourcesDialog onClose={() => setSourcesOpen(false)} />}
    </div>
  )
}
