import { describe, expect, it } from 'vitest'
import polygonClipping from 'polygon-clipping'
import { CAMPUS_BUILDINGS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { endpointForBuilding, findOutdoorRoute } from './outdoor'
import { MIGUEL_VOLUMES, MIGUEL_ENTRANCE, miguelToCampus } from './miguel'
import { terrainHeightAt } from './terrain'

describe('Miguel de Santiago photo model',()=>{
  it('changes wing heights without losing or expanding the mapped footprint',()=>{
    const ring=findCampusBuilding('miguel-de-santiago')!.ring
    const pieces=MIGUEL_VOLUMES.map(v=>[v.ring] as polygonClipping.Polygon)
    const combined=polygonClipping.union(pieces[0],...pieces.slice(1))
    expect(polygonClipping.difference(combined,[ring])).toEqual([])
    expect(polygonClipping.difference([ring],combined)).toEqual([])
    expect(new Set(MIGUEL_VOLUMES.map(v=>v.height))).toEqual(new Set([7,10.5,12.4]))
  })
  it('uses the photographed entrance at the foot of the stairs for routes in both directions',()=>{
    const endpoint=endpointForBuilding('miguel-de-santiago')!
    expect(endpoint.point).toEqual(miguelToCampus([MIGUEL_ENTRANCE.x,MIGUEL_ENTRANCE.stairFront]))
    expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(endpoint.point,b.ring))).toBe(false)
    expect(terrainHeightAt(endpoint.point)).toBeCloseTo(.55)
    const other=endpointForBuilding('hayek')!
    const outward=findOutdoorRoute(endpoint,other)!,inward=findOutdoorRoute(other,endpoint)!
    expect(outward.usesBridge).toBe(true);expect(inward.usesBridge).toBe(true)
    expect(outward.links[0][0]).toEqual(endpoint.point);expect(inward.links.at(-1)![1]).toEqual(endpoint.point)
    expect(outward.distance).toBeCloseTo(inward.distance)
  })
})
