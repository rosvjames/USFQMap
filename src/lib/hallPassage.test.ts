import { describe, expect, it } from 'vitest'
import raw from '../data/campus.json'
import { findCampusBuilding } from './campus'
import { pointInPolygon, toLocal } from './geo'
import { campusToHall, hallToCampus, HALL_ENTRANCE } from './hall'
import { HALL_PASSAGE, HALL_TUNNEL, HALL_TUNNEL_CUTOUT, HALL_EINSTEIN_PATH, EINSTEIN_ENTRANCE, EINSTEIN_HALL_DOOR } from './hallPassage'
import { terrainHeightAt } from './terrain'
import { endpointForBuilding, findOutdoorRoute } from './outdoor'

describe('Hall–Einstein side passage',()=>{
  it('arrives just outside Einstein’s right-hand door, before the tunnel mouth',()=>{
    const [x,z]=campusToHall(endpointForBuilding('einstein')!.point)
    expect(x).toBeGreaterThan(HALL_PASSAGE.center)
    expect(x).toBeLessThan(EINSTEIN_ENTRANCE.wall)
    expect(EINSTEIN_ENTRANCE.wall-x).toBeCloseTo(.4)
    expect(z).toBeCloseTo(EINSTEIN_ENTRANCE.z)
    expect(z-EINSTEIN_ENTRANCE.width/2).toBeGreaterThan(HALL_TUNNEL.mouth)
    const forward=findOutdoorRoute(endpointForBuilding('hall-principal')!,endpointForBuilding('einstein')!)!
    const reverse=findOutdoorRoute(endpointForBuilding('einstein')!,endpointForBuilding('hall-principal')!)!
    expect(forward.path.at(-1)).toEqual(EINSTEIN_HALL_DOOR)
    expect(reverse.path[0]).toEqual(EINSTEIN_HALL_DOOR)
  })
  it('joins the buildings again behind the tunnel mouth instead of continuing the open gap',()=>{
    const einstein=findCampusBuilding('einstein')!
    for(const z of [-15,-22,-30,-38]) {
      expect(pointInPolygon(hallToCampus([HALL_PASSAGE.center,z]),einstein.ring)).toBe(true)
    }
  })
  it('descends continuously through the covered tunnel to the open passage',()=>{
    const t=HALL_TUNNEL
    let previous=t.upper
    for(let i=0;i<=18;i++) {
      const z=t.back+(t.mouth-t.back)*i/18,p=hallToCampus([HALL_PASSAGE.center,z]),height=terrainHeightAt(p)
      expect(height).toBeLessThanOrEqual(previous+1e-8)
      expect(height).toBeCloseTo(t.upper-(t.upper-t.lower)*i/18)
      expect(t.ceiling-height).toBeGreaterThan(2.5)
      if(i>0&&i<18)expect(pointInPolygon(p,HALL_TUNNEL_CUTOUT)).toBe(true)
      previous=height
    }
    expect(previous).toBeCloseTo(HALL_ENTRANCE.ground)
  })
  it('preserves the entire Hall and places a constant-width passage outside its right side',()=>{
    const hall=findCampusBuilding('hall-principal')!,einstein=findCampusBuilding('einstein')!
    const feature=raw.features.find(f=>f.properties.osm_id===hall.osmId)!
    expect(hall.ring).toEqual((feature.geometry.coordinates as number[][][])[0].map(toLocal))
    expect(HALL_PASSAGE.left).toBeGreaterThan(HALL_ENTRANCE.width/2)
    expect(HALL_PASSAGE.right-HALL_PASSAGE.left).toBeGreaterThan(3)
    for(const z of [0,-2,-5,-10,-13])for(const x of [HALL_PASSAGE.left,HALL_PASSAGE.center,HALL_PASSAGE.right]) {
      const p=hallToCampus([x,z])
      expect(pointInPolygon(p,hall.ring)).toBe(false)
      expect(pointInPolygon(p,einstein.ring)).toBe(false)
    }
    expect(pointInPolygon(hallToCampus([6.1,-5]),hall.ring)).toBe(true)
    expect(terrainHeightAt(hallToCampus([HALL_PASSAGE.center,0]))).toBeCloseTo(HALL_ENTRANCE.level)
    expect(terrainHeightAt(hallToCampus([HALL_PASSAGE.center,HALL_PASSAGE.stairBack]))).toBeCloseTo(HALL_ENTRANCE.ground)
    expect(terrainHeightAt(EINSTEIN_HALL_DOOR)).toBeCloseTo(HALL_ENTRANCE.ground)
  })
  it('walks along the exterior passage in both directions without entering either building',()=>{
    const hall=endpointForBuilding('hall-principal')!,einstein=endpointForBuilding('einstein')!
    expect(einstein.point).toEqual(EINSTEIN_HALL_DOOR)
    const forward=findOutdoorRoute(hall,einstein)!,back=findOutdoorRoute(einstein,hall)!
    expect(forward.usesHallPassage).toBe(true);expect(back.usesHallPassage).toBe(true)
    for(const p of HALL_EINSTEIN_PATH.slice(2))expect(forward.path).toContainEqual(p)
    for(let i=1;i<forward.path.length;i++)for(let t=0;t<=1;t+=.1) {
      const a=forward.path[i-1],b=forward.path[i],p:[number,number]=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
      expect(pointInPolygon(p,findCampusBuilding('hall-principal')!.ring)).toBe(false)
      expect(pointInPolygon(p,findCampusBuilding('einstein')!.ring)).toBe(false)
    }
    expect(forward.distance).toBeCloseTo(back.distance)
    expect(forward.distance).toBeLessThan(50)
  })
})
