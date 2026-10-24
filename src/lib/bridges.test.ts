import { describe, expect, it } from 'vitest'
import { ELEVATED_WALKWAYS, BRIDGE_LEVEL, bridgeVertexHeight, segmentProjection } from './terrain'
import { bridgeSections, bridgeBoundaryRails, createBridgeDeckGeometry } from './bridges'
import { CAMPUS_BOUNDARY, CAMPUS_BRIDGE_ACCESS, CAMPUS_STREET_ACCESS } from './campus'
import { pointInPolygon } from './geo'

describe('continuous bridge deck and perimeter', () => {
  it('starts the bridge at the campus exit and keeps the side ramp outside the grounds', () => {
    expect(ELEVATED_WALKWAYS.every(way => way.bridge)).toBe(true)
    const ramp = ELEVATED_WALKWAYS.find(w => w.osmId === 'way/1032704764')!
    const a = ramp.line[0], b = ramp.line.at(-1)!
    for (let t = .1; t <= 1; t += .1) {
      expect(pointInPolygon([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], CAMPUS_BOUNDARY)).toBe(false)
    }
    for (const p of CAMPUS_STREET_ACCESS) expect(pointInPolygon(p, CAMPUS_BOUNDARY)).toBe(false)
    expect(pointInPolygon([-16, -155], CAMPUS_BOUNDARY)).toBe(false)
    expect(pointInPolygon([-3.2, -152.5], CAMPUS_BOUNDARY)).toBe(true)
  })
  it('leaves a clear entrance from the campus passage through the corner rail', () => {
    const rails = bridgeBoundaryRails(ELEVATED_WALKWAYS, [CAMPUS_BRIDGE_ACCESS])
    for (let i = 1; i < CAMPUS_BRIDGE_ACCESS.line.length; i++) for (let t = 0; t <= 1; t += .1) {
      const a = CAMPUS_BRIDGE_ACCESS.line[i - 1], b = CAMPUS_BRIDGE_ACCESS.line[i]
      const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      expect(rails.every(r => segmentProjection(p, r.a, r.b).distance > .5)).toBe(true)
    }
  })
  it('creates closed deck solids with shared corner edges, rather than detached segment boxes', () => {
    for (const way of ELEVATED_WALKWAYS) {
      const geometry = createBridgeDeckGeometry(way), p = geometry.getAttribute('position')
      const edges = new Map<string, number>()
      for (let i = 0; i < p.count; i += 3) {
        const keys = [0, 1, 2].map(j=>[p.getX(i+j), p.getY(i+j), p.getZ(i+j)].map(v=>v.toFixed(4)).join(','))
        for (let j = 0; j < 3; j++) { const key = [keys[j], keys[(j+1)%3]].sort().join('|'); edges.set(key, (edges.get(key) ?? 0) + 1) }
      }
      expect([...edges.values()].every(count=>count===2), way.osmId).toBe(true)
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true)
      expect(p.count).toBeLessThan(500)
      expect(bridgeSections(way)).toHaveLength(way.line.length)
      geometry.dispose()
    }
  })
  it('keeps ramp junctions level with the main bridge before descending', () => {
    for (const way of ELEVATED_WALKWAYS.filter(w => ['way/1032704764','way/1032704766'].includes(w.osmId))) {
      expect(way.line.length).toBeGreaterThan(2)
      expect(bridgeVertexHeight(way, 0)).toBe(BRIDGE_LEVEL)
      expect(bridgeVertexHeight(way, 1)).toBe(BRIDGE_LEVEL)
      expect(bridgeVertexHeight(way, way.line.length-1)).toBeCloseTo(0.55)
    }
  })
  it('leaves the ends and branch junctions open, with rails only on the outside perimeter', () => {
    const rails = bridgeBoundaryRails(ELEVATED_WALKWAYS, [CAMPUS_BRIDGE_ACCESS])
    for (const way of ELEVATED_WALKWAYS) for (const endpoint of [way.line[0], way.line.at(-1)!]) {
      expect(rails.every(({a,b})=>segmentProjection(endpoint,a,b).distance>0.4), `rail blocks ${endpoint}`).toBe(true)
    }
  })
  it('breaks each ramp rail at the flat landing, so it never slopes through the deck', () => {
    const rails=bridgeBoundaryRails(ELEVATED_WALKWAYS, [CAMPUS_BRIDGE_ACCESS])
    for(const way of ELEVATED_WALKWAYS.filter(w => ['way/1032704764','way/1032704766'].includes(w.osmId))) {
      const p=way.line[1],a=way.line[0],b=way.line.at(-1)!,length=Math.hypot(b[0]-a[0],b[1]-a[1])
      const stations=rails.flatMap(r=>[{p:r.a,h:r.ah},{p:r.b,h:r.bh}]).filter(({p:q})=>Math.abs(((q[0]-p[0])*(b[0]-a[0])+(q[1]-p[1])*(b[1]-a[1]))/length)<.01 && Math.hypot(q[0]-p[0],q[1]-p[1])<2)
      expect(stations.length,way.osmId).toBeGreaterThanOrEqual(2)
      for(const s of stations)expect(s.h).toBeCloseTo(BRIDGE_LEVEL)
    }
  })
})
