import { findCampusBuilding } from './campus'
import { COLISEO, coliseoToCampus } from './coliseo'
import { closestPointOnRing, toLocal } from './geo'
import { HAYEK_ENTRANCE, hayekToCampus } from './hayek'
import { CAMPUS_GATE_CUTOUT } from './miguel'
import { NEWTON_DOOR_APPROACH } from './newton'
import { HALL_CROSSING, MAXWELL_DOOR } from './northCourts'
import type { Vec2 } from '../types'

// Doors, gates and walks through buildings that the student pinned on Google Maps or
// described on 24 Oct 2026. A phone pin is good to a few metres, not a survey.

const pin = (lat: number, lon: number): Vec2 => toLocal([lon, lat])
/** Degrees, minutes and seconds south and west, as Google Maps shares them. */
const dms = ([d, m, s]: number[], [dl, ml, sl]: number[]) => pin(-(d + m / 60 + s / 3600), -(dl + ml / 60 + sl / 3600))
const ring = (id: string) => findCampusBuilding(id)!.ring

/** The library's only door opens off the Hall lobby (plus code RH37+HMF). */
export const CICERON_DOOR = pin(-0.1960625, -78.435828)
/** Pinned as a Newton entrance; it is Casa Blanca's door onto the yard it shares with Maxwell, the theatre and Casa Tomate. */
export const CASA_BLANCA_YARD_DOOR = dms([0, 11, 47.8], [78, 26, 6.6])
/** Also pinned as a Newton entrance; it falls 8 m inside Newton, so it only serves as a point of the walk through it. */
const NEWTON_SOUTH = dms([0, 11, 48.6], [78, 26, 7.8])
export const TEATRO_DOOR = dms([0, 11, 48.0], [78, 26, 6.5])
export const MAXWELL_YARD_DOOR = dms([0, 11, 47.5], [78, 26, 6.2])
/** Open ground in the yard, placed by eye so no leg clips Maxwell's corner. */
const YARD: Vec2 = [70, 22]
/** People usually reach Casa Tomate through Maxwell: its door faces Maxwell's yard door. */
export const CASA_TOMATE_DOOR = closestPointOnRing(MAXWELL_YARD_DOOR, ring('casa-tomate'))
/** The doors the app already used for the two clinics, confirmed by the student. Both are reached through Maxwell. */
export const ODONTOLOGIA_DOOR: Vec2 = [104.4, 54.6]
export const CASA_CORONA_DOOR: Vec2 = [124.1, 49.7]
/** First floor of Hayek. The pin lies 0.8 m off Hayek's outline, against the mall, so it is moved onto it. */
export const DRAGON_SHOP_DOOR = closestPointOnRing(pin(-0.19914, -78.436321), ring('hayek'))
const HAYEK_DOOR = hayekToCampus(HAYEK_ENTRANCE.door)
/** Inside Hayek's west wing: a straight walk from the door would clip the mall next door. */
const HAYEK_WEST_WING: Vec2 = [-60.5, -248.5]
/** Walk to the Coliseo door, then turn towards the Obelisk. */
export const COLISEO_DOOR = coliseoToCampus([COLISEO.doorX, 1.6])
export const OBELISCO_DOOR = closestPointOnRing(COLISEO_DOOR, ring('obelisco'))

/** Second way out of campus, onto Avenida Pampite. */
export const PAMPITE_GATE = pin(-0.195631, -78.435432)
const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
/** Both ends of the passage through the main gate's guardhouse. */
export const MAIN_GATE = {
  inside: mid(CAMPUS_GATE_CUTOUT[0], CAMPUS_GATE_CUTOUT[3]),
  outside: mid(CAMPUS_GATE_CUTOUT[1], CAMPUS_GATE_CUTOUT[2]),
}

/** The map pin stands here instead of on the footprint: the catalogued Dragon Shop outline sits in Hayek's courtyard. */
export const PIN_POSITIONS: Record<string, Vec2> = { 'dragon-shop': DRAGON_SHOP_DOOR }

/** Where a route to or from each building starts and ends. Others use the outline point closest to a walkway. */
export const CONFIRMED_DOORS: Record<string, Vec2> = {
  ciceron: CICERON_DOOR,
  'teatro-casa-blanca': TEATRO_DOOR,
  'casa-tomate': CASA_TOMATE_DOOR,
  odontologia: ODONTOLOGIA_DOOR,
  'casa-corona': CASA_CORONA_DOOR,
  'dragon-shop': DRAGON_SHOP_DOOR,
  obelisco: OBELISCO_DOOR,
}

/** More ways in: routes start or end at whichever door is closest. */
export const SIDE_DOORS: Record<string, Vec2[]> = {
  maxwell: [MAXWELL_YARD_DOOR],
  'casa-blanca': [CASA_BLANCA_YARD_DOOR],
  // The lobby's back door onto the patio, the way to the courts behind the Hall.
  'hall-principal': [HALL_CROSSING[5]],
}

/**
 * Walks OSM does not map: through buildings, across the east yard and out of the gates.
 * Each starts on the walkway network; legs inside a building are told as "Cruza …".
 */
export const CONFIRMED_PATHS: Vec2[][] = [
  [HALL_CROSSING[4], CICERON_DOOR],
  [MAXWELL_DOOR, MAXWELL_YARD_DOOR, CASA_TOMATE_DOOR],
  [NEWTON_DOOR_APPROACH, NEWTON_SOUTH, CASA_BLANCA_YARD_DOOR, TEATRO_DOOR, YARD, MAXWELL_YARD_DOOR],
  [MAXWELL_DOOR, closestPointOnRing(ODONTOLOGIA_DOOR, ring('maxwell')), ODONTOLOGIA_DOOR],
  [MAXWELL_DOOR, closestPointOnRing(CASA_CORONA_DOOR, ring('maxwell')), CASA_CORONA_DOOR],
  [HAYEK_DOOR, HAYEK_WEST_WING, DRAGON_SHOP_DOOR],
  [COLISEO_DOOR, OBELISCO_DOOR],
]

/** Out through the main gate and the Pampite gate, from the inside to the street. */
export const GATE_PATHS: Vec2[][] = [
  [MAIN_GATE.inside, MAIN_GATE.outside],
  [HALL_CROSSING.at(-1)!, PAMPITE_GATE],
]

/** Reached from the street: the vet clinic's only door is on Gral. Francisco Robles. */
export const OFF_CAMPUS = new Set(['veterinaria'])

/** A last line of directions before arriving. */
export const ARRIVAL_HINTS: Record<string, string> = {
  obelisco: 'A la altura de la entrada del Coliseo, gira hacia el Obelisco',
  'dragon-shop': 'Sube al primer piso de Hayek',
  veterinaria: 'Su entrada está en la calle Gral. Francisco Robles',
}
