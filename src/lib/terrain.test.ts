import { CAMPUS_ELEVATION } from './elevation'
import { describe, expect, it } from 'vitest'
import { SPORT_STAIRS, terrainHeightAt } from './terrain'
import { endpointForBuilding, findOutdoorRoute } from './outdoor'
import { campusBaseHeightAt } from './campusSlope'
import { coliseoToCampus } from './coliseo'

describe('sports terraces and bridge', () => {
  it('places the table terrace and tennis courts at successive lower levels', () => {
    const path = terrainHeightAt([-75, -112])
    const terrace = terrainHeightAt([-43, -78])
    const tennis = terrainHeightAt([-44, -112])
    expect(terrace).toBeLessThan(path - 1)
    expect(tennis).toBeLessThan(terrace - 1)
    expect(terrainHeightAt([-15, -120])).toBeLessThan(path - 2)
    expect(terrainHeightAt([12, -132])).toBeLessThan(path - 2)
  })

  it('raises the Hayek crossing above traffic and follows the bridge in routes', () => {
    expect(terrainHeightAt([-17.46, -182.46])).toBeGreaterThan(5)
    const route = findOutdoorRoute(endpointForBuilding('miguel-de-santiago')!, endpointForBuilding('hayek')!)!
    expect(route.usesBridge).toBe(true)
  })

  it('connects the table terrace and natural pitch stairs to the upper path', () => {
    for (const stair of [SPORT_STAIRS[0], SPORT_STAIRS[2]]) {
      expect(terrainHeightAt(stair.top)).toBeCloseTo(campusBaseHeightAt(stair.top) + CAMPUS_ELEVATION)
      expect(terrainHeightAt(stair.bottom)).toBeCloseTo(stair.low + CAMPUS_ELEVATION)
    }
  })

  it('matches the raised Coliseo lawn instead of floating above its rendered floor', () => {
    expect(terrainHeightAt(coliseoToCampus([-10, 15]))).toBeCloseTo(.4 + CAMPUS_ELEVATION)
  })
})
