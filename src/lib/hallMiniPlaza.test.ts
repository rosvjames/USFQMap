import { describe,expect,it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { hallToCampus,HALL_ENTRANCE } from './hall'
import { HALL_MINI_PLAZA as p,HALL_MINI_CENTER as center,HALL_MINI_BEDS,HALL_MINI_TREES } from './hallMiniPlaza'

describe('Hall side mini plaza',()=>{
  it('fits into the empty left pocket without covering a building or the main entrance',()=>{
    expect(p.right).toBeLessThan(-9.4)
    for(let x=p.left;x<=p.right;x+=.5)for(let z=p.back;z<=p.front;z+=.5) {
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(hallToCampus([x,z]),b.ring))).toBe(false)
    }
    expect(p.front).toBeLessThan(HALL_ENTRANCE.platformFront)
    expect(p.gateWidth).toBeGreaterThan(1.8)
  })
  it('centers the fountain and mirrors the beds and trees across the entry axis',()=>{
    expect(center[0]).toBeCloseTo((p.left+p.right)/2)
    expect(center[1]).toBeCloseTo((p.back+p.front)/2)
    const bedCenters=HALL_MINI_BEDS.map(r=>[(r[0][0]+r[2][0])/2,(r[0][1]+r[2][1])/2])
    for(const [x,z] of bedCenters) {
      expect(bedCenters.some(b=>Math.abs(b[0]-(2*center[0]-x))<1e-8&&Math.abs(b[1]-z)<1e-8)).toBe(true)
      expect(bedCenters.some(b=>Math.abs(b[0]-x)<1e-8&&Math.abs(b[1]-(2*center[1]-z))<1e-8)).toBe(true)
      expect(Math.hypot(x-center[0],z-center[1])).toBeGreaterThan(3)
    }
    expect(HALL_MINI_TREES[0][0]+HALL_MINI_TREES[1][0]).toBeCloseTo(2*center[0])
    expect(HALL_MINI_TREES[0][1]).toEqual(HALL_MINI_TREES[1][1])
  })
})
