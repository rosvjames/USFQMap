import { CAMPUS_AREAS, CAMPUS_BOUNDARY, CAMPUS_BUILDINGS, CAMPUS_WALKWAYS, CAMPUS_TREES } from './campus'
import { isMaxwellApproach } from './maxwell'
import { isMaxwellCourtyard } from './maxwellCourtyard'
import { miguelEntranceHeightAt } from './miguel'
import { isDaVinciPassage } from './daVinci'
import { isDaVinciPlaza } from './daVinciPlaza'
import { isMaxwellCafe } from './maxwellCafe'
import { isGalileoLandscape } from './galileo'
import { isMiguelGardenForecourt } from './miguelGarden'
import { isEpicuroForecourt } from './epicuro'
import { campusToPagoda, isPagodaStairApproach } from './pagoda'
import { isHallFlagGarden } from './hallFlags'
import { isHallMiniPlaza } from './hallMiniPlaza'
import { isColiseoLane, isColiseoRetainingEdge, COLISEO_GARDEN_STAIRS } from './coliseo'
import { pointInPolygon } from './geo'
import { segmentProjection } from './terrain'
import { SATELLITE_GARDENS, VISUAL_PATH_WIDTHS } from '../data/siteAppearance'
import type { Vec2 } from '../types'

export type PlannedTree = { point: Vec2; size: number; palm: boolean; tone: 'autumn' | number; mapped: boolean }

/** Metres either side of a walkway's edge that generated planting keeps clear. */
export const PATH_CLEARANCE = 1.8

/**
 * The tree plan for the whole campus: the mapped trees that clear every landmark court and entrance, plus the planting
 * grid inside lawns and the wooded lagoon edge. Nothing is placed on a building, a footpath, water or a landmark floor.
 */
export function planCampusTrees(): PlannedTree[] {
  const trees: PlannedTree[] = CAMPUS_TREES.filter((point) => !CAMPUS_BUILDINGS.some(b => b.info?.id === 'banos-deportes' && pointInPolygon(point,b.ring)) && !isColiseoLane(point, 1) && !isColiseoRetainingEdge(point) && !pointInPolygon(point, COLISEO_GARDEN_STAIRS) && !isMiguelGardenForecourt(point) && !isEpicuroForecourt(point) && !isHallMiniPlaza(point) && !isHallFlagGarden(point) && !isPagodaStairApproach(campusToPagoda(point),3) && !isGalileoLandscape(point) && !isMaxwellCourtyard(point) && !isMaxwellCafe(point) && !isDaVinciPassage(point) && !isDaVinciPlaza(point) && miguelEntranceHeightAt(point) === undefined).map((point) => ({ point, size: 1.1, palm: false, tone: 0, mapped: true }))
  let index = 0
  const gardens = [
    ...CAMPUS_AREAS.filter((a) => a.kind === 'green' && a.osmId !== 'way/395847793').map((area) => ({ ring: area.ring, wooded: false })),
    ...SATELLITE_GARDENS.map((ring, i) => ({ ring, wooded: i === 1 })),
  ]
  for (const { ring, wooded } of gardens) {
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1])
    for (let x = Math.min(...xs) + 3; x < Math.max(...xs); x += 9) {
      for (let y = Math.min(...ys) + 3; y < Math.max(...ys); y += 9) {
        const point: Vec2 = [x + Math.sin(y * 0.7) * 2.3, y + Math.cos(x * 0.6) * 2.3]
        if (isColiseoLane(point, 1) || isColiseoRetainingEdge(point) || pointInPolygon(point, COLISEO_GARDEN_STAIRS) || isMiguelGardenForecourt(point) || isEpicuroForecourt(point) || isHallMiniPlaza(point) || isHallFlagGarden(point) || isPagodaStairApproach(campusToPagoda(point),3) || isGalileoLandscape(point) || !pointInPolygon(point, ring) || !pointInPolygon(point, CAMPUS_BOUNDARY)) continue
        if (CAMPUS_BUILDINGS.some((b) => pointInPolygon(point, b.ring)) || isMaxwellApproach(point) || isMaxwellCourtyard(point) || isMaxwellCafe(point) || isDaVinciPassage(point) || isDaVinciPlaza(point) || miguelEntranceHeightAt(point) !== undefined) continue
        if (CAMPUS_AREAS.some((a) => a.kind === 'water' && pointInPolygon(point, a.ring))) continue
        if (!wooded && Math.min(...ring.map((a, i) => segmentProjection(point, a, ring[(i + 1) % ring.length]).distance)) > 4) continue
        const nearPath = CAMPUS_WALKWAYS.some((way) => way.line.some((a, i) => i > 0 &&
          segmentProjection(point, way.line[i - 1], a).distance < (way.mappedWidth ?? VISUAL_PATH_WIDTHS[way.osmId] ?? way.width) / 2 + PATH_CLEARANCE,
        ))
        if (!nearPath) {
          trees.push({ point, size: 0.75 + (Math.sin(index * 17) + 1) * 0.25, palm: index % 4 === 0, tone: index % 9 === 1 ? 'autumn' : index % 4, mapped: false })
          index++
        }
      }
    }
  }
  return trees
}
