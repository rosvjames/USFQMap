import { CAMPUS_ELEVATION } from './elevation'
import { describe,expect,it } from 'vitest'
import { CAMPUS_BUILDINGS,findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { GALILEO_ENTRANCE as h,GALILEO_ACCESS_PATH,GALILEO_DOOR_APPROACH,GALILEO_LAGOON,galileoToCampus } from './galileo'
import { terrainHeightAt } from './terrain'
import { endpointForBuilding,findOutdoorRoute } from './outdoor'

describe('Galileo lake-facing entrance',()=>{
  it('descends from the raised portal to the lake-side footway without crossing buildings or water',()=>{
    expect(terrainHeightAt(galileoToCampus([h.x,1]))).toBeCloseTo((h.level) + CAMPUS_ELEVATION)
    let previous=h.level+CAMPUS_ELEVATION
    for(let i=0;i<=6;i++) {
      const p=galileoToCampus([h.x,h.platformFront+(h.stairFront-h.platformFront)*i/6])
      expect(terrainHeightAt(p)).toBeLessThanOrEqual(previous+1e-8)
      expect(pointInPolygon(p,findCampusBuilding('galileo')!.ring)).toBe(false)
      previous=terrainHeightAt(p)
    }
    expect(previous).toBeCloseTo(h.ground+CAMPUS_ELEVATION)
    for(let i=1;i<GALILEO_ACCESS_PATH.length;i++)for(let t=0;t<=1;t+=.1) {
      const a=GALILEO_ACCESS_PATH[i-1],b=GALILEO_ACCESS_PATH[i],p:[number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(p,b.ring))).toBe(false)
      expect(pointInPolygon(p,GALILEO_LAGOON.ring)).toBe(false)
    }
  })
  it('uses the foot of the photographed entrance for arrival and departure',()=>{
    const galileo=endpointForBuilding('galileo')!,miguel=endpointForBuilding('miguel-de-santiago')!
    expect(galileo.point).toEqual(GALILEO_DOOR_APPROACH)
    const go=findOutdoorRoute(miguel,galileo)!,back=findOutdoorRoute(galileo,miguel)!
    expect(go.path.at(-1)).toEqual(GALILEO_DOOR_APPROACH)
    expect(back.path[0]).toEqual(GALILEO_DOOR_APPROACH)
    expect(go.distance).toBeCloseTo(back.distance)
  })
})
