import { describe,expect,it } from 'vitest'
import polygonClipping from 'polygon-clipping'
import { CAMPUS_BUILDINGS,findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { MIGUEL_GARDEN_ENTRANCE as h,MIGUEL_GARDEN_TOWER_RING,MIGUEL_GARDEN_ROOF_CUT,MIGUEL_GARDEN_APPROACH,isMiguelGardenTowerFace } from './miguelGarden'
import { MIGUEL_VOLUMES } from './miguel'

describe('Miguel garden entrance photograph',()=>{
  it('fits the glazed shaft inside Miguel and removes the old roof crossing it',()=>{
    const building=findCampusBuilding('miguel-de-santiago')!
    expect(polygonClipping.difference([MIGUEL_GARDEN_TOWER_RING],[building.ring])).toEqual([])
    const roofs=MIGUEL_VOLUMES.flatMap(v=>polygonClipping.difference([v.ring],[MIGUEL_GARDEN_ROOF_CUT]))
    expect(roofs.every(p=>polygonClipping.intersection([p],[MIGUEL_GARDEN_TOWER_RING]).length===0)).toBe(true)
    expect(h.height).toBeGreaterThan(12.4)
    expect(isMiguelGardenTowerFace(building.ring[18],building.ring[19])).toBe(true)
    expect(isMiguelGardenTowerFace(building.ring[19],building.ring[20])).toBe(true)
    expect(isMiguelGardenTowerFace(building.ring[0],building.ring[1])).toBe(false)
  })
  it('keeps the approach outside all buildings and connects to the existing garden path',()=>{
    for(let i=1;i<MIGUEL_GARDEN_APPROACH.length;i++)for(let t=0;t<=1;t+=.05) {
      const a=MIGUEL_GARDEN_APPROACH[i-1],b=MIGUEL_GARDEN_APPROACH[i],p:[number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(p,b.ring))).toBe(false)
    }
    expect(Math.hypot(MIGUEL_GARDEN_APPROACH[1][0]+96.48,MIGUEL_GARDEN_APPROACH[1][1]+65.16)).toBeLessThan(.1)
  })
})
