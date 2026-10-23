import { CAMPUS_ELEVATION } from './elevation'
import { describe,expect,it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { NEWTON_ENTRANCE as h,NEWTON_ACCESS_PATH,NEWTON_DOOR_APPROACH,newtonToCampus } from './newton'
import { GALILEO_LAGOON } from './galileo'
import { terrainHeightAt } from './terrain'
import { endpointForBuilding,findOutdoorRoute } from './outdoor'

describe('Newton entrance facing the lagoon',()=>{
  it('descends to the connected path without crossing the building or lagoon',()=>{
    expect(terrainHeightAt(newtonToCampus([h.x,1]))).toBeCloseTo((h.level) + CAMPUS_ELEVATION)
    let previous=h.level+CAMPUS_ELEVATION
    for(let i=0;i<=h.steps;i++) {
      const p=newtonToCampus([h.x,h.platformFront+(h.stairFront-h.platformFront)*i/h.steps])
      expect(terrainHeightAt(p)).toBeLessThanOrEqual(previous+1e-8)
      previous=terrainHeightAt(p)
    }
    expect(previous).toBeCloseTo(h.ground+CAMPUS_ELEVATION)
    for(let i=1;i<NEWTON_ACCESS_PATH.length;i++)for(let t=0;t<=1;t+=.05) {
      const a=NEWTON_ACCESS_PATH[i-1],b=NEWTON_ACCESS_PATH[i],p:[number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(p,b.ring))).toBe(false)
      expect(pointInPolygon(p,GALILEO_LAGOON.ring)).toBe(false)
    }
  })
  it('arrives and departs through the pictured entrance',()=>{
    const newton=endpointForBuilding('newton')!,miguel=endpointForBuilding('miguel-de-santiago')!
    expect(newton.point).toEqual(NEWTON_DOOR_APPROACH)
    const go=findOutdoorRoute(miguel,newton)!,back=findOutdoorRoute(newton,miguel)!
    expect(go.path.at(-1)).toEqual(NEWTON_DOOR_APPROACH)
    expect(back.path[0]).toEqual(NEWTON_DOOR_APPROACH)
    expect(go.distance).toBeCloseTo(back.distance)
  })
})
