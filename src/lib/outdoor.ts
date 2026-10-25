import type { GraphEdge, GraphNode, Vec2 } from '../types'
import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_PATHS, CITY_ROADS, findCampusBuilding, type CampusBuilding } from './campus'
import { ELEVATED_WALKWAYS, segmentProjection } from './terrain'
import { MIGUEL_ENTRANCE, miguelToCampus } from './miguel'
import { HAYEK_ENTRANCE, hayekToCampus } from './hayek'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { HALL_EINSTEIN_PATH, EINSTEIN_HALL_DOOR } from './hallPassage'
import { NEWTON_ACCESS_PATH, NEWTON_ACCESS_JOIN_END, NEWTON_DOOR_APPROACH } from './newton'
import { GALILEO_ACCESS_PATH, GALILEO_DOOR_APPROACH } from './galileo'
import { DA_VINCI_DOOR, EPICURO_DOOR, MAXWELL_DOOR, NORTH_COURT_PATHS } from './northCourts'
import { COLISEO_DOOR, CONFIRMED_DOORS, CONFIRMED_PATHS, GATE_PATHS, MAIN_GATE, OFF_CAMPUS, PAMPITE_GATE, SIDE_DOORS } from './entrances'
import { closestPointOnRing, closestPointOnSegment, pointInPolygon } from './geo'
import { shortestPath } from './pathfinding'

// Average walking speed, used for the "≈ N min" estimate.
const WALKING_SPEED = 1.3
// Below this length a straight link between a door and the walkway is not worth flagging.
const SHORT_LINK = 15
// Straight across open ground only between neighbours; farther apart, the walkways.
const NEIGHBOURS = 30
// GPS readings this far from the grounds are treated as off campus.
const NEAR_CAMPUS = 40

/** A place a route can start or end: a door or the user, and where it joins the walkways. */
export interface Endpoint {
  point: Vec2
  /** Closest point of the walkways reachable in a straight line without going through a building. */
  at: Vec2
  /** Ids of both ends of the stretch `at` lies on. */
  edge: [string, string]
  /** Buildings the straight link may go through: the one the point is in, or whose door it is. */
  own: CampusBuilding[]
  /** Reached along city streets, out of a campus gate. */
  offCampus?: boolean
}

/** Something on the way worth a line of the directions, in walking order. */
export type Landmark =
  | { kind: 'bridge' }
  | { kind: 'hall-passage' }
  /** Walks through a building; `enters` when the route ends inside it. */
  | { kind: 'building'; id: string; enters: boolean }
  | { kind: 'gate'; gate: 'principal' | 'pampite'; leaving: boolean }

export interface OutdoorRoute {
  /** Stretch that follows mapped walkways. */
  path: Vec2[]
  /** Straight links between an endpoint and the walkways (or between both endpoints when they are close). */
  links: [Vec2, Vec2][]
  distance: number
  minutes: number
  /** Meters walked on straight links that are long enough to be a guess rather than a real walkway. */
  unmapped: number
  landmarks: Landmark[]
  usesBridge: boolean
  usesHallPassage: boolean
  /** Walks through the Hall Principal lobby. */
  crossesHall: boolean
}

