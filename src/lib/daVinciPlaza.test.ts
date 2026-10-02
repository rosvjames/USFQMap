import { describe, expect, it } from 'vitest'
import polygonClipping from 'polygon-clipping'
import { CAMPUS_BUILDINGS, findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { DA_VINCI_FRONT, DA_VINCI_FOUNTAIN, DA_VINCI_PLAZA_TREES, DA_VINCI_LAWNS, DA_VINCI_GARDEN_PATHS, daVinciFrontToCampus, isDaVinciPlaza } from './daVinciPlaza'
import { HALL_PLAZA_WING, HALL_PLAZA_REMAINDER, HALL_PLAZA_FACE, hallPlazaToCampus } from './hallPlaza'
import { terrainHeightAt } from './terrain'

describe('Da Vinci fountain plaza photographs',()=>{
  it('places the fountain and planted accents outside the buildings and leaves space for the steps',()=>{
    const {center,radius}=DA_VINCI_FOUNTAIN
    for(let i=0;i<32;i++) {
      const a=i*Math.PI/16,p=daVinciFrontToCampus([center[0]+Math.cos(a)*radius,center[1]+Math.sin(a)*radius])
      expect(isDaVinciPlaza(p)).toBe(true)
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(p,b.ring))).toBe(false)
    }
    expect(center[1]-radius).toBeGreaterThan(DA_VINCI_FRONT.stairFront)
    for(const tree of DA_VINCI_PLAZA_TREES)expect(Math.hypot(tree.at[0]-center[0],tree.at[1]-center[1])).toBeGreaterThan(radius+3)
    expect(terrainHeightAt(daVinciFrontToCampus([DA_VINCI_FRONT.portico,3]))).toBeCloseTo(DA_VINCI_FRONT.level)
    expect(terrainHeightAt(daVinciFrontToCampus([DA_VINCI_FRONT.portico,DA_VINCI_FRONT.stairFront]))).toBeCloseTo(DA_VINCI_FRONT.ground)
  })
  it('leaves the circular fountain apron and the route from the columns free of grass',()=>{
    const lawns=polygonClipping.difference(DA_VINCI_LAWNS.map(r=>[r]),DA_VINCI_GARDEN_PATHS.map(r=>[r]))
    const inGrass=(p:[number,number])=>lawns.some(poly=>pointInPolygon(daVinciFrontToCampus(p),poly[0])&&!poly.slice(1).some(hole=>pointInPolygon(daVinciFrontToCampus(p),hole)))
    expect(inGrass([19,16])).toBe(false)
    expect(inGrass([12,16])).toBe(true)
    expect(inGrass([27,16])).toBe(true)
    for(let z=7.8;z<=24;z+=.5)expect(inGrass([22,z])).toBe(false)
    for(let x=2;x<37;x+=.5)expect(inGrass([x,23])).toBe(false)
  })
  it('raises only the arched plaza wing while preserving all of the Hall footprint',()=>{
    const hall=findCampusBuilding('hall-principal')!
    const combined=polygonClipping.union(HALL_PLAZA_REMAINDER,HALL_PLAZA_WING)
    expect(polygonClipping.difference([hall.ring],combined)).toEqual([])
    expect(polygonClipping.difference(combined,[hall.ring])).toEqual([])
    expect(terrainHeightAt(hallPlazaToCampus([HALL_PLAZA_FACE.door,1.5]))).toBeCloseTo(HALL_PLAZA_FACE.level)
    expect(terrainHeightAt(hallPlazaToCampus([HALL_PLAZA_FACE.door,5.7]))).toBeCloseTo(.58)
  })
})
