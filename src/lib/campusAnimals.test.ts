import { describe, expect, it } from 'vitest'
import { ANIMAL_ROUTES, sampleAnimalPosition } from './campusAnimals'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { hallToCampus } from './hall'
import { casitaToCampus } from './casita'
import { MIGUEL_WORLD_FORECOURT } from './miguel'
import { GALILEO_LAGOON } from './galileo'
import { PAGODA_POND } from './pagoda'
import { terrainHeightAt } from './terrain'

const hallLawn = CAMPUS_AREAS.find(a => a.osmId === 'way/1369166967')!.ring
const water = [...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => a.ring), PAGODA_POND, GALILEO_LAGOON.ring]

// Broad-phase bounds skip distant city buildings while still checking every outline.
const buildings = CAMPUS_BUILDINGS.map(b => ({ ring: b.ring,
  minX: Math.min(...b.ring.map(p => p[0])), maxX: Math.max(...b.ring.map(p => p[0])),
  minY: Math.min(...b.ring.map(p => p[1])), maxY: Math.max(...b.ring.map(p => p[1])),
}))
const insideBuilding = (p: [number, number]) => buildings.some(b => p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minY && p[1] <= b.maxY && pointInPolygon(p, b.ring))

describe('campus animal walking circuits', () => {
  it('keeps every quarter-metre of travel clear of building interiors, ponds and the fenced Hall lawn', () => {
    const failures: string[] = []
    for (const path of Object.values(ANIMAL_ROUTES)) {
      for (let distance = 0; distance < path.length; distance += .25) {
        const { point } = sampleAnimalPosition(path.id, distance / path.speed)
        if (insideBuilding(point) || water.some(ring => pointInPolygon(point, ring))) {
          failures.push(`${path.id} crosses a building or pond at ${point}`)
        }
        // Half-metre clearance keeps the body/leg swing off walls and pond edges.
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const edge: [number, number] = [point[0] + Math.cos(angle) * .5, point[1] + Math.sin(angle) * .5]
          if (insideBuilding(edge) || water.some(r => pointInPolygon(edge, r))) {
            failures.push(`${path.id} needs body clearance at ${point}`)
          }
        }
        if (pointInPolygon(point, hallLawn)) failures.push(`${path.id} inside the fenced Hall lawn at ${point}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('visits the Casita and Hall twice before the occasional Pagoda garden lap', () => {
    const points = ANIMAL_ROUTES.gaston.points
    expect(points.filter(p => Math.hypot(p[0] - casitaToCampus([0, 3])[0], p[1] - casitaToCampus([0, 3])[1]) < .01)).toHaveLength(4)
    expect(points.filter(p => Math.hypot(p[0] - hallToCampus([9.6, 6.5])[0], p[1] - hallToCampus([9.6, 6.5])[1]) < .01)).toHaveLength(2)
    expect(points.some(([x, y]) => x > 30 && y < -40)).toBe(true)
  })

  it('confines both greyhounds to the main-entry forecourt', () => {
    for (const id of ['pancho', 'pancha'] as const) {
      const path = ANIMAL_ROUTES[id]
      for (let d = 0; d < path.length; d += .25) {
        expect(pointInPolygon(sampleAnimalPosition(id, d / path.speed).point, MIGUEL_WORLD_FORECOURT)).toBe(true)
      }
    }
  })

  it('loops seamlessly, wraps negative time and follows the terrain at its actual position', () => {
    for (const path of Object.values(ANIMAL_ROUTES)) {
      expect(path.points.at(-1)).toEqual(path.points[0])
      expect(path.segmentLengths.every(n => n > .01)).toBe(true)
      const period = path.length / path.speed
      const first = sampleAnimalPosition(path.id, 0), loop = sampleAnimalPosition(path.id, period)
      expect(loop.point[0]).toBeCloseTo(first.point[0], 8)
      expect(loop.point[1]).toBeCloseTo(first.point[1], 8)
      const sample = sampleAnimalPosition(path.id, 12.5)
      expect(sample.height).toBe(terrainHeightAt(sample.point))
      expect(sampleAnimalPosition(path.id, -2).point[0]).toBeCloseTo(sampleAnimalPosition(path.id, period - 2).point[0], 8)
      const next = sampleAnimalPosition(path.id, 12.51)
      expect(Math.hypot(next.point[0] - sample.point[0], next.point[1] - sample.point[1])).toBeCloseTo(path.speed * .01, 8)
    }
  })
})
