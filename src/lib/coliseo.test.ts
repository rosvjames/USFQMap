import { describe, expect, it } from 'vitest'
import { COLISEO_ANNEX_APRON, COLISEO_LOWER_FORECOURT, COLISEO_ROAD_OUTLINES, coliseoToCampus } from './coliseo'
import { pointInPolygon } from './geo'

describe('Coliseo lane and forecourt', () => {
  it('has continuous pavement between the yellow curb and the retaining wall', () => {
    const floors = [...COLISEO_ROAD_OUTLINES, COLISEO_LOWER_FORECOURT, COLISEO_ANNEX_APRON]
    // The lane edge is angled; a straight forecourt edge used to leave two narrow grass wedges.
    const uncovered: number[][] = []
    for (let x = -23; x <= 13; x += .5) for (let z = 2.6; z < 7.6; z += .1) {
      if (!floors.some(ring => pointInPolygon(coliseoToCampus([x, z]), ring))) uncovered.push([x, z])
    }
    expect(uncovered).toEqual([])
  })
})
