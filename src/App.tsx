import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CampusScene } from './components/CampusScene'
import type { MapCameraHandle } from './components/MapCamera'
import { BUILDING_BY_ID, BUILDINGS } from './data/buildings'
import { PLANS } from './data/plans'
import { endpointForBuilding, endpointForPosition, findOutdoorRoute } from './lib/outdoor'
import { findRoute, floorName } from './lib/pathfinding'
import { search, type SearchResult } from './lib/search'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './lib/maxwell'
import { HALL_ENTRANCE, hallToCampus } from './lib/hall'
import { HALL_FLAGS_VIEW } from './lib/hallFlags'
import { HALL_MINI_CENTER } from './lib/hallMiniPlaza'
import { HALL_PASSAGE, HALL_TUNNEL } from './lib/hallPassage'
import { MIGUEL_ENTRANCE, miguelToCampus } from './lib/miguel'
import { DA_VINCI_PASSAGE, daVinciToCampus } from './lib/daVinci'
import { DA_VINCI_FRONT, daVinciFrontToCampus } from './lib/daVinciPlaza'
import { HAYEK_ENTRANCE, HAYEK_APICE, HAYEK_LOWER_FLOORS, hayekToCampus } from './lib/hayek'
import { MIGUEL_GARDEN_ENTRANCE, miguelGardenToCampus } from './lib/miguelGarden'
import { CAMPUS_SLOPE, campusBaseHeightAt } from './lib/campusSlope'
import { PAGODA, PAGODA_STAIR_FOOT } from './lib/pagoda'
import { CASITA, casitaToCampus } from './lib/casita'
import { EPICURO_FRONT, epicuroToCampus } from './lib/epicuro'
import { NEWTON_ENTRANCE, newtonToCampus } from './lib/newton'
import { GALILEO_ENTRANCE, galileoToCampus } from './lib/galileo'
import { useGeolocation } from './lib/useGeolocation'
import type { BuildingPlan } from './types'
import { CampusGuide, SourcesDialog } from './components/CampusGuide'
import { LOCATIONS, MAP_NUMBERS, SOURCES } from './data/references'

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
  const [names, setNames] = useState(true)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [guideCollapsed, setGuideCollapsed] = useState(false)
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
    setQuery('')
    const targetPlan = PLANS[result.buildingId]
    if (!targetPlan) return
    // Start on the floor where the user is; they switch floors as they follow the steps.
    const origin = targetPlan.nodes.find((n) => n.id === pickIndoorOrigin(targetPlan))
    setActiveFloor(result.kind === 'room' && origin ? origin.floor : targetPlan.floors[0])
  }, [])

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
  const place = destination?.kind === 'room' ? `${building?.name}, ${floorName(floor ?? 1, building?.id)}` : roomCode ? `${building?.name} · ${floorLabel}` : landmark ? `${building?.name} · ${floorLabel}` : 'Edificio'

  const steps: string[] = []
  if (outdoorRoute && building) {
    const from = originId === GPS ? 'Desde tu ubicación, sigue' : `Sal de ${BUILDING_BY_ID.get(originId)?.name} y sigue`
    steps.push(`${from} la línea roja hasta ${building.name}.`)
    if (outdoorRoute.unmapped > 0) {
      steps.push('El tramo punteado no está en nuestro mapa de senderos: es una línea recta de guía, busca el camino más cercano.')
    }
  }
  if (outdoorRoute?.usesHallPassage) steps.push('Recorre el pasillo exterior, con gradas a la derecha de la entrada del Hall. La puerta de Einstein está a la derecha del pasillo, justo antes del túnel.')
  if (outdoorRoute?.usesBridge) steps.push('Cruza por el puente peatonal elevado hacia Hayek; el recorrido pasa por encima de la vía.')
  if (outdoorRoute && (building?.id === 'newton' || originId === 'newton')) steps.push('La entrada de Newton mira a la laguna, junto a Galileo.')
  if (outdoorRoute && (building?.id === 'galileo' || originId === 'galileo')) steps.push('El acceso de Galileo está frente a la laguna: las gradas suben al portal acristalado.')
  if (route) {
    steps.push(...(outdoorRoute ? route.steps.slice(1) : route.steps))
  } else if (landmark) {
    steps.push('Ápice es la cafetería y punto de encuentro del piso 0 de Hayek, debajo de la terraza del puente. Desde el acceso del puente hay que bajar a ese nivel; el recorrido interior aún no está trazado.')
  } else if (floor !== undefined) {
    steps.push(`${reference ? 'La referencia publicada indica' : 'El código se interpreta como'}: ${floorName(floor, building?.id)}. La puerta y el recorrido interior están pendientes de verificar.`)
  }

  return (
    <div className="app">
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
        names={names}
      />

      <div className="brand-bar"><div className="brand"><span className="brand-mark">U</span><div><strong>USFQ<span>Explora</span></strong><small>Campus Santiago Gangotena</small></div></div><span className="exhibit-label">Cumbayá, Ecuador <i /> Casa abierta</span></div>

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

      {!destination && !query && <CampusGuide collapsed={guideCollapsed} onToggle={() => setGuideCollapsed((value) => !value)} onSelectBuilding={selectBuilding} onPagoda={() => selectBuilding('pagoda')} onSports={() => mapCamera.current?.flyTo({ center: [-25, -97], span: 140, aboveThePanel: false })} />}

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
        <button className="building-label-toggle" role="switch" aria-checked={names} onClick={() => setNames((visible) => !visible)}>
          <span>Nombres de edificios</span>
          <span className="names-switch" aria-hidden="true" />
        </button>
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

          {building?.id === 'maxwell' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: maxwellToCampus([0, 8]), span: narrow ? 28 : 42, aboveThePanel: true, azimuth: MAXWELL_ENTRANCE.angle, height: 4.6, tilt: 0.68 })
          }}>Ver patio y dragón <span aria-hidden="true">↗</span></button>}

          {building?.id === 'maxwell' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: maxwellToCampus([-27.5, -4.5]), span: narrow ? 16 : 32, aboveThePanel: true, azimuth: MAXWELL_ENTRANCE.angle + Math.PI / 2 + 0.3, height: 3, tilt: 0.72 })
          }}>Ver patio del bus <span aria-hidden="true">↗</span></button>}

          {['hall-principal','einstein'].includes(building?.id ?? '') && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: hallToCampus([HALL_PASSAGE.center, -1.5]), span: narrow ? 24 : 30, aboveThePanel: true, azimuth: HALL_ENTRANCE.angle, height: 2.5, tilt: .92 })
          }}>Ver paso Hall–Einstein <span aria-hidden="true">↗</span></button>}

          {['hall-principal','einstein'].includes(building?.id ?? '') && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({center:hallToCampus([HALL_PASSAGE.center,HALL_TUNNEL.mouth+.8]),span:narrow?12:15,aboveThePanel:true,azimuth:HALL_ENTRANCE.angle,height:1.9,tilt:1.38})
          }}>Ver túnel y rampa <span aria-hidden="true">↗</span></button>}

          {building?.id === 'hall-principal' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:hallToCampus(HALL_MINI_CENTER),span:narrow?24:32,aboveThePanel:true,azimuth:HALL_ENTRANCE.angle+.15,height:2,tilt:.9})
          }}>Ver plazoleta lateral <span aria-hidden="true">↗</span></button>}

          {building?.id === 'hall-principal' && <button className="entrance-button" onClick={()=>mapCamera.current?.flyTo({center:HALL_FLAGS_VIEW,span:46,aboveThePanel:true,azimuth:HALL_ENTRANCE.angle,height:3,tilt:1.1})}>Ver reja y banderas <span aria-hidden="true">↗</span></button>}

          {building?.id === 'miguel-de-santiago' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: miguelToCampus([-3, 3]), span: narrow ? 46 : 50, aboveThePanel: true, azimuth: MIGUEL_ENTRANCE.angle - .35, height: 5.5, tilt: 1.05 })
          }}>Ver entrada y torre <span aria-hidden="true">↗</span></button>}

          {building?.id === 'miguel-de-santiago' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:miguelGardenToCampus([0,3]),span:narrow?30:40,aboveThePanel:true,azimuth:MIGUEL_GARDEN_ENTRANCE.angle+.14,height:5,tilt:1.12})
          }}>Ver entrada del jardín <span aria-hidden="true">↗</span></button>}

          {building?.id === 'epicuro' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:epicuroToCampus([19,5]),span:narrow?40:54,aboveThePanel:true,azimuth:EPICURO_FRONT.angle-.16,height:5,tilt:1.13})
          }}>Ver torre y fuente <span aria-hidden="true">↗</span></button>}

          {building?.id === 'newton' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:newtonToCampus([-2,9]),span:narrow?48:70,aboveThePanel:true,azimuth:NEWTON_ENTRANCE.angle,height:2,tilt:1.12})
          }}>Ver frente de Newton <span aria-hidden="true">↗</span></button>}

          {building?.id === 'galileo' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:galileoToCampus([3,15]),span:narrow?46:82,aboveThePanel:true,azimuth:GALILEO_ENTRANCE.angle-.55,height:2,tilt:1.1})
          }}>Ver entrada y laguna <span aria-hidden="true">↗</span></button>}

          {building?.id === 'da-vinci' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: daVinciToCampus([20, 5]), span: narrow ? 26 : 32, aboveThePanel: true, azimuth: DA_VINCI_PASSAGE.angle - Math.PI / 2 + 0.22, height: 3.8, tilt: 1.3 })
          }}>Ver fachada hacia Maxwell <span aria-hidden="true">↗</span></button>}

          {building?.id === 'da-vinci' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({center:daVinciFrontToCampus([20,10]),span:narrow?40:52,aboveThePanel:true,azimuth:DA_VINCI_FRONT.angle-.2,height:4.5,tilt:1.02})
          }}>Ver plaza y columnas <span aria-hidden="true">↗</span></button>}

          {building?.id === 'da-vinci' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({center:daVinciFrontToCampus([19,17]),span:narrow?34:44,aboveThePanel:true,azimuth:2.88,height:3.5,tilt:.95})
          }}>Ver pileta y toldo <span aria-hidden="true">↗</span></button>}

          {building?.id === 'pagoda' && <button className="entrance-button" onClick={()=>mapCamera.current?.flyTo({center:PAGODA_STAIR_FOOT,span:30,aboveThePanel:true,azimuth:PAGODA.angle-Math.PI/2,height:1.8,tilt:1.1})}>Ver gradas de la Pagoda <span aria-hidden="true">↗</span></button>}
          {building?.id === 'pagoda' && <button className="entrance-button" onClick={()=>{
            const center:[number,number]=[(CAMPUS_SLOPE.start[0]+CAMPUS_SLOPE.end[0])/2,(CAMPUS_SLOPE.start[1]+CAMPUS_SLOPE.end[1])/2]
            mapCamera.current?.flyTo({center,span:95,aboveThePanel:true,azimuth:-.7,height:campusBaseHeightAt(center)+2,tilt:1.1})
          }}>Ver bajada hacia el puente <span aria-hidden="true">↗</span></button>}

          {building?.id === 'gobe' && <button className="entrance-button" onClick={() => {
            const narrow=window.innerWidth<760
            mapCamera.current?.flyTo({center:casitaToCampus([0,1]),span:narrow?16:22,aboveThePanel:true,azimuth:CASITA.angle+.25,height:3.8,tilt:1.1})
          }}>Ver fachada de la casita <span aria-hidden="true">↗</span></button>}

          {building?.id === 'hayek' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: hayekToCampus([(HAYEK_ENTRANCE.portalX + HAYEK_ENTRANCE.door[0]) / 2, 6]), span: narrow ? 26 : 38, aboveThePanel: true, azimuth: HAYEK_ENTRANCE.angle + 0.15, height: 9, tilt: 1.05 })
          }}>Ver entrada y puente <span aria-hidden="true">↗</span></button>}

          {building?.id === 'hayek' && <button className="entrance-button" onClick={() => {
            const narrow = window.innerWidth < 760
            mapCamera.current?.flyTo({ center: hayekToCampus([HAYEK_APICE.center + 2, 3]), span: narrow ? 22 : 26, aboveThePanel: true, azimuth: HAYEK_ENTRANCE.angle + .07, height: 3.2, tilt: 1.42 })
          }}>Ver Ápice · piso 0 <span aria-hidden="true">↗</span></button>}

          {['gobe','hall-principal'].includes(building?.id??'') && <button className="entrance-button" onClick={()=>mapCamera.current?.flyToAnimal('gaston')}>Ver a Gastón <span aria-hidden="true">↗</span></button>}
          {building?.id === 'miguel-de-santiago' && <button className="entrance-button" onClick={()=>mapCamera.current?.flyToAnimal('pancho')}>Ver a Pancho y Pancha <span aria-hidden="true">↗</span></button>}

          {building?.id === 'hayek' && <div className="hayek-levels">
            <h2>Niveles de Hayek</h2>
            <p>El acceso del puente está por encima de Ápice.</p>
            <ul>{HAYEK_LOWER_FLOORS.map(({floor:level,label,use})=><li key={level}><strong>Piso {level} · {label}</strong><span>{use}</span></li>)}</ul>
            {!landmark && <button className="entrance-button" onClick={()=>choose(search('Ápice')[0])}>Ápice · cafetería y punto de encuentro <span aria-hidden="true">↗</span></button>}
          </div>}

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
          {!plan && <p className="note">{building?.id === 'hayek' ? 'La ruta exterior llega a la entrada del puente. Ápice está abajo, en el piso 0; el plano interior y las rutas a los subsuelos aún no están disponibles.' : 'La ruta llega al exterior del edificio, a un acceso aproximado. El plano interior aún no está disponible.'}</p>}
          {plan?.placeholder && <p className="warning">Plano de ejemplo: las aulas y pasillos aún no son los reales.</p>}
          {buildingLocations.length > 0 && !roomCode && <div className="location-list"><h2>Aulas y oficinas documentadas</h2>{buildingLocations.map((location) => <button key={location.code} onClick={() => choose(search(location.code)[0])}><strong>{location.code}</strong><span>{floorName(location.floor, building?.id)} · {location.historical ? 'histórica' : location.label}</span><span aria-hidden="true">↗</span></button>)}</div>}
        </section>
      )}
      <footer className="map-footer"><span><i className="legend-dot" /> Modelo 3D · detalles visuales aproximados</span><button onClick={() => setSourcesOpen(true)}>Fuentes y cobertura ↗</button><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></footer>
      {sourcesOpen && <SourcesDialog onClose={() => setSourcesOpen(false)} />}
    </div>
  )
}
