import type { Vec2 } from '../types'

// Visual interpretation of Apple Maps satellite imagery, inspected 2026-10-01.
// OSM footprints remain the geographic anchor. These are not surveyed roof or garden plans.
export type RoofFinish = 'terracotta' | 'dark' | 'green' | 'teal' | 'concrete'
export interface RoofAppearance { finish: RoofFinish; rise: number }
export const ROOF_APPEARANCE: Record<string, RoofAppearance> = {
  'hall-principal': { finish: 'terracotta', rise: 0.6 },
  ciceron: { finish: 'terracotta', rise: 2.4 },
  epicuro: { finish: 'concrete', rise: .15 },
  'eugenio-espejo': { finish: 'dark', rise: 1.5 },
  galileo: { finish: 'concrete', rise: .2 },
  einstein: { finish: 'dark', rise: 1.6 },
  newton: { finish: 'concrete', rise: .15 },
  'da-vinci': { finish: 'dark', rise: 1.8 },
  darwin: { finish: 'green', rise: 1.5 },
  maxwell: { finish: 'green', rise: 1.5 },
  'casa-blanca': { finish: 'teal', rise: 1.4 },
  'teatro-casa-blanca': { finish: 'teal', rise: 1.4 },
  'miguel-de-santiago': { finish: 'teal', rise: 1.4 },
  'guardiania-norte': { finish: 'green', rise: .45 },
  aristoteles: { finish: 'teal', rise: 2 },
  socrates: { finish: 'teal', rise: 1.3 },
  'lao-zi': { finish: 'teal', rise: 1.3 },
  mozart: { finish: 'dark', rise: 0.7 },
  coliseo: { finish: 'green', rise: 3.5 },
  hayek: { finish: 'concrete', rise: 0 },
  'dragon-shop': { finish: 'concrete', rise: 0 },
}

// Relative to the building's footprint center; x east, y north in metres.
// The large translucent squares visible on the academic roofs are skylights, not open courtyards.
export interface Skylight { offset: Vec2; width: number; depth: number; rise: number; angle: number }
const ACADEMIC_ANGLE = -0.4
export const ROOF_SKYLIGHTS: Record<string, Skylight[]> = {
  'da-vinci': [{ offset: [0, 0], width: 15, depth: 15, rise: 2.4, angle: ACADEMIC_ANGLE }],
  einstein: [{ offset: [0, -3], width: 9, depth: 9, rise: 2.1, angle: ACADEMIC_ANGLE }, { offset: [-2, 12], width: 6, depth: 6, rise: 1.2, angle: ACADEMIC_ANGLE }],
  galileo: [{ offset: [0, 0], width: 10, depth: 20, rise: 1.3, angle: ACADEMIC_ANGLE }],
  newton: [{ offset: [0, -3], width: 8, depth: 23, rise: 1.2, angle: ACADEMIC_ANGLE }, { offset: [6, 13], width: 5, depth: 5, rise: 0.8, angle: ACADEMIC_ANGLE }],
}

// Broad paved spaces visible from above. They are clipped around the OSM building/water
// footprints and gardens, and do not add unverified edges to the navigation graph.
export const SATELLITE_PLAZAS: Vec2[][] = [
  [[-112, -33], [-39, -35], [7, -12], [-23, 5], [-18, 32], [-36, 58], [-68, 59], [-78, 49], [-101, 10]],
  [[-39, 56], [-20, 31], [38, 43], [84, 78], [127, 79], [134, 53], [106, 16], [60, 8], [30, 20]],
  [[-31, -8], [4, -6], [33, -7], [49, -14], [52, -38], [37, -51], [6, -53], [-18, -49], [-32, -31]],
  [[-70, -260], [-64, -253], [-43, -250], [-28, -242], [-11, -273], [-24, -289], [-47, -277]],
]

export const SATELLITE_GARDENS: Vec2[][] = [
  // Lawn between the Hall and Da Vinci, within the mapped Plaza Grande.
  [[9, 126], [39, 115], [27, 87], [10, 91]],
  // The wooded edge south of the lagoon, beside the Pagoda.
  [[-2, -38], [9, -36], [37, -36], [47, -28], [50, -43], [42, -60], [3, -63], [-4, -52]],
]

// Width interpretation only; geometry/connectivity and any explicit OSM width are retained.
export const VISUAL_PATH_WIDTHS: Record<string, number> = {
  'way/395853819': 4,
  'way/395853822': 4.2,
  'way/395853824': 3.4,
  'way/1036865904': 3.2,
  'way/1431922073': 3,
  'way/1431922074': 3,
}
