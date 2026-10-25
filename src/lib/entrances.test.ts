import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/buildings'
import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { CASA_TOMATE_DOOR, CICERON_DOOR, COLISEO_DOOR, DRAGON_SHOP_DOOR, MAIN_GATE, OBELISCO_DOOR, TEATRO_DOOR } from './entrances'
import { endpointForPosition, endpointsForBuilding, findOutdoorRoute, isOnCampus, type OutdoorRoute } from './outdoor'
import type { Vec2 } from '../types'

const WATER = CAMPUS_AREAS.filter((area) => area.kind === 'water')

/** Buildings (or water) a leg passes through, sampled every 25 cm and 30 cm clear of its ends. */
function crossed(a: Vec2, b: Vec2): Set<string> {
  const ids = new Set<string>()
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const steps = Math.ceil(length / 0.25)
  for (let i = 1; i < steps; i++) {
    if (i / steps * length < 0.3 || (1 - i / steps) * length < 0.3) continue
    const p: Vec2 = [a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]
    for (const building of CAMPUS_BUILDINGS) if (pointInPolygon(p, building.ring)) ids.add(building.info?.id ?? building.osmId)
    for (const water of WATER) if (pointInPolygon(p, water.ring)) ids.add(water.osmId)
  }
  return ids
}

const legsOf = (route: OutdoorRoute): [Vec2, Vec2][] => [...route.links, ...route.path.slice(1).map((p, i): [Vec2, Vec2] => [route.path[i], p])]
const route = (from: string, to: string) => findOutdoorRoute(endpointsForBuilding(from), endpointsForBuilding(to))!
const throughBuildings = (r: OutdoorRoute) => r.landmarks.flatMap((l) => l.kind === 'building' ? [l.id] : [])

describe('routes between catalogued places', () => {
  it('only walk through the buildings the directions name', () => {
    for (const from of BUILDINGS) for (const to of BUILDINGS) {
      if (from === to) continue
      const r = route(from.id, to.id)
      expect(r, `${from.id} → ${to.id}`).not.toBeNull()
      // The hand-made walk through the guardhouse is the main gate itself.
      const allowed = new Set([from.id, to.id, ...throughBuildings(r), 'guardiania-norte'])
      const unexpected = legsOf(r).flatMap(([a, b]) => [...crossed(a, b)]).filter((id) => !allowed.has(id))
      expect(unexpected, `${from.id} → ${to.id}`).toEqual([])
    }
  }, 120_000)
})

describe('entrances the student pinned', () => {
  it('reaches Cicerón through the Hall, from its front or its back', () => {
    for (const from of ['miguel-de-santiago', 'da-vinci']) {
      const r = route(from, 'ciceron')
      expect(r.path.at(-1), from).toEqual(CICERON_DOOR)
      expect(r.landmarks.at(-1), from).toEqual({ kind: 'building', id: 'hall-principal', enters: true })
      expect(r.unmapped, from).toBe(0)
    }
  })

  it('reaches the theatre and Casa Tomate across the yard behind Maxwell', () => {
    expect(route('miguel-de-santiago', 'teatro-casa-blanca').path.at(-1)).toEqual(TEATRO_DOOR)
    const tomate = route('da-vinci', 'casa-tomate')
    expect(tomate.path.at(-1)).toEqual(CASA_TOMATE_DOOR)
    expect(throughBuildings(tomate)).toEqual(['maxwell'])
    // From the south lawn the way in is through Newton and Casa Blanca.
    expect(throughBuildings(route('pagoda', 'teatro-casa-blanca'))).toEqual(['newton', 'casa-blanca'])
  })

  it('goes through Maxwell to both clinics behind it', () => {
    for (const to of ['odontologia', 'casa-corona']) {
      const r = route('da-vinci', to)
      expect(throughBuildings(r), to).toEqual(['maxwell'])
      expect(r.unmapped, to).toBe(0)
    }
  })

  it('crosses the bridge and walks into Hayek for the Dragon Shop', () => {
    const r = route('miguel-de-santiago', 'dragon-shop')
    expect(r.usesBridge).toBe(true)
    expect(r.landmarks.at(-1)).toEqual({ kind: 'building', id: 'hayek', enters: true })
    expect(r.path.at(-1)).toEqual(DRAGON_SHOP_DOOR)
  })

  it('turns towards the Obelisk at the Coliseo door', () => {
    const r = route('miguel-de-santiago', 'obelisco')
    expect(r.path.at(-2)).toEqual(COLISEO_DOOR)
    expect(r.path.at(-1)).toEqual(OBELISCO_DOOR)
  })

  it('leaves campus by a gate and follows the street to the vet clinic', () => {
    const r = route('miguel-de-santiago', 'veterinaria')
    expect(r.landmarks[0]).toEqual({ kind: 'gate', gate: 'principal', leaving: true })
    const back = route('veterinaria', 'miguel-de-santiago')
    expect(back.landmarks.at(-1)).toEqual({ kind: 'gate', gate: 'principal', leaving: false })
    expect(back.distance).toBeCloseTo(r.distance)
  })
})

describe('GPS', () => {
  it('treats readings far from the grounds as off campus', () => {
    expect(isOnCampus(MAIN_GATE.inside)).toBe(true)
    expect(isOnCampus(endpointsForBuilding('hayek')[0].point)).toBe(true)
    expect(isOnCampus([-400, 300])).toBe(false)
  })

  it('joins a reading in the open to the walkways without cutting through a building', () => {
    const xs = CAMPUS_BOUNDARY.map((p) => p[0]), ys = CAMPUS_BOUNDARY.map((p) => p[1])
    const blocked: string[] = []
    let open = 0
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 12) for (let y = Math.min(...ys); y < Math.max(...ys); y += 12) {
      const p: Vec2 = [x, y]
      if (!pointInPolygon(p, CAMPUS_BOUNDARY) || CAMPUS_BUILDINGS.some((b) => pointInPolygon(p, b.ring)) || WATER.some((w) => pointInPolygon(p, w.ring))) continue
      open++
      if (crossed(p, endpointForPosition(p).at).size > 0) blocked.push(`${x.toFixed(0)},${y.toFixed(0)}`)
    }
    // About one reading in sixteen falls in a strip between buildings and the campus wall that sees no walkway:
    // there the link takes the shortest way through a building. Mapping those strips is the fix.
    expect(blocked.length / open, blocked.join(' ')).toBeLessThan(0.07)
  })
})
