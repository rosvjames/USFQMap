import { describe, expect, it } from 'vitest'
import { CAMPUS_AREAS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { isWalkable, moveWalker, walkingStart } from './walking'
import type { Vec2 } from '../types'

describe('walking around the campus', () => {
  it('starts outside obstacles even when a building is selected', () => {
    for (const id of ['hall-principal', 'pagoda', 'maxwell', 'hayek', 'ciceron', 'veterinaria']) {
      const start = walkingStart(id)
      const center = findCampusBuilding(id)!.center
      expect(isWalkable(start), id).toBe(true)
      expect(Math.hypot(start[0] - center[0], start[1] - center[1]), id).toBeGreaterThanOrEqual(20)
    }
  })

  it('blocks buildings and the lagoon', () => {
    expect(isWalkable(findCampusBuilding('galileo')!.center)).toBe(false)
    const water = CAMPUS_AREAS.find((area) => area.kind === 'water')!
    const point: Vec2 = [water.ring.reduce((s, p) => s + p[0], 0) / water.ring.length, water.ring.reduce((s, p) => s + p[1], 0) / water.ring.length]
    expect(pointInPolygon(point, water.ring)).toBe(true)
    expect(isWalkable(point)).toBe(false)
  })

  it('does not teleport through obstacles on a long movement', () => {
    const start = walkingStart('galileo')
    const center = findCampusBuilding('galileo')!.center
    const beyond: Vec2 = [2 * (center[0] - start[0]), 2 * (center[1] - start[1])]
    const end = moveWalker(start, beyond)
    expect(isWalkable(end)).toBe(true)
    expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeLessThan(Math.hypot(...beyond))
  })
})
