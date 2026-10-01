import { describe, expect, it } from 'vitest'
import { MAXWELL_ENTRANCE, maxwellToCampus, createArchBand } from './maxwell'
import { findCampusBuilding } from './campus'
import { pointInPolygon } from './geo'
import { endpointForBuilding } from './outdoor'

describe('Maxwell entrance on the courtyard facade', () => {
  it('faces out into the courtyard and anchors routes at the foot of the steps', () => {
    const footprint = findCampusBuilding('maxwell')!.ring
    expect(pointInPolygon(maxwellToCampus([0, -1]), footprint)).toBe(true)
    expect(pointInPolygon(maxwellToCampus([0, 2]), footprint)).toBe(false)
    expect(endpointForBuilding('maxwell')!.point).toEqual(maxwellToCampus([0, MAXWELL_ENTRANCE.stairFront]))
  })
  it('builds a hollow semicircular surround with a clear doorway', () => {
    const geo = createArchBand(2, 2.3, 0.4)
    const p = geo.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const radius = Math.hypot(p.getX(i), p.getY(i))
      expect(radius).toBeGreaterThan(1.99)
      expect(radius).toBeLessThan(2.31)
      expect(p.getY(i)).toBeGreaterThan(-0.001)
    }
    geo.computeBoundingBox()
    expect(geo.boundingBox!.max.x - geo.boundingBox!.min.x).toBeCloseTo(4.6)
    geo.dispose()
  })
})
