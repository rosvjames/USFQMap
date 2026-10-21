import { describe, expect, it } from 'vitest'
import { BUILDINGS } from '../data/buildings'
import { CAMPUS_AREAS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { hallToCampus } from './hall'
import { HALL_PASSAGE } from './hallPassage'
import { miguelGardenToCampus } from './miguelGarden'
import { ELEVATED_WALKWAYS, terrainHeightAt } from './terrain'
import { isWalkable, moveWalker, walkingStart } from './walking'
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
})
