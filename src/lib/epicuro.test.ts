import { describe,expect,it } from 'vitest'
import { CAMPUS_BUILDINGS,findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { EPICURO_FRONT as f,EPICURO_TOWER_RING,EPICURO_STREET_STAIRS as s,EPICURO_STAIR_FOOT,epicuroToCampus,campusToEpicuro } from './epicuro'
import { terrainHeightAt } from './terrain'

describe('Epicuro tower and street-side descent',()=>{
  it('places the elevated tower inside Epicuro, rather than in the neighboring courtyard',()=>{
    expect(EPICURO_TOWER_RING.every(p=>pointInPolygon(p,findCampusBuilding('epicuro')!.ring))).toBe(true)
    expect(f.towerHeight).toBeGreaterThan(f.height)
    const p=epicuroToCampus([f.towerX,5])
    expect(campusToEpicuro(p)[0]).toBeCloseTo(f.towerX)
    expect(campusToEpicuro(p)[1]).toBeCloseTo(5)
  })
  it('descends on the right from the street landing without cutting through Epicuro or Da Vinci',()=>{
    expect(EPICURO_STAIR_FOOT).toBeGreaterThan(f.towerX+f.towerWidth/2-.6)
    let previous=s.level
    for(let i=0;i<=20;i++) {
      const x=s.top-(s.top-EPICURO_STAIR_FOOT)*i/20
      const p=epicuroToCampus([x,s.z])
      expect(terrainHeightAt(p)).toBeLessThanOrEqual(previous+1e-8)
      previous=terrainHeightAt(p)
      for(const z of [s.z-s.width/2,s.z+s.width/2])expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(epicuroToCampus([x,z]),b.ring))).toBe(false)
    }
    expect(previous).toBeCloseTo(s.ground)
  })
})
