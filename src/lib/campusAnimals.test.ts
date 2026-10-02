import { describe, expect, it } from 'vitest'
import { ANIMAL_ROUTES, ANIMAL_CLEARANCE, advanceAnimalTime, sampleAnimalPosition } from './campusAnimals'
import { CAMPUS_AREAS, CAMPUS_BUILDINGS } from './campus'
import { pointInPolygon } from './geo'
import { hallToCampus } from './hall'
import { casitaToCampus } from './casita'
import { miguelToCampus, MIGUEL_WORLD_FORECOURT } from './miguel'
import { GALILEO_LAGOON } from './galileo'
import { PAGODA_POND } from './pagoda'
import { isAnimalTravelClear } from './animalObstacles'
import { terrainHeightAt } from './terrain'

// Independent footprints of the visible entrance walls, fences and pedestals.
const rectangle = (x: number, z: number, w: number, d: number, transform: (p: [number, number]) => [number, number]) =>
  ([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]] as [number, number][]).map(transform)
const entranceObstacles = [
  rectangle(-16.3, 11.6, 6.4, .24, miguelToCampus),
  rectangle(-16.3, 11.08, 2.8, .8, miguelToCampus),
  ...[[-24,-16.3],[-8.7,5.4],[14.5,23]].map(([a,b]) => rectangle((a+b)/2,15.1,b-a,.12,miguelToCampus)),
  ...[-22.5,-6.8,19.5].map(x => rectangle(x,14.2,2.8,.9,miguelToCampus)),
  ...[-8.65,8.65].map(x => rectangle(x,5.5,1.36,1.75,hallToCampus)),
  ...[-2.55,2.55].map(x => rectangle(x,1.55,2.6,.3,casitaToCampus)),
  ...[-3.75,-1.25,1.25,3.75].map(x => rectangle(x,1.55,.52,.52,casitaToCampus)),
]
const distanceToEdge = (p: [number, number], a: [number, number], b: [number, number]) => {
  const dx=b[0]-a[0], dy=b[1]-a[1], length=dx*dx+dy*dy
  const t=length ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) : 0
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
}
const hallLawn = CAMPUS_AREAS.find(a => a.osmId === 'way/1369166967')!.ring
const water = [...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => a.ring), PAGODA_POND, GALILEO_LAGOON.ring]

// Broad-phase bounds skip distant city buildings while still checking every outline.
const buildings = CAMPUS_BUILDINGS.map(b => ({ ring: b.ring,
  minX: Math.min(...b.ring.map(p => p[0])), maxX: Math.max(...b.ring.map(p => p[0])),
  minY: Math.min(...b.ring.map(p => p[1])), maxY: Math.max(...b.ring.map(p => p[1])),
}))
const insideBuilding = (p: [number, number]) => buildings.some(b => p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minY && p[1] <= b.maxY && pointInPolygon(p, b.ring))

describe('campus animal walking circuits', () => {
  it('leaves room for the whole animal, including head and tail during turns, beside modeled walls and fences', () => {
    const obstacles=[...CAMPUS_BUILDINGS.map(b=>b.ring),...water,hallLawn,...entranceObstacles].map(ring=>({
      ring,minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),
      minY:Math.min(...ring.map(p=>p[1])),maxY:Math.max(...ring.map(p=>p[1])),
    }))
    const failures: string[]=[]
    for (const path of Object.values(ANIMAL_ROUTES)) {
      // A circle enclosing the entire moving model remains safe at every yaw.
      const radius=path.id==='gaston' ? 1.25 : 1.6
      for (let d=0;d<path.length;d+=.1) {
        const {point}=sampleAnimalPosition(path.id,d/path.speed)
        const obstacle=obstacles.find(o=>point[0]>=o.minX-radius&&point[0]<=o.maxX+radius&&
          point[1]>=o.minY-radius&&point[1]<=o.maxY+radius&&
          (pointInPolygon(point,o.ring)||o.ring.some((a,i)=>distanceToEdge(point,a,o.ring[(i+1)%o.ring.length])<radius)))
        if(obstacle) {
          failures.push(`${path.id} has insufficient body clearance at ${point}: obstacle ${obstacles.indexOf(obstacle)}`)
          break
        }
      }
    }
    expect(failures).toEqual([])
  })

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
    expect(points.filter(p => Math.hypot(p[0] - casitaToCampus([0, 3.8])[0], p[1] - casitaToCampus([0, 3.8])[1]) < .01)).toHaveLength(4)
    expect(points.filter(p => Math.hypot(p[0] - hallToCampus([4.7, 10])[0], p[1] - hallToCampus([4.7, 10])[1]) < .01)).toHaveLength(2)
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

  it('checks entire segments, so a thin wall cannot be skipped between clear endpoints', () => {
    expect(isAnimalTravelClear(miguelToCampus([-18,9]),miguelToCampus([-18,14]),.1)).toBe(false)
    expect(isAnimalTravelClear(miguelToCampus([0,13]),miguelToCampus([0,17]),.1)).toBe(false)
    // Same movement fits through the actual opening in the fence.
    expect(isAnimalTravelClear(miguelToCampus([-12,13]),miguelToCampus([-12,17]),.1)).toBe(true)
    for(const path of Object.values(ANIMAL_ROUTES)) {
      for(let i=1;i<path.points.length;i++) {
        expect(isAnimalTravelClear(path.points[i-1],path.points[i],ANIMAL_CLEARANCE[path.id]),`${path.id} segment ${i}`).toBe(true)
      }
    }
  })

  it('keeps walking at every route corner and does not jump ahead after a long frame', () => {
    for(const path of Object.values(ANIMAL_ROUTES)) {
      let seconds=0
      for(const length of path.segmentLengths) {
        seconds+=length/path.speed
        for(const offset of [-.04,0,.04]) {
          expect(advanceAnimalTime(path.id,seconds+offset,.08)).toBeCloseTo(seconds+offset+.08,8)
        }
      }
      expect(advanceAnimalTime(path.id,0,10)).toBeCloseTo(.1,8)
      expect(advanceAnimalTime(path.id,0,NaN)).toBe(0)
      expect(advanceAnimalTime(path.id,0,-1)).toBe(0)
    }
  })

  it('stops before an added rail obstruction and cannot skip through it on later frames', () => {
    const original=ANIMAL_ROUTES.pancho
    // Reproduce a mistakenly edited route across the real forecourt fence.
    ANIMAL_ROUTES.pancho={...original,
      points: ([[0,12.9],[0,17],[0,12.9]] as [number,number][]).map(miguelToCampus),
      speed:1, length:8.2, segmentLengths:[4.1,4.1],
    }
    try {
      let seconds=0
      for(let frame=0;frame<100;frame++) seconds=advanceAnimalTime('pancho',seconds,.1)
      expect(seconds).toBeGreaterThan(0)
      expect(seconds).toBeLessThan(1)
      const stopped=sampleAnimalPosition('pancho',seconds).point
      expect(isAnimalTravelClear(stopped,stopped,1.6)).toBe(true)
      expect(advanceAnimalTime('pancho',seconds,20)).toBe(seconds)
      expect(sampleAnimalPosition('pancho',seconds).point).toEqual(stopped)
    } finally {
      ANIMAL_ROUTES.pancho=original
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
