import { describe, expect, it } from 'vitest'
import { CASITA, createCasitaRoof, casitaToCampus } from './casita'
import { findCampusBuilding } from './campus'
import { search } from './search'

describe('La casita de la 12 de octubre',()=>{
  it('uses the new name in the map and searches without offering GOBE',()=>{
    const building=findCampusBuilding('gobe')!
    expect(building.name).toBe('La casita de la 12 de octubre')
    expect(search('casita')[0]).toMatchObject({buildingId:'gobe',title:building.name})
    expect(search('12 de octubre')[0]).toMatchObject({buildingId:'gobe'})
    expect(search('GOBE')).toEqual([])
    // The existing geographic identity remains usable by links and routes.
    casitaToCampus([-CASITA.width/2,0]).forEach((v,i)=>expect(v).toBeCloseTo(building.ring[3][i],8))
  })
  it('joins both roof slopes along the same ridge with upward faces',()=>{
    const roof=createCasitaRoof(),p=roof.getAttribute('position'),normal=roof.getAttribute('normal')
    expect(roof.index!.count).toBe(12)
    expect(p.getY(1)).toBeCloseTo(CASITA.height+CASITA.rise)
    expect(p.getY(2)).toBeCloseTo(p.getY(1))
    expect(p.getX(1)).toBe(0); expect(p.getX(2)).toBe(0)
    for(let i=0;i<normal.count;i++)expect(normal.getY(i)).toBeGreaterThan(0)
    expect(p.getZ(0)).toBeGreaterThan(0)
    expect(p.getZ(3)).toBeLessThan(-CASITA.depth)
    roof.dispose()
  })
})
