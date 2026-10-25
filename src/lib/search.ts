import { BUILDINGS } from '../data/buildings'
import { PLANS } from '../data/plans'
import { LOCATIONS, type LocationReference } from '../data/references'
import type { BuildingInfo, GraphNode } from '../types'
import { floorName } from './pathfinding'

export type SearchResult =
  | { kind: 'room'; key: string; buildingId: string; node: GraphNode; title: string; subtitle: string }
  | { kind: 'building'; key: string; buildingId: string; floor?: number; title: string; subtitle: string; reference?: LocationReference; inferred?: boolean; landmark?: boolean; instruction?: string }

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// shortcut: floor ranges guide visitors until the remaining classrooms are surveyed.
const ROOM_FLOORS: Record<string, number[]> = {
  aristoteles: [1], socrates: [1], 'lao-zi': [1], mozart: [1], newton: [1, 2],
  gobe: [], mantenimiento: [], darwin: [0, 1, 2, 3], hayek: [-2, -1, 0, 1, 2, 3],
}

const compact = (text: string) => normalize(text).replace(/[\s-]/g, '')

/** "M302", "Maxwell 302" or "Hayek S1" -> building + permitted floor. */
export function parseRoomCode(input: string): { building: BuildingInfo; floor: number; code: string } | null {
  const text = compact(input)
  for (const building of BUILDINGS) {
    const names = [building.code, building.name, building.id, ...(building.aliases ?? [])].filter((name): name is string => !!name)
    for (const name of names) {
      const prefix = compact(name)
      if (!text.startsWith(prefix)) continue
      const suffix = text.slice(prefix.length)
      const basement = building.id === 'hayek' && /^s[12](\d{2}[a-z]{0,2})?$/.test(suffix)
      if (!basement && !/^\d{3}[a-z]{0,2}$/.test(suffix)) continue
      const floor = basement ? -Number(suffix[1]) : Number(suffix[0])
      if (!(ROOM_FLOORS[building.id] ?? [1, 2, 3]).includes(floor)) continue
      const code = `${building.code ?? `${building.name} `}${suffix.toUpperCase()}`
      return { building, floor, code }
    }
  }
  return null
}

function floorInstruction(building: BuildingInfo, floor: number, code: string): string {
  const level = floorName(floor, building.id)
  if (floor === 1) return `Entra a ${building.name} y busca ${code} en el ${level}.`
  const verb = floor <= 0 ? 'baja' : 'sube'
  return `Entra a ${building.name} y ${verb} al ${level}. Busca ${code} en ese nivel.`
}

const ROOMS: SearchResult[] = Object.values(PLANS).filter((plan) => !plan.placeholder).flatMap((plan) => {
  const building = BUILDINGS.find((b) => b.id === plan.buildingId)
  return plan.nodes
    .filter((n) => n.kind === 'room')
    .map((node) => ({
      kind: 'room' as const,
      key: node.id,
      buildingId: plan.buildingId,
      node,
      title: node.code ?? node.label ?? node.id,
      subtitle: [node.code && node.label, `${building?.name ?? plan.buildingId}, ${floorName(node.floor, plan.buildingId)}`].filter(Boolean).join(', '),
    }))
})

const BUILDING_RESULTS: SearchResult[] = BUILDINGS.map((b) => ({
  kind: 'building' as const,
  key: b.id,
  buildingId: b.id,
  title: b.name,
  subtitle: b.code ? `Edificio · prefijo ${b.code}` : 'Edificio',
}))

const REFERENCE_RESULTS: SearchResult[] = LOCATIONS.map((reference) => ({
  kind: 'building', key: `ref-${reference.code}`, buildingId: reference.buildingId,
  floor: reference.floor, title: reference.code, reference,
  instruction: floorInstruction(BUILDINGS.find((b) => b.id === reference.buildingId)!, reference.floor, reference.code),
  subtitle: `${reference.label} · ${BUILDINGS.find((b) => b.id === reference.buildingId)?.name} · ${floorName(reference.floor, reference.buildingId).replace(/^./, (letter) => letter.toUpperCase())}`,
}))

const APICE_RESULT: SearchResult = { kind: 'building', key: 'apice', buildingId: 'hayek', floor: 0, landmark: true, title: 'Ápice', subtitle: 'Cafetería y punto de encuentro · Hayek · piso 0', instruction: 'Baja al piso 0 de Hayek, bajo la terraza del puente' }

const HAYEK_BASEMENT_RESULTS: SearchResult[] = [1, 2].map((level) => ({
  kind: 'building', key: `code-HS${level}`, buildingId: 'hayek', floor: -level, landmark: true,
  title: `Hayek S${level}`, subtitle: `Subsuelo ${level} · Complejo Hayek · aulas`,
  instruction: `Entra a Complejo Hayek y baja al subsuelo ${level} (S${level}).`,
}))

const GYM_RESULT: SearchResult = {
  kind: 'building', key: 'gimnasio', buildingId: 'coliseo', landmark: true, title: 'Gimnasio',
  subtitle: 'Al fondo del Coliseo Alexandros',
  instruction: 'Entra y ve al fondo del Coliseo Alexandros; allí encontrarás el gimnasio.',
}

export function search(query: string, limit = 8): SearchResult[] {
  const q = normalize(query)
  if (!q) return []

  const haystack = (r: SearchResult) => {
    const aliases = r.kind === 'building' ? (BUILDINGS.find((b) => b.id === r.buildingId)?.aliases ?? []) : []
    return normalize([r.title, r.subtitle, ...aliases].join(' '))
  }
  const results = [...ROOMS, ...REFERENCE_RESULTS, ...BUILDING_RESULTS, APICE_RESULT, ...HAYEK_BASEMENT_RESULTS, GYM_RESULT].filter((r) => haystack(r).includes(q))

  // A well-formed code for a building without an indoor plan still tells the user where to go.
  const parsed = parseRoomCode(query)
  if (parsed) {
    const exact = [...ROOMS, ...REFERENCE_RESULTS, ...HAYEK_BASEMENT_RESULTS].find((r) => r.key === `code-${parsed.code}` || (r.kind === 'room' ? r.node.code === parsed.code : r.reference?.code === parsed.code))
    if (exact) return [exact, ...results.filter((r) => r.key !== exact.key)].slice(0, limit)
    results.unshift({
      kind: 'building',
      key: `code-${parsed.code}`,
      buildingId: parsed.building.id,
      floor: parsed.floor,
      inferred: true,
      title: parsed.code,
      subtitle: `${parsed.building.name}, ${floorName(parsed.floor, parsed.building.id)} · código interpretado, aula sin confirmar`,
      instruction: floorInstruction(parsed.building, parsed.floor, parsed.code),
    })
  }
  return results.slice(0, limit)
}
