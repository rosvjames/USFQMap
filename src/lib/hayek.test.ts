import { describe, expect, it } from 'vitest'
import { findCampusBuilding } from './campus'
import { endpointForBuilding, findOutdoorRoute } from './outdoor'
import { pointInPolygon } from './geo'
import { HAYEK_ENTRANCE, hayekToCampus } from './hayek'
import { BRIDGE_LEVEL, ELEVATED_WALKWAYS, terrainHeightAt } from './terrain'
import { search } from './search'
import { floorName, findRoute } from './pathfinding'
import { PLANS } from '../data/plans'

describe('photo-located Hayek entrance', () => {
  it('finds Ápice on floor zero without assigning that convention to other buildings', () => {
    expect(search('apice')[0]).toMatchObject({ title: 'Ápice', buildingId: 'hayek', floor: 0, landmark: true })
    expect(search('cafetería')[0]).toMatchObject({ key: 'apice' })
    expect(search('H001')[0].subtitle).toContain('piso 0 · Ápice')
    expect(search('DW010')[0]).toMatchObject({buildingId:'darwin',floor:0})
    expect(floorName(0, 'darwin')).toBe('subsuelo')
    expect(floorName(-1, 'hayek')).toBe('subsuelo 1')
    expect(floorName(-2, 'hayek')).toBe('subsuelo 2')
    expect(PLANS.hayek).toBeUndefined()
  })
  it('describes Hayek floor changes from Ápice into the classroom basements', () => {
    const route=findRoute({buildingId:'hayek',floors:[0,-1,-2],nodes:[
      {id:'zero',kind:'stairs',floor:0,x:0,y:0},
      {id:'one',kind:'stairs',floor:-1,x:0,y:0},
      {id:'two',kind:'room',floor:-2,x:0,y:0,label:'Aula'},
    ],edges:[{from:'zero',to:'one'},{from:'one',to:'two'}]},'zero','two')!
    expect(route.steps[0]).toContain('piso 0 · Ápice')
    expect(route.steps[1]).toContain('Baja al subsuelo 1')
    expect(route.steps[2]).toContain('Baja al subsuelo 2')
  })
  it('uses the bridge-facing door rather than the nearest rear wall', () => {
    const endpoint = endpointForBuilding('hayek')!
    expect(endpoint.point).toEqual(hayekToCampus(HAYEK_ENTRANCE.door))
    expect(endpoint.nodeId).toBe(ELEVATED_WALKWAYS[0].line[0].map(v => v.toFixed(2)).join(','))
    expect(pointInPolygon(endpoint.point, findCampusBuilding('hayek')!.ring)).toBe(false)
    expect(terrainHeightAt(endpoint.point)).toBeCloseTo(BRIDGE_LEVEL)
  })
  it('places the small door just left of the bridge while keeping both portals on the terrace', () => {
    expect(HAYEK_ENTRANCE.door[0]).toBeCloseTo(-2)
    expect(HAYEK_ENTRANCE.portalX).toBeCloseTo(HAYEK_ENTRANCE.door[0] - 10.3)
    expect(terrainHeightAt(hayekToCampus([HAYEK_ENTRANCE.portalX - 5.6, 1.2]))).toBeCloseTo(BRIDGE_LEVEL)
  })
  it('starts and ends at that entrance and keeps the mapped bridge in both directions', () => {
    const hayek = endpointForBuilding('hayek')!
    for (const id of ['miguel-de-santiago', 'maxwell', 'ciceron', 'pagoda']) {
      const other = endpointForBuilding(id)!
      const arriving = findOutdoorRoute(other, hayek)!, leaving = findOutdoorRoute(hayek, other)!
      expect(arriving.usesBridge, id).toBe(true)
      expect(leaving.usesBridge, id).toBe(true)
      expect(arriving.links.at(-1)![1]).toEqual(hayek.point)
      expect(leaving.links[0][0]).toEqual(hayek.point)
      expect(arriving.distance).toBeCloseTo(leaving.distance)
      expect(arriving.links.at(-1)!.map(p=>terrainHeightAt(p))).toEqual([BRIDGE_LEVEL, BRIDGE_LEVEL])
    }
  })
})
