import { describe, expect, it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { maxwellToCampus } from './maxwell'
import { isMaxwellCourtyard } from './maxwellCourtyard'
import { CAFE_BUS, CAFE_OBELISK, CAFE_OUTLINE, CAFE_PLANTERS, CAFE_TABLES, CAFE_TURF, isMaxwellCafe } from './maxwellCafe'
import type { Vec2 } from '../types'

describe('Maxwell side café placement', () => {
  it('fits the paving, bus, planting and seating in the notch between Maxwell and Da Vinci', () => {
    const busCorners: Vec2[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec2 => [CAFE_BUS.center[0] + sx * CAFE_BUS.length / 2, CAFE_BUS.center[1] + sz * CAFE_BUS.width / 2]))
    const umbrellaCorners: Vec2[] = CAFE_TABLES.flatMap(([x, z]) => [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec2 => [x + sx * 1.5, z + sz * 1.5])))
    for (const local of [...CAFE_OUTLINE, ...CAFE_TURF, ...busCorners, ...umbrellaCorners, CAFE_OBELISK, ...CAFE_PLANTERS]) {
      const world = maxwellToCampus(local)
      expect(CAMPUS_BUILDINGS.some((b) => pointInPolygon(world, b.ring)), `inside a building at ${local}`).toBe(false)
      expect(isMaxwellCourtyard(world)).toBe(false)
    }
    for (const local of [...busCorners, ...umbrellaCorners]) expect(isMaxwellCafe(maxwellToCampus(local)), `outside courtyard at ${local}`).toBe(true)
  })
  it('keeps a passage from the dragon-side entrance between the bus and tables', () => {
    for (const point of [[-19.5, -3.9], [-23, -3.9], [-28, -3.9], [-33, -3.9]] as Vec2[]) {
      expect(isMaxwellCafe(maxwellToCampus(point))).toBe(true)
      expect(pointInPolygon(point, CAFE_TURF)).toBe(false)
      expect(Math.abs(point[1] - CAFE_BUS.center[1])).toBeGreaterThan(CAFE_BUS.width / 2 + 0.4)
    }
  })
})
