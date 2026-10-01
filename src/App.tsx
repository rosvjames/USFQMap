import { useMemo, useState } from 'react'
import { CampusScene } from './components/CampusScene'
import { BUILDING_BY_ID, BUILDINGS } from './data/buildings'
import { PLANS } from './data/plans'
import { endpointForBuilding, endpointForPosition, findOutdoorRoute } from './lib/outdoor'
import { findRoute, floorName } from './lib/pathfinding'
import { search, type SearchResult } from './lib/search'
import { useGeolocation } from './lib/useGeolocation'
import type { BuildingPlan } from './types'

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

  const results = useMemo(() => search(query), [query])
  const building = destination ? BUILDING_BY_ID.get(destination.buildingId) : undefined
  const plan = destination ? PLANS[destination.buildingId] : undefined
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

  const steps: string[] = []
  if (outdoorRoute && building) {
    const from = originId === GPS ? 'Desde tu ubicación, sigue' : `Sal de ${BUILDING_BY_ID.get(originId)?.name} y sigue`
    const meters = Math.round(outdoorRoute.distance / 10) * 10
    steps.push(`${from} la línea roja hasta ${building.name}: unos ${meters} m, ≈ ${outdoorRoute.minutes} min a pie.`)
    if (outdoorRoute.unmapped > 0) {
      steps.push('El tramo punteado no está en nuestro mapa de senderos: es una línea recta de guía, busca el camino más cercano.')
    }
  }
  if (route) {
    steps.push(...(outdoorRoute ? route.steps.slice(1) : route.steps))
  } else if (destination?.kind === 'building' && destination.floor !== undefined) {
    const floor = destination.floor
    steps.push(floor > 1 ? `Sube al ${floorName(floor)}.` : floor === 0 ? 'Baja al subsuelo.' : 'El aula está en la planta baja.')
  }

  return (
    <div className="app">
      <CampusScene
        selectedBuildingId={destination?.buildingId}
        plan={plan}
        route={route}
        outdoorRoute={outdoorRoute}
        originBuildingId={originId === GPS ? undefined : originId}
        userPosition={gps.position}
        activeFloor={activeFloor}
        onSelectBuilding={selectBuilding}
      />

      <header className="search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca un aula o edificio (ej. M302, Galileo)"
          aria-label="Buscar aula o edificio"
        />
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
      </header>

      {plan && plan.floors.length > 1 && (
        <nav className="floors" aria-label="Piso">
          {[...plan.floors].reverse().map((floor) => (
            <button key={floor} className={floor === activeFloor ? 'active' : ''} onClick={() => setActiveFloor(floor)}>
              {floor === 0 ? 'S' : floor}
            </button>
          ))}
        </nav>
      )}

      {destination && (
        <section className="panel">
          <button className="close" onClick={() => setDestination(null)} aria-label="Cerrar">
            ×
          </button>
          <h1>{destination.title}</h1>
          <p className="subtitle">
            {destination.kind === 'building' && destination.floor !== undefined
              ? `Edificio ${building?.name}, ${floorName(destination.floor)}`
              : destination.subtitle}
          </p>

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
          {originId === GPS && !gps.position && <p className={gps.error ? 'warning' : 'meta'}>{gps.error ?? 'Buscando tu ubicación…'}</p>}

          {steps.length > 0 && (
            <ol className="steps">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {route && !outdoorRoute && <p className="meta">Recorrido aproximado: {Math.round(route.distance)} m</p>}
          {!plan && <p className="meta">Todavía no tenemos el plano interior de este edificio.</p>}
          {plan?.placeholder && <p className="warning">Plano de ejemplo: las aulas y pasillos aún no son los reales.</p>}
        </section>
      )}
    </div>
  )
}
