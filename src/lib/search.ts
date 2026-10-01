import { BUILDINGS } from '../data/buildings'
import { PLANS } from '../data/plans'
import type { BuildingInfo, GraphNode } from '../types'
import { floorName } from './pathfinding'

export type SearchResult =
  | { kind: 'room'; key: string; buildingId: string; node: GraphNode; title: string; subtitle: string }
  | { kind: 'building'; key: string; buildingId: string; floor?: number; title: string; subtitle: string }

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** "M302", "m-302" or "DW 010" -> building + floor, using the campus naming rule (prefix + floor + room). */
export function parseRoomCode(input: string): { building: BuildingInfo; floor: number; code: string } | null {
  const match = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .match(/^([A-Z]{1,2})(\d)(\d{2})$/)
  if (!match) return null
  const building = BUILDINGS.find((b) => b.code === match[1])
  if (!building) return null
  return { building, floor: Number(match[2]), code: match[0] }
}

const ROOMS: SearchResult[] = Object.values(PLANS).flatMap((plan) => {
  const building = BUILDINGS.find((b) => b.id === plan.buildingId)
  return plan.nodes
    .filter((n) => n.kind === 'room')
    .map((node) => ({
      kind: 'room' as const,
      key: node.id,
      buildingId: plan.buildingId,
      node,
      title: node.code ?? node.label ?? node.id,
      subtitle: [node.code && node.label, `${building?.name ?? plan.buildingId}, ${floorName(node.floor)}`].filter(Boolean).join(', '),
    }))
})

const BUILDING_RESULTS: SearchResult[] = BUILDINGS.map((b) => ({
  kind: 'building' as const,
  key: b.id,
  buildingId: b.id,
  title: b.name,
  subtitle: b.code ? `Edificio, aulas ${b.code}101, ${b.code}102…` : 'Edificio',
}))

export function search(query: string, limit = 8): SearchResult[] {
  const q = normalize(query)
  if (!q) return []

  const haystack = (r: SearchResult) => {
    const aliases = r.kind === 'building' ? (BUILDINGS.find((b) => b.id === r.buildingId)?.aliases ?? []) : []
    return normalize([r.title, r.subtitle, ...aliases].join(' '))
  }
  const results = [...ROOMS, ...BUILDING_RESULTS].filter((r) => haystack(r).includes(q))

  // A well-formed code for a building without an indoor plan still tells the user where to go.
  const parsed = parseRoomCode(query)
  if (parsed && !results.some((r) => r.kind === 'room' && r.node.code === parsed.code)) {
    results.unshift({
      kind: 'building',
      key: `code-${parsed.code}`,
      buildingId: parsed.building.id,
      floor: parsed.floor,
      title: parsed.code,
      subtitle: `Edificio ${parsed.building.name}, ${floorName(parsed.floor)}`,
    })
  }
  return results.slice(0, limit)
}
