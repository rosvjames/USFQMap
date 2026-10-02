export type Vec2 = [number, number]

export type NodeKind = 'room' | 'corridor' | 'stairs' | 'elevator' | 'entrance'

/** A point of the indoor graph. x/y are local meters (east/north), same frame as the campus map. */
export interface GraphNode {
  id: string
  kind: NodeKind
  /** Number printed for that building. Hayek: 0 = Ápice, -1/-2 = classroom basements. */
  floor: number
  x: number
  y: number
  label?: string
  /** Room code as printed on the door, e.g. "M302". */
  code?: string
}

export interface GraphEdge {
  from: string
  to: string
  /** Walking cost in meters. Defaults to the straight-line distance (or a fixed cost between floors). */
  weight?: number
}

export interface BuildingPlan {
  buildingId: string
  /** True while the nodes are invented placeholders and not measured on site. */
  placeholder?: boolean
  floors: number[]
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface BuildingInfo {
  id: string
  name: string
  /** Prefix used in room codes (M302 -> "M"). Only set when confirmed. */
  code?: string
  /** OpenStreetMap id of the footprint in campus.json, e.g. "way/395847792". */
  osmId: string
  aliases?: string[]
}

export interface Route {
  nodes: GraphNode[]
  /** Approximate walking distance in meters. */
  distance: number
  steps: string[]
}
