import { describe, expect, it } from 'vitest'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { pointInPolygon } from './geo'
import { findCampusBuilding } from './campus'
import { terrainHeightAt, PATH_LEVEL } from './terrain'
import { isWalkable, moveWalker, walkingStart } from './walking'

describe('photo-referenced Hall entrance', () => {
  it('faces the quadrangle and places its approach outside the building footprint', () => {
    const hall = findCampusBuilding('hall-principal')!
    expect(pointInPolygon(hallToCampus([0, -1]), hall.ring)).toBe(true)
    expect(pointInPolygon(hallToCampus([0, 8]), hall.ring)).toBe(false)
    expect(isWalkable(walkingStart('hall-principal'))).toBe(true)
  })

  it('allows climbing the broad stairs on either side of the statue', () => {
    for (const x of [-2, 2]) {
      const start = hallToCampus([x, HALL_ENTRANCE.stairFront + 0.1])
      const goal = hallToCampus([x, 1.2])
      expect(terrainHeightAt(start)).toBeCloseTo(PATH_LEVEL)
      const end = moveWalker(start, [goal[0] - start[0], goal[1] - start[1]])
      expect(end[0]).toBeCloseTo(goal[0])
      expect(end[1]).toBeCloseTo(goal[1])
      expect(terrainHeightAt(end)).toBeCloseTo(HALL_ENTRANCE.level)
    }
  })

  it('keeps the statue base, lion plinths and columns solid', () => {
    for (const point of [[0, 4], [-8.65, 5.5], [8.65, 5.5], [-3.65, 2.8], [3.65, 2.8]] as [number, number][]) {
      expect(isWalkable(hallToCampus(point)), String(point)).toBe(false)
    }
  })
})
