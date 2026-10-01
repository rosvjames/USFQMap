import { describe, expect, it } from 'vitest'
import { createPagodaRoof, pagodaBridgeHeight } from './pagoda'

describe('photo-referenced Pagoda geometry', () => {
  it('has a single broad roof with raised eaves and a low central ridge', () => {
    const roof = createPagodaRoof()
    const p = roof.getAttribute('position'), n = roof.getAttribute('normal')
    roof.computeBoundingBox()
    const box = roof.boundingBox!
    expect(box.max.x - box.min.x).toBeGreaterThan(20)
    expect(box.max.z - box.min.z).toBeGreaterThan(13)
    expect(box.max.y).toBeLessThan(7)
    expect(box.min.y).toBeGreaterThan(4)
    for (let i = 0; i < p.count; i++) {
      expect(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))).toBe(true)
      expect(n.getY(i)).toBeGreaterThan(0)
    }
    roof.dispose()
  })
  it('arches the footbridge while meeting the veranda and stair landing at both ends', () => {
    expect(pagodaBridgeHeight(0)).toBeCloseTo(1.4)
    expect(pagodaBridgeHeight(1)).toBeCloseTo(1.4)
    expect(pagodaBridgeHeight(0.5)).toBeGreaterThan(1.9)
    expect(pagodaBridgeHeight(0.25)).toBeCloseTo(pagodaBridgeHeight(0.75))
  })
})
