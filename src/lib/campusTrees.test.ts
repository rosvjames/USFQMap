import { describe, expect, it } from 'vitest'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS, CAMPUS_TREES, CAMPUS_WALKWAYS } from './campus'
import { PATH_CLEARANCE, planCampusTrees } from './campusTrees'
import { pointInPolygon } from './geo'
import { isDaVinciPlaza } from './daVinciPlaza'
import { isMaxwellCourtyard } from './maxwellCourtyard'
import { isHallMiniPlaza } from './hallMiniPlaza'
import { segmentProjection } from './terrain'
import { VISUAL_PATH_WIDTHS } from '../data/siteAppearance'

describe('campus tree plan', () => {
  const trees = planCampusTrees(), planted = trees.filter((tree) => !tree.mapped)

  it('keeps every mapped tree that clears the landmark courts, and adds the generated planting after them', () => {
    const mapped = trees.filter((tree) => tree.mapped)
    expect(mapped.length).toBeGreaterThan(0)
    expect(mapped.length).toBeLessThanOrEqual(CAMPUS_TREES.length)
    expect(trees.slice(0, mapped.length).every((tree) => tree.mapped)).toBe(true)
    for (const tree of mapped) expect(CAMPUS_TREES.some((point) => point[0] === tree.point[0] && point[1] === tree.point[1])).toBe(true)
    expect(planted.length).toBeGreaterThanOrEqual(10)
  })

  it('never plants on a building, on water, on a footpath or inside the landmark courtyards', () => {
    for (const { point } of planted) {
      expect(CAMPUS_BUILDINGS.some((building) => pointInPolygon(point, building.ring))).toBe(false)
      expect(CAMPUS_AREAS.some((area) => area.kind === 'water' && pointInPolygon(point, area.ring))).toBe(false)
      expect(isDaVinciPlaza(point) || isMaxwellCourtyard(point) || isHallMiniPlaza(point)).toBe(false)
      for (const way of CAMPUS_WALKWAYS) for (let i = 1; i < way.line.length; i++) {
        const half = (way.mappedWidth ?? VISUAL_PATH_WIDTHS[way.osmId] ?? way.width) / 2
        expect(segmentProjection(point, way.line[i - 1], way.line[i]).distance).toBeGreaterThanOrEqual(half + PATH_CLEARANCE)
      }
    }
  })

  it('keeps one palm in four, as before, and a single warm autumn tree in nine', () => {
    planted.forEach((tree, i) => {
      expect(tree.palm).toBe(i % 4 === 0)
      if (!tree.palm && i % 9 === 1) expect(tree.tone).toBe('autumn')
      expect(tree.size).toBeGreaterThanOrEqual(.75)
      expect(tree.size).toBeLessThanOrEqual(1.25)
    })
  })
})
