import { CAMPUS_ELEVATION } from './elevation'
import { describe, expect, it } from 'vitest'
import { CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { DA_VINCI_PASSAGE, DA_VINCI_PAVING, daVinciToCampus, daVinciIvy, daVinciWindowAt } from './daVinci'
import { terrainHeightAt } from './terrain'

describe('Da Vinci photograph alignment', () => {
  it('fits the terrace outside the buildings and preserves its height along routes and stairs', () => {
    for (const point of DA_VINCI_PAVING) {
      const world = daVinciToCampus(point)
      expect(CAMPUS_BUILDINGS.some(b=>pointInPolygon(world,b.ring)),String(point)).toBe(false)
      expect(terrainHeightAt(world)).toBeCloseTo((DA_VINCI_PASSAGE.height) + CAMPUS_ELEVATION)
    }
    expect(terrainHeightAt(daVinciToCampus([-.9,4]))).toBeCloseTo((.55+.5/3) + CAMPUS_ELEVATION)
    expect(terrainHeightAt(daVinciToCampus([DA_VINCI_PASSAGE.length+.9,4]))).toBeCloseTo((.55) + CAMPUS_ELEVATION)
  })
  it('keeps ivy off the window openings with a bounded repeatable instance count', () => {
    const leaves = daVinciIvy()
    expect(leaves).toEqual(daVinciIvy())
    expect(leaves.length).toBeGreaterThan(1000)
    expect(leaves.length).toBeLessThan(3500)
    for (const leaf of leaves) expect(daVinciWindowAt(leaf.x,leaf.y)).toBe(false)
  })
})
