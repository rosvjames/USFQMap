import { describe, expect, it } from 'vitest'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { pointInPolygon } from './geo'
import { findCampusBuilding } from './campus'
import { terrainHeightAt, PATH_LEVEL } from './terrain'

describe('photo-referenced Hall entrance', () => {
  it('faces the quadrangle and places its approach outside the building footprint', () => {
    const hall = findCampusBuilding('hall-principal')!
    expect(pointInPolygon(hallToCampus([0, -1]), hall.ring)).toBe(true)
    expect(pointInPolygon(hallToCampus([0, 8]), hall.ring)).toBe(false)
  })

  it('represents the raised deck and stair heights in the map terrain', () => {
    expect(terrainHeightAt(hallToCampus([2, 1.2]))).toBeCloseTo(HALL_ENTRANCE.level)
    expect(terrainHeightAt(hallToCampus([2, HALL_ENTRANCE.stairFront + 0.1]))).toBeCloseTo(PATH_LEVEL)
    const middle = (HALL_ENTRANCE.platformFront + HALL_ENTRANCE.stairFront) / 2
    expect(terrainHeightAt(hallToCampus([2, middle]))).toBeCloseTo((HALL_ENTRANCE.level + PATH_LEVEL) / 2)
  })
})
