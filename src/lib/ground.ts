import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_WALKWAYS } from './campus'
import polygonClipping from 'polygon-clipping'
import { shapesFromPolygons, walkwayOutlines, createTerrainShapes } from './architecture'
import { centroid, pointInPolygon } from './geo'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { SATELLITE_GARDENS, SATELLITE_PLAZAS, VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import { TERRAIN_CUTOUTS, SPORT_ZONES, SPORT_ACCESS_AREAS, campusTerrainHeightAt } from './terrain'
import { CAMPUS_STREET_CUTOUTS } from './campus'
import { CAMPUS_ELEVATION } from './elevation'
import { COURTYARD_WORLD_OUTLINE } from './maxwellCourtyard'
import { CAFE_WORLD_OUTLINE } from './maxwellCafe'
import { DA_VINCI_WORLD_PAVING } from './daVinci'
import { DA_VINCI_WORLD_PLAZA } from './daVinciPlaza'
import { MIGUEL_WORLD_FORECOURT } from './miguel'
import { MIGUEL_GARDEN_FORECOURT } from './miguelGarden'
import { GALILEO_LAWNS, LAGOON_GARDEN } from './galileo'
import { NEWTON_LAWNS } from './newton'
import { EPICURO_FORECOURT } from './epicuro'
import { HALL_MINI_WORLD_OUTLINE } from './hallMiniPlaza'
import { HALL_PASSAGE_OUTLINE } from './hallPassage'
import { COLISEO_ROAD_OUTLINES, COLISEO_PLATFORM } from './coliseo'
import type { Vec2 } from '../types'

// These floors own their geometry and elevations; the general ground stops at their edges.
export const LANDMARK_GROUND: Vec2[][] = [
  COURTYARD_WORLD_OUTLINE, CAFE_WORLD_OUTLINE, DA_VINCI_WORLD_PAVING, DA_VINCI_WORLD_PLAZA,
  MIGUEL_WORLD_FORECOURT, MIGUEL_GARDEN_FORECOURT, ...GALILEO_LAWNS, ...NEWTON_LAWNS,
  EPICURO_FORECOURT, LAGOON_GARDEN, HALL_MINI_WORLD_OUTLINE, HALL_PASSAGE_OUTLINE, COLISEO_PLATFORM,
  ...COLISEO_ROAD_OUTLINES, ...SPORT_ACCESS_AREAS,
]
const landscapedGround = [...GALILEO_LAWNS, ...NEWTON_LAWNS, LAGOON_GARDEN]

export function createCampusGroundShapes() {
  const obstacles = [
    ...CAMPUS_BUILDINGS.map(b => b.ring), ...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => a.ring),
    ...TERRAIN_CUTOUTS, ...SPORT_ZONES.map(zone => zone.area.ring), ...LANDMARK_GROUND,
  ]
  const gardens = CAMPUS_AREAS.filter(a => a.kind === 'green' && a.osmId !== 'way/395847793' && pointInPolygon(centroid(a.ring), CAMPUS_BOUNDARY)).map(a => a.ring)
  const plazas = [...SATELLITE_PLAZAS.filter(r => pointInPolygon(centroid(r), CAMPUS_BOUNDARY)), ...CAMPUS_AREAS.filter(a => a.osmId === 'way/395847793').map(a => a.ring)]
  const paths = CAMPUS_WALKWAYS.filter(w => !w.bridge && w.osmId !== 'way/395853824' && w.line.some(p => pointInPolygon(p, CAMPUS_BOUNDARY)))
    .flatMap(w => walkwayOutlines(w.line, w.mappedWidth ?? VISUAL_PATH_WIDTHS[w.osmId] ?? w.width))
  // Millimetre precision avoids almost-coincident GIS edges in successive boolean operations.
  const polygon = (ring: Vec2[]): polygonClipping.Polygon => [ring.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])]
  const gardenPolygons = [...gardens, ...SATELLITE_GARDENS].map(polygon)
  const plaza = polygonClipping.difference(polygonClipping.union(polygon(plazas[0]), ...plazas.slice(1).map(polygon)), ...gardenPolygons)
  const paving = polygonClipping.difference(polygonClipping.intersection(polygonClipping.union(plaza, ...paths.map(polygon)), polygon(CAMPUS_BOUNDARY)), ...obstacles.map(polygon))
  // The modelled lawns have path openings; fill those at their own sloping elevations.
  const landscapePaths = CAMPUS_WALKWAYS.filter(w => !w.bridge).flatMap(w => walkwayOutlines(w.line, (w.mappedWidth ?? VISUAL_PATH_WIDTHS[w.osmId] ?? w.width) + .24))
  const landscapePaving = polygonClipping.difference(
    polygonClipping.intersection(polygonClipping.union(polygon(landscapePaths[0]), ...landscapePaths.slice(1).map(polygon)), polygonClipping.union(polygon(landscapedGround[0]), ...landscapedGround.slice(1).map(polygon))),
    ...CAMPUS_BUILDINGS.map(b => polygon(b.ring)), ...CAMPUS_AREAS.filter(a => a.kind === 'water').map(a => polygon(a.ring)),
  )
  const grass = polygonClipping.difference(polygon(CAMPUS_BOUNDARY), plaza, ...paths.map(polygon), ...obstacles.map(polygon))
  return { paving: shapesFromPolygons(paving), grass: shapesFromPolygons(grass), landscapePaving: shapesFromPolygons(landscapePaving) }
}

/** Close the elevated site's perimeter, including the separate street-ramp recess. */
export function createCampusRetainingGeometry() {
  const vertices: number[] = [], uv: number[] = []
  for (const shape of createTerrainShapes(CAMPUS_BOUNDARY, CAMPUS_STREET_CUTOUTS)) {
    const { shape: outer, holes } = shape.extractPoints(1)
    for (const ring of [outer, ...holes]) for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], length = a.distanceTo(b), count = Math.max(1, Math.ceil(length / 1.5))
      for (let j = 0; j < count; j++) {
        const p: Vec2 = [a.x + (b.x - a.x) * j / count, a.y + (b.y - a.y) * j / count]
        const q: Vec2 = [a.x + (b.x - a.x) * (j + 1) / count, a.y + (b.y - a.y) * (j + 1) / count]
        const ph = campusTerrainHeightAt(p) + CAMPUS_ELEVATION, qh = campusTerrainHeightAt(q) + CAMPUS_ELEVATION
        for (const v of [[p[0], -.1, -p[1]], [q[0], -.1, -q[1]], [q[0], qh, -q[1]], [p[0], -.1, -p[1]], [q[0], qh, -q[1]], [p[0], ph, -p[1]]]) {
          vertices.push(...v); uv.push((v[0] - v[2]) / 2.4, v[1] / 2.4)
        }
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}
