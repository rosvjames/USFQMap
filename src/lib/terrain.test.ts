import { describe, expect, it } from 'vitest'
import { SPORT_STAIRS, terrainHeightAt } from './terrain'
import { moveWalker } from './walking'
import { endpointForBuilding, findOutdoorRoute } from './outdoor'

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

  it('lets the walker use the tennis stairs without stepping off the retaining edge', () => {
    const onStairs = moveWalker([-63.3, -104], [-0.35, -7])
    expect(onStairs[1]).toBeCloseTo(-111)
    const inCourt = moveWalker(onStairs, [3.5, 0])
    expect(inCourt[0]).toBeCloseTo(-60.15)
    expect(terrainHeightAt(inCourt)).toBeLessThan(-2)
    const atWall = moveWalker([-63.3, -120], [4, 0])
    expect(atWall[0]).toBeLessThan(-62)
  })

  it('raises the Hayek crossing above traffic and follows the bridge in routes', () => {
    expect(terrainHeightAt([-17.46, -182.46])).toBeGreaterThan(5)
    const route = findOutdoorRoute(endpointForBuilding('miguel-de-santiago')!, endpointForBuilding('hayek')!)!
    expect(route.usesBridge).toBe(true)
    const onDeck = moveWalker([-21.1, -151.25], [16.18, -4.21])
    expect(onDeck[0]).toBeCloseTo(-4.92)
    const acrossRoad = moveWalker(onDeck, [-25.08, -54])
    expect(acrossRoad[0]).toBeCloseTo(-30)
    expect(acrossRoad[1]).toBeCloseTo(-209.46)
  })

  it('keeps the synthetic pitch fence solid while allowing its entrance', () => {
    expect(moveWalker([-29, -122], [3, 0])[0]).toBeLessThan(-28)
    expect(moveWalker([-28.7, -115], [3, 0])[0]).toBeGreaterThan(-27)
  })

  it('connects the table terrace and natural pitch stairs to the upper path', () => {
    for (const stair of [SPORT_STAIRS[0], SPORT_STAIRS[2]]) {
      const end = moveWalker(stair.top, [stair.bottom[0] - stair.top[0], stair.bottom[1] - stair.top[1]])
      expect(end[0]).toBeCloseTo(stair.bottom[0])
      expect(end[1]).toBeCloseTo(stair.bottom[1])
      expect(terrainHeightAt(end)).toBeCloseTo(stair.low)
    }
  })
})
