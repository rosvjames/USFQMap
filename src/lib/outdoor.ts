import type { GraphEdge, GraphNode, Vec2 } from '../types'
import { CAMPUS_PATHS, findCampusBuilding } from './campus'
import { ELEVATED_WALKWAYS, segmentProjection } from './terrain'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
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

  return {
    nodes: [...nodes.values()].filter((n) => largest.has(n.id)),
    edges: edges.filter((e) => largest.has(e.from)),
  }
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

/** Door of a building: the spot of its outline closest to any walkway. The Maxwell approach is photo-located; other doors remain approximations. */
export function endpointForBuilding(buildingId: string): Endpoint | null {
  const building = findCampusBuilding(buildingId)
  if (!building) return null
  if (buildingId === 'maxwell') return endpointForPosition(maxwellToCampus([0, MAXWELL_ENTRANCE.stairFront]))
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
  let links: [Vec2, Vec2][] = [
    [from.point, path[0]],
    [path[path.length - 1], to.point],
  ]
  let total = walk.distance + distance(...links[0]) + distance(...links[1])

  // Neighbouring places: walking straight across beats a detour to the nearest walkway and back.
  const direct = distance(from.point, to.point)
  if (direct < total / 2 || path.length < 2) {
    links = [[from.point, to.point]]
    total = direct
    path.length = 0
  }

  const unmapped = links.map((link) => distance(...link)).filter((length) => length > SHORT_LINK)
  const usesBridge = path.some((point, i) => i > 0 && ELEVATED_WALKWAYS.some((way) => way.line.some((a, j) => {
    if (!j) return false
    const midpoint: Vec2 = [(point[0] + path[i - 1][0]) / 2, (point[1] + path[i - 1][1]) / 2]
    return segmentProjection(midpoint, way.line[j - 1], a).distance < 0.1
  })))
  return {
    usesBridge,
    path,
    links,
    distance: total,
    minutes: Math.max(1, Math.round(total / WALKING_SPEED / 60)),
    unmapped: unmapped.reduce((sum, length) => sum + length, 0),
  }
}
