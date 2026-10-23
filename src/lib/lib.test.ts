import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/buildings'
import { PLANS } from '../data/plans'
import { hallPrincipal } from '../data/plans/hallPrincipal'
import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { endpointForBuilding, endpointForPosition, findOutdoorRoute } from './outdoor'
import { findRoute } from './pathfinding'
import { parseRoomCode, search } from './search'

describe('findRoute', () => {
  const plan = hallPrincipal

  it('stays on one floor when origin and destination share it', () => {
    const route = findRoute(plan, 'hp-entrada', 'hp-ej101')
    expect(route?.nodes.map((n) => n.id)).toEqual(['hp-entrada', 'hp-1-p1', 'hp-1-p2', 'hp-ej101'])
    expect(route?.steps).toHaveLength(2)
  })

  it('goes through the stairs and says so when the floor changes', () => {
    const route = findRoute(plan, 'hp-entrada', 'hp-ej202')
    expect(route?.nodes.some((n) => n.kind === 'stairs')).toBe(true)
    expect(route?.steps[1]).toBe('Sube al piso 2 por escaleras centrales.')
  })

  it('returns null for unknown nodes', () => {
    expect(findRoute(plan, 'hp-entrada', 'no-existe')).toBeNull()
  })
})

describe('plans', () => {
  it.each([hallPrincipal, ...Object.values(PLANS)])('$buildingId keeps every node inside its footprint and reachable', (plan) => {
    const building = findCampusBuilding(plan.buildingId)
    expect(building).toBeDefined()
    const start = plan.nodes[0]
    for (const node of plan.nodes) {
      expect(pointInPolygon([node.x, node.y], building!.ring), `${node.id} fuera del edificio`).toBe(true)
      expect(findRoute(plan, start.id, node.id), `${node.id} inalcanzable`).not.toBeNull()
    }
  })
})

describe('search', () => {
  it('parses campus room codes', () => {
    expect(parseRoomCode('m-302')).toMatchObject({ building: { id: 'maxwell' }, floor: 3, code: 'M302' })
    expect(parseRoomCode('DW010')).toMatchObject({ building: { id: 'darwin' }, floor: 0 })
    expect(parseRoomCode('ZZ999')).toBeNull()
  })

  it('finds rooms, buildings without accents, and bare codes', () => {
    expect(search('ej201')).toEqual([])
    expect(search('ciceron')[0]).toMatchObject({ kind: 'building', buildingId: 'ciceron' })
    expect(search('G206')[0]).toMatchObject({ kind: 'building', buildingId: 'galileo', floor: 2 })
  })

  it('never offers invented indoor plans as real destinations', () => {
    expect(Object.values(PLANS).some((plan) => plan.placeholder)).toBe(false)
    expect(search('Hall')[0]).toMatchObject({ kind: 'building' })
  })

  it('distinguishes a sourced location from an unconfirmed room code', () => {
    expect(search('G-111')[0]).toMatchObject({ buildingId: 'galileo', floor: 1, reference: { label: 'Counter de Registro' } })
    expect(search('M399')[0]).toMatchObject({ buildingId: 'maxwell', floor: 3, inferred: true })
    expect(search('registro')[0]).toMatchObject({ buildingId: 'galileo', floor: 1 })
  })

  it('handles suffixes and additional documented prefixes', () => {
    expect(parseRoomCode('H-100F')).toMatchObject({ building: { id: 'hayek' }, floor: 1, code: 'H100F' })
    expect(parseRoomCode('N104A')).toMatchObject({ building: { id: 'newton' }, floor: 1 })
    expect(parseRoomCode('CB-110')).toMatchObject({ building: { id: 'casa-blanca' }, floor: 1 })
  })
})

describe('outdoor routes', () => {
  it('gives every catalogued building a door on the walkway network', () => {
    for (const building of BUILDINGS) expect(endpointForBuilding(building.id), building.id).not.toBeNull()
  })

  it('follows walkways between distant buildings', () => {
    const from = endpointForBuilding('miguel-de-santiago')!
    const to = endpointForBuilding('hayek')!
    const route = findOutdoorRoute(from, to)!
    const straight = Math.hypot(from.point[0] - to.point[0], from.point[1] - to.point[1])
    expect(route.path.length).toBeGreaterThan(2)
    expect(route.distance).toBeGreaterThan(straight)
    expect(route.minutes).toBeGreaterThan(1)
  })

  it('flags the stretch that has no mapped walkway', () => {
    // The veterinary clinic sits ~75 m from the nearest mapped walkway.
    const route = findOutdoorRoute(endpointForBuilding('miguel-de-santiago')!, endpointForBuilding('veterinaria')!)!
    expect(route.unmapped).toBeGreaterThan(30)
  })

  it('walks straight between neighbours instead of detouring', () => {
    const start = endpointForBuilding('galileo')!
    const route = findOutdoorRoute(endpointForPosition([start.point[0] + 3, start.point[1]]), start)!
    expect(route.links).toHaveLength(1)
    expect(route.distance).toBeLessThan(5)
  })
})
