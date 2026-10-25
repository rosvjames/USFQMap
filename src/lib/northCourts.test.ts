import { describe, expect, it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { HALL_CROSSING, HALL_CROSSING_INDOOR, NORTH_COURT_PATHS } from './northCourts'
import { endpointsForBuilding, findOutdoorRoute } from './outdoor'
import type { Vec2 } from '../types'

/** Buildings a leg passes through, sampled every 25 cm (the leg's own ends excluded). */
function crossed(a: Vec2, b: Vec2): Set<string> {
  const ids = new Set<string>()
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25)
  for (let i = 1; i < steps; i++) {
    const p: Vec2 = [a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]
    for (const building of CAMPUS_BUILDINGS) if (pointInPolygon(p, building.ring)) ids.add(building.info?.id ?? building.osmId)
  }
  return ids
}

describe('walkways north of Einstein', () => {
  it('only goes indoors across the Hall lobby', () => {
    for (const path of NORTH_COURT_PATHS) path.slice(1).forEach((b, i) => {
      const legs = [...crossed(path[i], b)]
      const lobby = path === HALL_CROSSING && i >= HALL_CROSSING_INDOOR && i < HALL_CROSSING_INDOOR + 3
      expect(legs, `leg ${i} ${path[i]} → ${b}`).toEqual(lobby ? ['hall-principal'] : [])
    })
  })

  it('routes to Da Vinci, Epicuro and Maxwell through the Hall or a confirmed building, never across another', () => {
    for (const to of ['da-vinci', 'epicuro', 'maxwell']) for (const from of ['guardiania-norte', 'galileo', 'hayek', 'einstein']) {
      const route = findOutdoorRoute(endpointsForBuilding(from), endpointsForBuilding(to))!
      expect(route.unmapped, `${from} → ${to}`).toBe(0)
      // No mapped walkway reaches the courts: the way in is the Hall lobby, or Newton and Casa Blanca to Maxwell's yard.
      const through = route.landmarks.flatMap((l) => l.kind === 'building' ? [l.id] : [])
      expect(through.length, `${from} → ${to}`).toBeGreaterThan(0)
      expect(through, `${from} → ${to}`).not.toContain(to)
      const legs = [...route.links, ...route.path.slice(1).map((p, i): [Vec2, Vec2] => [route.path[i], p])]
      const indoors = new Set(legs.flatMap(([a, b]) => [...crossed(a, b)]))
      // Endpoints sit on or beside their own footprint.
      for (const id of [...through, from, to]) indoors.delete(id)
      expect([...indoors], `${from} → ${to}`).toEqual([])
    }
  })
})