interface Network {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

const key = ([x, y]: Vec2) => `${x.toFixed(2)},${y.toFixed(2)}`
const at = (node: GraphNode): Vec2 => [node.x, node.y]

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

// Buildings and water: what a straight link must not cut through.
const OBSTACLES = [
  ...CAMPUS_BUILDINGS.map((building) => ({ ring: building.ring, building })),
  ...CAMPUS_AREAS.filter((area) => area.kind === 'water').map((area) => ({ ring: area.ring, building: undefined })),
].map((obstacle) => {
  const xs = obstacle.ring.map((p) => p[0]), ys = obstacle.ring.map((p) => p[1])
  return { ...obstacle, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
})

/** Samples every half metre; the ends are skipped so a door on an outline counts as outside. */
function samples(a: Vec2, b: Vec2, margin: number): Vec2[] {
  const length = distance(a, b)
  const steps = Math.ceil(length / 0.5)
  const points: Vec2[] = []
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (t * length >= margin && (1 - t) * length >= margin) points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return points
}

function blocked(a: Vec2, b: Vec2, own: CampusBuilding[]): boolean {
  return samples(a, b, 0.3).some(([x, y]) => OBSTACLES.some(({ ring, building, box }) =>
    x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && !(building && own.includes(building)) && pointInPolygon([x, y], ring)))
}

/** Catalogued buildings a leg walks through, in order. */
function buildingsAlong(a: Vec2, b: Vec2): string[] {
  const ids: string[] = []
  for (const p of samples(a, b, 1)) {
    const building = CAMPUS_BUILDINGS.find((candidate) => candidate.info && pointInPolygon(p, candidate.ring))
    if (building && !ids.includes(building.info!.id)) ids.push(building.info!.id)
  }
  return ids
}

function addNode(net: Network, p: Vec2): string {
  const id = key(p)
  if (!net.nodes.has(id)) net.nodes.set(id, { id, kind: 'corridor', floor: 1, x: p[0], y: p[1] })
  return id
}

function addLine(net: Network, line: Vec2[]): string[] {
  const ids = line.map((p) => addNode(net, p))
  ids.slice(1).forEach((id, i) => { if (id !== ids[i]) net.edges.push({ from: ids[i], to: id }) })
  return ids
}

function attach(net: Network, point: Vec2, own: CampusBuilding[]) {
  const options = net.edges.map((edge) => {
    const onEdge = closestPointOnSegment(point, at(net.nodes.get(edge.from)!), at(net.nodes.get(edge.to)!))
    return { at: onEdge, edge: [edge.from, edge.to] as [string, string], gap: distance(point, onEdge) }
  }).sort((a, b) => a.gap - b.gap)
  // Some strips by the campus wall see no walkway: then the link that spends least of its length indoors.
  const indoors = (option: (typeof options)[number]) => samples(point, option.at, 0.3).filter(([x, y]) => OBSTACLES.some(({ ring, building, box }) =>
    x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && !(building && own.includes(building)) && pointInPolygon([x, y], ring))).length
  return options.find((option) => !blocked(point, option.at, own))
    ?? options.slice(0, 20).reduce((best, option) => indoors(option) < indoors(best) ? option : best)
}

/** Links a point to the closest stretch it can reach in a straight line, splitting that stretch. */
function join(net: Network, point: Vec2) {
  const { at: onEdge, edge } = attach(net, point, [])
  const middle = addNode(net, onEdge)
  if (!edge.includes(middle)) {
    const i = net.edges.findIndex((e) => e.from === edge[0] && e.to === edge[1])
    net.edges.splice(i, 1, { from: edge[0], to: middle }, { from: middle, to: edge[1] })
  }
  addLine(net, [onEdge, point])
}

function componentOf(net: Network, start: string): Set<string> {
  const neighbors = new Map<string, string[]>()
  for (const { from, to } of net.edges) {
    neighbors.set(from, [...(neighbors.get(from) ?? []), to])
    neighbors.set(to, [...(neighbors.get(to) ?? []), from])
  }
  const component = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (component.has(current)) continue
    component.add(current)
    stack.push(...(neighbors.get(current) ?? []))
  }
  return component
}

function keep(net: Network, component: Set<string>): Network {
  return {
    nodes: new Map([...net.nodes].filter(([id]) => component.has(id))),
    edges: net.edges.filter((e) => component.has(e.from)),
  }
}

/** Buildings walked through on each leg added by hand, keyed by "from|to" in both directions. */
const THROUGH = new Map<string, string[]>()
/** Legs that pass a campus gate, keyed the same way. */
const GATE_LEGS = new Map<string, Extract<Landmark, { kind: 'gate' }>>()

function buildWalkways(): Network {
  const all: Network = { nodes: new Map(), edges: [] }
  // OpenStreetMap ways share exact coordinates where they meet, so the coordinate is the node id.
  for (const path of CAMPUS_PATHS) addLine(all, path)

  // Keep only the largest connected piece: a route into an isolated stub could never get out.
  let largest = new Set<string>()
  const visited = new Set<string>()
  for (const id of all.nodes.keys()) {
    if (visited.has(id)) continue
    const component = componentOf(all, id)
    component.forEach((n) => visited.add(n))
    if (component.size > largest.size) largest = component
  }
  const net = keep(all, largest)

  // A photo-confirmed connection joins the Hall forecourt to Einstein's side door.
  // Keep the mapped network intact, attaching the new passage to its connected component.
  const entry = HALL_EINSTEIN_PATH[0]
  const candidates = [...net.nodes.values()].filter((n) => !CAMPUS_BUILDINGS.some((b) => pointInPolygon(at(n), b.ring)))
  const nearest = candidates.reduce((best, n) => distance(at(n), entry) < distance(at(best), entry) ? n : best)
  net.edges.push({ from: nearest.id, to: addLine(net, HALL_EINSTEIN_PATH)[0] })
  addLine(net, GALILEO_ACCESS_PATH)
  const newtonIds = addLine(net, NEWTON_ACCESS_PATH)
  net.edges.push({ from: newtonIds[1], to: key(NEWTON_ACCESS_JOIN_END) })

  // The courts north of Einstein (the Hall crossing starts on the Einstein passage node above),
  // then the walks the student confirmed through buildings and yards.
  for (const path of [...NORTH_COURT_PATHS, ...CONFIRMED_PATHS, ...GATE_PATHS]) {
    if (!net.nodes.has(key(path[0]))) join(net, path[0])
    const ids = addLine(net, path)
    path.slice(1).forEach((b, i) => {
      const legs = [`${ids[i]}|${ids[i + 1]}`, `${ids[i + 1]}|${ids[i]}`]
      const gate = GATE_PATHS.indexOf(path)
      if (gate >= 0) {
        const name = path === GATE_PATHS[0] ? 'principal' : 'pampite'
        GATE_LEGS.set(legs[0], { kind: 'gate', gate: name, leaving: true })
        GATE_LEGS.set(legs[1], { kind: 'gate', gate: name, leaving: false })
        return
      }
      const through = buildingsAlong(path[i], b)
      if (through.length > 0) {
        THROUGH.set(legs[0], through)
        THROUGH.set(legs[1], [...through].reverse())
      }
    })
  }
  return net
}

/** City streets, used only to reach a place outside the grounds; they meet the campus at its two gates. */
function buildStreets(): Network {
  const net: Network = { nodes: new Map(), edges: [] }
  for (const road of CITY_ROADS) addLine(net, road.line)
  for (const gate of [MAIN_GATE.outside, PAMPITE_GATE]) join(net, gate)
  return keep(net, componentOf(net, key(MAIN_GATE.outside)))
}

const WALKWAYS = buildWalkways()
const STREETS = buildStreets()

/** Inside the grounds, Hayek included, or close enough to blame GPS error. */
export function isOnCampus(point: Vec2): boolean {
  return [CAMPUS_BOUNDARY, findCampusBuilding('hayek')!.ring].some((ring) =>
    pointInPolygon(point, ring) || distance(point, closestPointOnRing(point, ring)) < NEAR_CAMPUS)
}

export function endpointForPosition(point: Vec2, own: CampusBuilding[] = []): Endpoint {
  const around = [...own, ...CAMPUS_BUILDINGS.filter((b) => !own.includes(b) && pointInPolygon(point, b.ring))]
  const { at: onEdge, edge } = attach(WALKWAYS, point, around)
  return { point, at: onEdge, edge, own: around }
}

/** Photo-located entrances, then the ones the student pinned. */
const DOORS: Record<string, Vec2> = {
  'hall-principal': hallToCampus([0, HALL_ENTRANCE.stairFront]),
  einstein: EINSTEIN_HALL_DOOR,
  newton: NEWTON_DOOR_APPROACH,
  galileo: GALILEO_DOOR_APPROACH,
  'miguel-de-santiago': miguelToCampus([MIGUEL_ENTRANCE.x, MIGUEL_ENTRANCE.stairFront]),
  maxwell: MAXWELL_DOOR,
  'da-vinci': DA_VINCI_DOOR,
  epicuro: EPICURO_DOOR,
  hayek: hayekToCampus(HAYEK_ENTRANCE.door),
  // In front of the glazed door, on the lane that runs along the facade.
  coliseo: COLISEO_DOOR,
  ...CONFIRMED_DOORS,
}

const ENDPOINTS = new Map<string, Endpoint | null>()

/** Other doors are approximated by the point of the outline closest to a walkway it can reach. */
export function endpointForBuilding(buildingId: string): Endpoint | null {
  if (!ENDPOINTS.has(buildingId)) {
    const building = findCampusBuilding(buildingId)
    const door = DOORS[buildingId]
    if (!building) ENDPOINTS.set(buildingId, null)
    else if (door) ENDPOINTS.set(buildingId, endpointForPosition(door, [building]))
    else {
      const offCampus = OFF_CAMPUS.has(buildingId)
      let best: (ReturnType<typeof attach> & { point: Vec2 }) | undefined
      for (let i = 0; i < building.ring.length; i++) {
        const a = building.ring[i], b = building.ring[(i + 1) % building.ring.length]
        const steps = Math.max(1, Math.ceil(distance(a, b) / 1.5))
        for (let s = 0; s < steps; s++) {
          const point: Vec2 = [a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps]
          const option = attach(offCampus ? STREETS : WALKWAYS, point, [building])
          if (!best || option.gap < best.gap) best = { ...option, point }
        }
      }
      ENDPOINTS.set(buildingId, { point: best!.point, at: best!.at, edge: best!.edge, own: [building], offCampus })
    }
  }
  return ENDPOINTS.get(buildingId)!
}

/** The main door and any other confirmed one. */
export function endpointsForBuilding(buildingId: string): Endpoint[] {
  const main = endpointForBuilding(buildingId)
  if (!main) return []
  return [main, ...(SIDE_DOORS[buildingId] ?? []).map((door) => endpointForPosition(door, main.own))]
}

const PASSAGE_NODES = new Set(HALL_EINSTEIN_PATH.map(key))
const LAKE_ENTRANCE_NODES = new Set([...GALILEO_ACCESS_PATH.slice(1), ...NEWTON_ACCESS_PATH.slice(1)].map(key))

function onBridge(a: Vec2, b: Vec2): boolean {
  const midpoint: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return ELEVATED_WALKWAYS.some((way) => way.line.some((p, j) => j > 0 && segmentProjection(midpoint, way.line[j - 1], p).distance < 0.1))
}

/** Shortest route between any door of the origin and any door of the destination. */
export function findOutdoorRoute(from: Endpoint | Endpoint[], to: Endpoint | Endpoint[]): OutdoorRoute | null {
  let best: OutdoorRoute | null = null
  for (const a of [from].flat()) for (const b of [to].flat()) {
    const route = routeBetween(a, b)
    if (route && (!best || route.distance < best.distance)) best = route
  }
  return best
}

function routeBetween(from: Endpoint, to: Endpoint): OutdoorRoute | null {
  const streets = !!(from.offCampus || to.offCampus)
  const nodes = new Map(WALKWAYS.nodes)
  const edges = [...WALKWAYS.edges]
  if (streets) {
    STREETS.nodes.forEach((node, id) => nodes.set(id, node))
    edges.push(...STREETS.edges)
  }
  // Both ends join the network where their link meets it: at a node, or part way along a stretch.
  const enter = (end: Endpoint, id: string) => {
    const node = end.edge.find((n) => distance(at(nodes.get(n)!), end.at) < 1e-6)
    if (node) return node
    nodes.set(id, { id, kind: 'corridor', floor: 1, x: end.at[0], y: end.at[1] })
    edges.push({ from: id, to: end.edge[0] }, { from: id, to: end.edge[1] })
    return id
  }
  const start = enter(from, '@from'), goal = enter(to, '@to')
  if (start === '@from' && goal === '@to' && from.edge.every((id) => to.edge.includes(id))) edges.push({ from: start, to: goal })
  const walk = shortestPath([...nodes.values()], edges, start, goal)
  if (!walk) return null

  const stops = walk.nodes
  const path = stops.map(at)
  // A leg from a join part way along a stretch belongs to that stretch.
  const real = (id: string, other: string) => {
    const end = id === '@from' ? from : id === '@to' ? to : undefined
    return end ? end.edge.find((n) => n !== other) ?? end.edge[0] : id
  }
  const landmarks: Landmark[] = []
  const add = (landmark: Landmark) => {
    if (JSON.stringify(landmarks.at(-1)) !== JSON.stringify(landmark)) landmarks.push(landmark)
  }
  let mappedLakeApproach = false
  stops.slice(1).forEach((b, i) => {
    const [a, z] = [real(stops[i].id, b.id), real(b.id, stops[i].id)]
    const leg = `${a}|${z}`
    if (onBridge(at(stops[i]), at(b))) add({ kind: 'bridge' })
    if (PASSAGE_NODES.has(a) && PASSAGE_NODES.has(z)) add({ kind: 'hall-passage' })
    if (LAKE_ENTRANCE_NODES.has(a) && LAKE_ENTRANCE_NODES.has(z)) mappedLakeApproach = true
    const gate = GATE_LEGS.get(leg)
    if (gate) add(gate)
    for (const id of THROUGH.get(leg) ?? []) add({ kind: 'building', id, enters: false })
  })
  // The route ends inside the building its last leg walks into, as at Cicerón's door off the Hall lobby.
  const [beforeLast, last] = [stops.at(-2)?.id ?? '', stops.at(-1)!.id]
  const ending = THROUGH.get(`${real(beforeLast, last)}|${real(last, beforeLast)}`)?.at(-1)
  const entered = [...landmarks].reverse().find((l) => l.kind === 'building' && l.id === ending)
  if (entered?.kind === 'building') entered.enters = true

  let links: [Vec2, Vec2][] = [
    [from.point, from.at],
    [to.at, to.point],
  ]
  let total = walk.distance + distance(...links[0]) + distance(...links[1])

  // Neighbouring places: walking straight across beats a detour to the nearest walkway and back.
  const direct = distance(from.point, to.point)
  const shortLakeLink = mappedLakeApproach && direct < SHORT_LINK
  const straight = !streets && direct <= NEIGHBOURS && !blocked(from.point, to.point, [...from.own, ...to.own])
  if (straight && ((landmarks.length === 0 && (!mappedLakeApproach || shortLakeLink) && (direct < total / 2 || shortLakeLink)) || path.length < 2)) {
    links = [[from.point, to.point]]
    total = direct
    path.length = 0
    landmarks.length = 0
  }
  if (path.length < 2) path.length = 0

  const unmapped = links.map((link) => distance(...link)).filter((length) => length > SHORT_LINK)
  return {
    path,
    links,
    distance: total,
    minutes: Math.max(1, Math.round(total / WALKING_SPEED / 60)),
    unmapped: unmapped.reduce((sum, length) => sum + length, 0),
    landmarks,
    usesBridge: landmarks.some((l) => l.kind === 'bridge'),
    usesHallPassage: landmarks.some((l) => l.kind === 'hall-passage'),
    crossesHall: landmarks.some((l) => l.kind === 'building' && l.id === 'hall-principal'),
  }
}
