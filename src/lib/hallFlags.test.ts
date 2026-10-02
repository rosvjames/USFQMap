import { describe, expect, it } from 'vitest'
import { HALL_FLAGS, HALL_FLAG_LAWN, isHallFlagGarden } from './hallFlags'
import { hallToCampus } from './hall'
import { pointInPolygon } from './geo'
import { CAMPUS_BUILDINGS } from './campus'

describe('Hall open lawn and banners',()=>{
  it('fits two equal rows on the measured lawn without occupying the entrance route',()=>{
    expect(HALL_FLAGS.filter(f=>f.side<0)).toHaveLength(5)
    expect(HALL_FLAGS.filter(f=>f.side>0)).toHaveLength(5)
    for(const flag of HALL_FLAGS){
      const point=hallToCampus(flag.at)
      expect(pointInPolygon(point,HALL_FLAG_LAWN)).toBe(true)
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(point,b.ring))).toBe(false)
      expect(flag.at[0]).toBeLessThan(3)
    }
    expect(isHallFlagGarden(hallToCampus([-5,35]))).toBe(true)
    expect(isHallFlagGarden(hallToCampus([9.6,35]))).toBe(false)
    expect(isHallFlagGarden(hallToCampus([0,5]))).toBe(false)
  })
})
