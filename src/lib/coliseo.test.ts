import { describe, expect, it } from 'vitest'
import { BASKETBALL, COLISEO, COLISEO_STANDS, COLISEO_WALLS, VOLLEYBALL, coliseoToCampus, wallPieces } from './coliseo'
import { findCampusBuilding } from './campus'

describe('Coliseo interior', () => {
  it('anchors its frame on the mapped footprint', () => {
    const ring = findCampusBuilding('coliseo')!.ring
    coliseoToCampus([0, 0]).forEach((v, i) => expect(v).toBeCloseTo(ring[4][i], 8))
    coliseoToCampus([COLISEO.width, 0]).forEach((v, i) => expect(v).toBeCloseTo(ring[3][i], 8))
    // The footprint is only nearly rectangular, so the far corner lands within half a metre.
    const northWest = coliseoToCampus([0, COLISEO.depth])
    expect(Math.hypot(northWest[0] - ring[0][0], northWest[1] - ring[0][1])).toBeLessThan(0.5)
  })

  it('keeps every wall inside the building', () => {
    for (const wall of COLISEO_WALLS) for (const [x, y] of [wall.from, wall.to]) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(COLISEO.width)
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(COLISEO.depth)
    }
  })

  it('cuts doors out of walls', () => {
    expect(wallPieces({ from: [0, 0], to: [10, 0] })).toEqual([[0, 10]])
    expect(wallPieces({ from: [0, 0], to: [10, 0], doors: [{ at: 7, width: 2 }, { at: 2, width: 1 }] })).toEqual([[0, 1.5], [2.5, 6], [8, 10]])
    expect(wallPieces({ from: [0, 0], to: [0, 10], doors: [{ at: 9.5, width: 2 }] })).toEqual([[0, 8.5]])
    // Every door of the model leaves wall on both sides of it.
    for (const wall of COLISEO_WALLS) expect(wallPieces(wall)).toHaveLength((wall.doors?.length ?? 0) + 1)
  })

  it('fits both courts in the hall without overlapping each other or the stands', () => {
    for (const court of [BASKETBALL, VOLLEYBALL]) {
      expect(court.center[0] - court.length / 2).toBeGreaterThan(COLISEO.service)
      expect(court.center[0] + court.length / 2).toBeLessThan(COLISEO.width)
      expect(court.center[1] + court.width / 2).toBeLessThan(COLISEO.depth)
    }
    expect(VOLLEYBALL.center[1] - VOLLEYBALL.width / 2).toBeGreaterThan(COLISEO.stands)
    expect(BASKETBALL.center[1] - BASKETBALL.width / 2).toBeGreaterThan(VOLLEYBALL.center[1] + VOLLEYBALL.width / 2)
    expect(COLISEO_STANDS.tiers * COLISEO_STANDS.tread).toBeLessThan(COLISEO.stands)
  })
})
