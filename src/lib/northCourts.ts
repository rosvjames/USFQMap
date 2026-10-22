import { DA_VINCI_FRONT, daVinciFrontToCampus } from './daVinciPlaza'
import { epicuroToCampus } from './epicuro'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { HALL_EINSTEIN_PATH } from './hallPassage'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
import type { Vec2 } from '../types'

// OSM maps no walkway north of Einstein. The student confirms two ways in: through the Hall,
// out of its back patio to the Da Vinci plaza, and the open passage between Einstein and Da Vinci
// that leads to the Maxwell courtyard. Points sit in the open space between footprints
// (campus metres, placed by eye); northCourts.test.ts keeps every leg off other buildings.

export const DA_VINCI_DOOR = daVinciFrontToCampus([DA_VINCI_FRONT.portico, DA_VINCI_FRONT.stairFront])
/** Forecourt below Epicuro's photographed east front; its street-level door is not confirmed. */
export const EPICURO_DOOR = epicuroToCampus([14.6, 3])
export const MAXWELL_DOOR = maxwellToCampus([0, MAXWELL_ENTRANCE.stairFront])

/** Open ground between the Hall's back patio, Einstein's north tip and the Da Vinci plaza. */
const JUNCTION: Vec2 = [14, 88]

/** Hall forecourt → main door → across the lobby → back patio → junction. */
export const HALL_CROSSING: Vec2[] = [
  HALL_EINSTEIN_PATH[0],
  hallToCampus([0, HALL_ENTRANCE.stairFront]),
  hallToCampus([0, 0]),
  [-10, 62], [-8.5, 80],
  [-3, 81], [8, 83.5],
  JUNCTION,
]
/** Index of the first leg inside the Hall (door → lobby), used to describe the crossing. */
export const HALL_CROSSING_INDOOR = 2

export const DA_VINCI_ACCESS: Vec2[] = [JUNCTION, DA_VINCI_DOOR]
export const EPICURO_ACCESS: Vec2[] = [JUNCTION, [11, 110], [9, 124], EPICURO_DOOR]
/** Through the gap between Einstein and Da Vinci, then along the courtyard's edge, clear of its gardens. */
export const MAXWELL_ACCESS: Vec2[] = [JUNCTION, [24, 79], [36, 74], [44, 70.4], [52, 66], maxwellToCampus([-9, 6.2]), MAXWELL_DOOR]

export const NORTH_COURT_PATHS = [HALL_CROSSING, DA_VINCI_ACCESS, EPICURO_ACCESS, MAXWELL_ACCESS]
