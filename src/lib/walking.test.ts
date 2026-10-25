import { coliseoToCampus } from './coliseo'
import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/buildings'
import { CAMPUS_AREAS, CAMPUS_STREET_ACCESS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { hallToCampus } from './hall'
import { HALL_PASSAGE } from './hallPassage'
import { miguelGardenToCampus } from './miguelGarden'
import { ELEVATED_WALKWAYS, SPORT_ZONES, terrainHeightAt } from './terrain'
import { isWalkable, moveWalker, moveWalkerOnSurface, walkingStart } from './walking'
import type { Vec2 } from '../types'

describe('exterior exploration', () => {
  it('spawns on clear exterior ground for every catalogued place', () => {
    for (const { id } of BUILDINGS) expect(isWalkable(walkingStart(id)), id).toBe(true)
    expect(isWalkable(walkingStart('unknown'))).toBe(true)
  })

  it('blocks buildings, the lagoon and the rocket pedestal', () => {
    expect(isWalkable(findCampusBuilding('galileo')!.center)).toBe(false)
    const water = CAMPUS_AREAS.find(a => a.kind === 'water')!
    const point: Vec2 = [water.ring.reduce((s,p)=>s+p[0],0)/water.ring.length,water.ring.reduce((s,p)=>s+p[1],0)/water.ring.length]
    expect(pointInPolygon(point,water.ring)).toBe(true)
    expect(isWalkable(point)).toBe(false)
    expect(isWalkable(miguelGardenToCampus([8.5,8]))).toBe(false)
    const start=miguelGardenToCampus([5,8]), end=moveWalker(start,[8,0])
    expect(end[0]).toBeLessThan(miguelGardenToCampus([6.4,8])[0])
  })

  it('walks across the Hall stairs and through its exterior tunnel', () => {
    const start=hallToCampus([2,10]), top=hallToCampus([2,2])
    const end=moveWalker(start,[top[0]-start[0],top[1]-start[1]])
    expect(Math.hypot(end[0]-top[0],end[1]-top[1])).toBeLessThan(.01)
    expect(terrainHeightAt(end)).toBeGreaterThan(1.5)
    expect(isWalkable(hallToCampus([HALL_PASSAGE.center,-20]))).toBe(true)
  })

  it('keeps the sculptures and columns at the Hall solid while leaving a way between them', () => {
    expect(isWalkable(hallToCampus([0,4]))).toBe(false)
    expect(isWalkable(hallToCampus([3.65,2.8]))).toBe(false)
    expect(isWalkable(hallToCampus([2,2.8]))).toBe(true)
  })

  it('keeps the bridge deck and ramp traversable without stepping off the sides', () => {
    for (const way of ELEVATED_WALKWAYS) for(let i=1;i<way.line.length;i++) {
      const a=way.line[i-1],b=way.line[i]
      // Stay away from building ends: the exterior walk stops before doors.
      const from:Vec2=[a[0]*.8+b[0]*.2,a[1]*.8+b[1]*.2]
      const to:Vec2=[a[0]*.2+b[0]*.8,a[1]*.2+b[1]*.8]
      const end=moveWalker(from,[to[0]-from[0],to[1]-from[1]])
      expect(Math.hypot(end[0]-to[0],end[1]-to[1]),way.osmId).toBeLessThan(.01)
    }
    expect(isWalkable([1000,1000])).toBe(false)
  })

  it('stops long moves before a wall', () => {
    const start=walkingStart('galileo'),center=findCampusBuilding('galileo')!.center
    const movement:Vec2=[2*(center[0]-start[0]),2*(center[1]-start[1])]
    const end=moveWalker(start,movement)
    expect(isWalkable(end)).toBe(true)
    expect(Math.hypot(end[0]-start[0],end[1]-start[1])).toBeLessThan(Math.hypot(...movement))
  })

  it('blocks both sides of the beach volleyball fences, including long movements', () => {
    const ring = SPORT_ZONES.find(zone => zone.kind === 'sand')!.area.ring
    // Sample away from the existing 3 m entrance in the middle of the west side.
    for (let edge = 0; edge < ring.length - 1; edge++) for (const t of [.2, .8]) {
      const a = ring[edge], b = ring[edge + 1], length = Math.hypot(b[0] - a[0], b[1] - a[1])
      const mid: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      const normal: Vec2 = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length]
      expect(isWalkable(mid), `fence at ${mid}`).toBe(false)
      for (const side of [-1, 1]) {
        const start: Vec2 = [mid[0] + normal[0] * side, mid[1] + normal[1] * side]
        expect(isWalkable(start)).toBe(true)
        const end = moveWalker(start, [-normal[0] * side * 2, -normal[1] * side * 2])
        expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeLessThan(.85)
      }
    }
  })

  it('leaves the west volleyball entrance open in both directions', () => {
    const outside: Vec2 = [-43, -52.6], inside: Vec2 = [-40.8, -52.7]
    for (const [a, b] of [[outside, inside], [inside, outside]]) {
      expect(isWalkable(a)).toBe(true)
      const end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1])).toBeLessThan(.01)
    }
  })

  it('reaches the natural football pitch by the stairs behind its north goal, not over the lane railing', () => {
    const route: Vec2[] = [[-3.5, -110], [1.5, -109.2], [6, -109.2], [6, -114]]
    for (const points of [route, route.slice().reverse()]) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1]), `blocked at ${end}`).toBeLessThan(.01)
    }
    expect(moveWalker([-4.3, -121], [7.6, 0])[0]).toBeLessThan(1.8)
  })

  it('walks down the tennis bleachers from the straight walkway, and up the steps to the Obelisk lawn', () => {
    const routes: Vec2[][] = [[[-63.3, -115], [-55, -115]], [coliseoToCampus([6.3, 5]), coliseoToCampus([6.3, 12])]]
    for (const route of routes) for (const [a, b] of [route, route.slice().reverse()]) {
      const end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1]), `blocked at ${end}`).toBeLessThan(.01)
    }
  })

  it('walks downhill past the Coliseo corner without being pinched by the pitch fence', () => {
    const points: Vec2[] = [[-6, -104], [-6, -106], [-5.8, -108.6], [-3.5, -110], [-3.5, -118], [-4.3, -121]]
    for (const route of [points, points.slice().reverse()]) for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1]), `blocked at ${end}`).toBeLessThan(.01)
    }
  })

  it('connects the main quadrangle to the pitch through the central downhill lane', () => {
    const route: Vec2[] = [[-20, 33], [-22.5, 0], [-16, -2.5], [-9.5, -27], [-5, -108], [1.5, -109.2], [6, -109.2], [12, -114], [12, -132]]
    for (const points of [route, route.slice().reverse()]) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1]), `blocked at ${end}`).toBeLessThan(.01)
    }
  })

  it('enters the bridge directly from the passage between the pitches, without taking the street ramp', () => {
    const route: Vec2[] = [[-3.5, -132], [-2.8, -141], [-3.2, -152.5], [-4.920314975700418, -155.45598659999865], [-8, -162]]
    for (const points of [route, route.slice().reverse()]) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], end = moveWalker(a, [b[0] - a[0], b[1] - a[1]])
      expect(Math.hypot(end[0] - b[0], end[1] - b[1]), `blocked at ${end}`).toBeLessThan(.01)
    }
    expect(terrainHeightAt([-2.8, -141])).toBeGreaterThan(5.5)
  })

  it('follows the street approach underneath the bridge before climbing the side ramp', () => {
    const ramp = ELEVATED_WALKWAYS.find(w => w.osmId === 'way/1032704764')!
    const points = [...CAMPUS_STREET_ACCESS.slice().reverse(), ...ramp.line.slice(0, -1).reverse()]
    let walker = { point: points[0], height: .55 }
    for (let i = 1; i < points.length; i++) {
      const b = points[i], a = walker.point
      walker = moveWalkerOnSurface(a, [b[0] - a[0], b[1] - a[1]], walker.height)
      expect(Math.hypot(walker.point[0] - b[0], walker.point[1] - b[1]), `blocked at ${walker.point}`).toBeLessThan(.01)
      if (i === 1) expect(walker.height).toBeCloseTo(.55)
    }
    expect(walker.height).toBeCloseTo(6)
  })
})
