import type { BuildingPlan, GraphEdge, GraphNode, Route } from '../types'

// Cost in "meters" of changing one floor. Higher than the real distance on purpose,
// so routes do not go up and down when a same-floor path exists.
const STAIRS_COST = 15
const ELEVATOR_COST = 25

export function floorName(floor: number, buildingId?: string): string {
  if (floor < 0) return `subsuelo ${Math.abs(floor)}`
  if (floor === 0 && buildingId === 'hayek') return 'piso 0 · Ápice'
  return floor === 0 ? 'subsuelo' : `piso ${floor}`
}

function flatDistance(a: GraphNode, b: GraphNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function edgeCost(a: GraphNode, b: GraphNode): number {
  if (a.floor === b.floor) return flatDistance(a, b)
  const perFloor = a.kind === 'elevator' ? ELEVATOR_COST : STAIRS_COST
  return Math.abs(a.floor - b.floor) * perFloor
}

function buildAdjacency(edges: GraphEdge[], nodes: Map<string, GraphNode>) {
  const adjacency = new Map<string, { to: string; cost: number }[]>()
  for (const edge of edges) {
    const a = nodes.get(edge.from)
    const b = nodes.get(edge.to)
    if (!a || !b) throw new Error(`Arista con nodo inexistente: ${edge.from} -> ${edge.to}`)
    const cost = edge.weight ?? edgeCost(a, b)
    if (!adjacency.has(a.id)) adjacency.set(a.id, [])
    if (!adjacency.has(b.id)) adjacency.set(b.id, [])
    adjacency.get(a.id)!.push({ to: b.id, cost })
    adjacency.get(b.id)!.push({ to: a.id, cost })
  }
  return adjacency
}

/** Indoor route with walking instructions. Returns null when there is no path between the two nodes. */
export function findRoute(plan: BuildingPlan, fromId: string, toId: string): Route | null {
  const path = shortestPath(plan.nodes, plan.edges, fromId, toId)
  return path && { ...path, steps: describe(path.nodes, plan.buildingId) }
}

/** A* over any walking graph (a building plan or the campus walkways). */
export function shortestPath(
  graphNodes: GraphNode[],
  edges: GraphEdge[],
  fromId: string,
  toId: string,
): { nodes: GraphNode[]; distance: number } | null {
  const nodes = new Map(graphNodes.map((n) => [n.id, n]))
  const start = nodes.get(fromId)
  const goal = nodes.get(toId)
  if (!start || !goal) return null

  const adjacency = buildAdjacency(edges, nodes)
  // Admissible: never overestimates, since every floor change costs at least STAIRS_COST.
  const heuristic = (n: GraphNode) => flatDistance(n, goal) + Math.abs(n.floor - goal.floor) * STAIRS_COST

  const cost = new Map<string, number>([[start.id, 0]])
  const cameFrom = new Map<string, string>()
  const open = new Set<string>([start.id])
  const closed = new Set<string>()

  while (open.size > 0) {
    let currentId = ''
    let best = Infinity
    for (const id of open) {
      const f = cost.get(id)! + heuristic(nodes.get(id)!)
      if (f < best) {
        best = f
        currentId = id
      }
    }

    if (currentId === goal.id) {
      const path: GraphNode[] = [goal]
      while (cameFrom.has(path[0].id)) path.unshift(nodes.get(cameFrom.get(path[0].id)!)!)
      return { nodes: path, distance: cost.get(goal.id)! }
    }

    open.delete(currentId)
    closed.add(currentId)
    for (const { to, cost: step } of adjacency.get(currentId) ?? []) {
      if (closed.has(to)) continue
      const tentative = cost.get(currentId)! + step
      if (tentative < (cost.get(to) ?? Infinity)) {
        cost.set(to, tentative)
        cameFrom.set(to, currentId)
        open.add(to)
      }
    }
  }
  return null
}

function nodeName(node: GraphNode): string {
  return node.label ?? node.code ?? 'este punto'
}

function describe(path: GraphNode[], buildingId: string): string[] {
  const first = path[0]
  const last = path[path.length - 1]
  const steps = [`Empieza en ${nodeName(first)} (${floorName(first.floor, buildingId)}).`]
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]
    const next = path[i]
    if (prev.floor === next.floor) continue
    const verb = next.floor > prev.floor ? 'Sube' : 'Baja'
    const via = prev.kind === 'elevator' ? 'el ascensor' : (prev.label?.toLowerCase() ?? 'las escaleras')
    steps.push(`${verb} al ${floorName(next.floor, buildingId)} por ${via}.`)
  }
  steps.push(`Llegas a ${nodeName(last)}, en el ${floorName(last.floor, buildingId)}.`)
  return steps
}
