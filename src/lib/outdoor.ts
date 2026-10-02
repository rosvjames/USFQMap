import type { GraphEdge, GraphNode, Vec2 } from '../types'
import { CAMPUS_BUILDINGS, CAMPUS_PATHS, findCampusBuilding } from './campus'
import { ELEVATED_WALKWAYS, segmentProjection } from './terrain'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
import { MIGUEL_ENTRANCE, miguelToCampus } from './miguel'
import { HAYEK_ENTRANCE, hayekToCampus } from './hayek'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { HALL_EINSTEIN_PATH, EINSTEIN_HALL_DOOR } from './hallPassage'
import { NEWTON_ACCESS_PATH, NEWTON_ACCESS_JOIN_END, NEWTON_DOOR_APPROACH } from './newton'
import { GALILEO_ACCESS_PATH, GALILEO_DOOR_APPROACH, GALILEO_LAGOON } from './galileo'
import { pointInPolygon } from './geo'
import { shortestPath } from './pathfinding'

// Average walking speed, used for the "≈ N min" estimate.
const WALKING_SPEED = 1.3
// Below this length a straight link between a door and the walkway is not worth flagging.
const SHORT_LINK = 15

/** A place a route can start or end: a point on the map plus the walkway node closest to it. */
export interface Endpoint {
  point: Vec2
  nodeId: string
}

export interface OutdoorRoute {
  /** Stretch that follows mapped walkways. */
  path: Vec2[]
  /** Straight links between an endpoint and the walkways (or between both endpoints when they are close). */
  links: [Vec2, Vec2][]
  distance: number
  minutes: number
  /** Meters walked on straight links that are long enough to be a guess rather than a real walkway. */
  unmapped: number
  usesBridge: boolean
  usesHallPassage: boolean
}

function buildWalkways() {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  for (const path of CAMPUS_PATHS) {
    // OpenStreetMap ways share exact coordinates where they meet, so the coordinate is the node id.
    const ids = path.map(([x, y]) => {
      const id = `${x.toFixed(2)},${y.toFixed(2)}`
      if (!nodes.has(id)) nodes.set(id, { id, kind: 'corridor', floor: 1, x, y })
      return id
    })
    for (let i = 1; i < ids.length; i++) edges.push({ from: ids[i - 1], to: ids[i] })
  }

  // Keep only the largest connected piece: a route into an isolated stub could never get out.
  const neighbors = new Map<string, string[]>()
  for (const { from, to } of edges) {
    neighbors.set(from, [...(neighbors.get(from) ?? []), to])
    neighbors.set(to, [...(neighbors.get(to) ?? []), from])
  }
  let largest = new Set<string>()
  const visited = new Set<string>()
  for (const id of nodes.keys()) {
    if (visited.has(id)) continue
    const component = new Set<string>()
    const stack = [id]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (component.has(current)) continue
      component.add(current)
      visited.add(current)
      stack.push(...(neighbors.get(current) ?? []))
    }
    if (component.size > largest.size) largest = component
  }

  const connectedNodes = [...nodes.values()].filter(n=>largest.has(n.id))
  const connectedEdges = edges.filter(e=>largest.has(e.from))
  // A photo-confirmed connection joins the Hall forecourt to Einstein's side door.
  // Keep the mapped network intact, attaching the new passage to its connected component.
  const entry=HALL_EINSTEIN_PATH[0]
  const candidates=connectedNodes.filter(n=>!CAMPUS_BUILDINGS.some(b=>pointInPolygon([n.x,n.y],b.ring)))
  const join=candidates.reduce((best,n)=>distance([n.x,n.y],entry)<distance([best.x,best.y],entry)?n:best)
  const ids=HALL_EINSTEIN_PATH.map(([x,y])=>{
    const id=`${x.toFixed(2)},${y.toFixed(2)}`
    if(!connectedNodes.some(n=>n.id===id))connectedNodes.push({id,kind:'corridor',floor:1,x,y})
    return id
  })
  connectedEdges.push({from:join.id,to:ids[0]})
  ids.slice(1).forEach((id,i)=>connectedEdges.push({from:ids[i],to:id}))
  const galileoIds=GALILEO_ACCESS_PATH.map(([x,y])=>{
    const id=`${x.toFixed(2)},${y.toFixed(2)}`
    if(!connectedNodes.some(n=>n.id===id))connectedNodes.push({id,kind:'corridor',floor:1,x,y})
    return id
  })
  galileoIds.slice(1).forEach((id,i)=>connectedEdges.push({from:galileoIds[i],to:id}))
  const newtonIds=NEWTON_ACCESS_PATH.map(([x,y])=>{
    const id=`${x.toFixed(2)},${y.toFixed(2)}`
    if(!connectedNodes.some(n=>n.id===id))connectedNodes.push({id,kind:'corridor',floor:1,x,y})
    return id
  })
  newtonIds.slice(1).forEach((id,i)=>connectedEdges.push({from:newtonIds[i],to:id}))
  connectedEdges.push({from:newtonIds[1],to:NEWTON_ACCESS_JOIN_END.map(v=>v.toFixed(2)).join(',')})
  return {nodes:connectedNodes,edges:connectedEdges}
}

