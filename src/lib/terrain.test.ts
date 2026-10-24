import { CAMPUS_ELEVATION } from './elevation'
import { describe, expect, it } from 'vitest'
import { NATURAL_PITCH_STAIRS, SPORT_STAIRS, terrainHeightAt, wallStepsLevels } from './terrain'
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
    const stair = SPORT_STAIRS[0]
    expect(terrainHeightAt(stair.top)).toBeCloseTo(campusBaseHeightAt(stair.top) + CAMPUS_ELEVATION)
    expect(terrainHeightAt(stair.bottom)).toBeCloseTo(stair.low + CAMPUS_ELEVATION)
    // The natural pitch is reached by the flight behind its north goal, not from the lane's side.
    const { a, b, count, tread } = NATURAL_PITCH_STAIRS, top: [number, number] = [(a[0] + b[0]) / 2, a[1] - .01], { low } = wallStepsLevels(NATURAL_PITCH_STAIRS, top)
    expect(terrainHeightAt(top)).toBeCloseTo(campusBaseHeightAt(top) + CAMPUS_ELEVATION, 1)
    expect(terrainHeightAt([top[0], a[1] - count * tread + .01])).toBeCloseTo(low + CAMPUS_ELEVATION, 1)
    expect(terrainHeightAt([2.5, -121])).toBeCloseTo(low + CAMPUS_ELEVATION)
  })

  it('matches the raised Coliseo lawn instead of floating above its rendered floor', () => {
    expect(terrainHeightAt(coliseoToCampus([-10, 15]))).toBeCloseTo(.4 + CAMPUS_ELEVATION)
  })
})