const WALKWAYS = buildWalkways()

function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq))
  return [a[0] + t * dx, a[1] + t * dy]
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function endpointForPosition(point: Vec2): Endpoint {
  let nearest = WALKWAYS.nodes[0]
  for (const node of WALKWAYS.nodes) {
    if (distance([node.x, node.y], point) < distance([nearest.x, nearest.y], point)) nearest = node
  }
  return { point, nodeId: nearest.id }
}

/** Photo-located entrances; other doors approximate the nearest walkway. */
export function endpointForBuilding(buildingId: string): Endpoint | null {
  const building = findCampusBuilding(buildingId)
  if (!building) return null
  if (buildingId === 'hall-principal') return endpointForPosition(hallToCampus([0,HALL_ENTRANCE.stairFront]))
  if (buildingId === 'einstein') return endpointForPosition(EINSTEIN_HALL_DOOR)
  if (buildingId === 'newton') return endpointForPosition(NEWTON_DOOR_APPROACH)
  if (buildingId === 'galileo') return endpointForPosition(GALILEO_DOOR_APPROACH)
  if (buildingId === 'miguel-de-santiago') return endpointForPosition(miguelToCampus([MIGUEL_ENTRANCE.x, MIGUEL_ENTRANCE.stairFront]))
  if (buildingId === 'maxwell') return endpointForPosition(maxwellToCampus([0, MAXWELL_ENTRANCE.stairFront]))
  if (buildingId === 'hayek') return endpointForPosition(hayekToCampus(HAYEK_ENTRANCE.door))
  let best: Endpoint | null = null
  let bestGap = Infinity
  for (const node of WALKWAYS.nodes) {
    const p: Vec2 = [node.x, node.y]
    for (let i = 0; i < building.ring.length; i++) {
      const onOutline = closestPointOnSegment(p, building.ring[i], building.ring[(i + 1) % building.ring.length])
      const gap = distance(p, onOutline)
      if (gap < bestGap) {
        bestGap = gap
        best = { point: onOutline, nodeId: node.id }
      }
    }
  }
  return best
}

export function findOutdoorRoute(from: Endpoint, to: Endpoint): OutdoorRoute | null {
  const walk = shortestPath(WALKWAYS.nodes, WALKWAYS.edges, from.nodeId, to.nodeId)
  if (!walk) return null

  const path = walk.nodes.map((n): Vec2 => [n.x, n.y])
  const mappedBridge = path.some((point, i) => i > 0 && ELEVATED_WALKWAYS.some((way) => way.line.some((a, j) => {
    if (!j) return false
    const midpoint: Vec2 = [(point[0] + path[i - 1][0]) / 2, (point[1] + path[i - 1][1]) / 2]
    return segmentProjection(midpoint, way.line[j - 1], a).distance < 0.1
  })))
  const passageNodes=new Set(HALL_EINSTEIN_PATH.map(p=>p.map(v=>v.toFixed(2)).join(',')))
  const mappedHallPassage=path.some((p,i)=>i>0&&passageNodes.has(p.map(v=>v.toFixed(2)).join(','))&&passageNodes.has(path[i-1].map(v=>v.toFixed(2)).join(',')))
  const lakeEntranceNodes=new Set([...GALILEO_ACCESS_PATH.slice(1),...NEWTON_ACCESS_PATH.slice(1)].map(p=>p.map(v=>v.toFixed(2)).join(',')))
  const mappedLakeApproach=path.some((p,i)=>i>0&&lakeEntranceNodes.has(p.map(v=>v.toFixed(2)).join(','))&&lakeEntranceNodes.has(path[i-1].map(v=>v.toFixed(2)).join(',')))
  let links: [Vec2, Vec2][] = [
    [from.point, path[0]],
    [path[path.length - 1], to.point],
  ]
  let total = walk.distance + distance(...links[0]) + distance(...links[1])

  // Neighbouring places: walking straight across beats a detour to the nearest walkway and back.
  const direct = distance(from.point, to.point)
  const shortLakeLink = mappedLakeApproach && direct < SHORT_LINK && Array.from({length:11},(_,i):Vec2=>[
    from.point[0]+(to.point[0]-from.point[0])*i/10,from.point[1]+(to.point[1]-from.point[1])*i/10,
  ]).every(p=>!pointInPolygon(p,GALILEO_LAGOON.ring)&&!CAMPUS_BUILDINGS.some(b=>pointInPolygon(p,b.ring)))
  if ((!mappedBridge && !mappedHallPassage && (!mappedLakeApproach || shortLakeLink) && (direct < total / 2 || (mappedLakeApproach && shortLakeLink))) || path.length < 2) {
    links = [[from.point, to.point]]
    total = direct
    path.length = 0
  }

  const unmapped = links.map((link) => distance(...link)).filter((length) => length > SHORT_LINK)
  return {
    usesBridge: mappedBridge && path.length > 1,
    usesHallPassage: mappedHallPassage && path.length > 1,
    path,
    links,
    distance: total,
    minutes: Math.max(1, Math.round(total / WALKING_SPEED / 60)),
    unmapped: unmapped.reduce((sum, length) => sum + length, 0),
  }
}
