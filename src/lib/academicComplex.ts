import { ACADEMIC_COMPLEX_FLOORS } from '../data/academicComplexWalls'
import type { Vec2 } from '../types'

// Galileo, Einstein, Darwin and Newton share one set of evacuation plans ("Mapa de recursos y
// evacuación", Departamento de Operaciones). scripts/trazar-planos-evacuacion.py traces their walls
// from photos of the three sheets; positions follow the satellite georeference (~1 m), and walls
// drawn as single lines, curved or diagonal (the arched stair, the courtyard curve) are not traced.
export const ACADEMIC_COMPLEX = {
  id: 'complejo-academico',
  buildings: ['galileo', 'einstein', 'darwin', 'newton'],
  /** Newton's wing towards Casa Blanca, mapped in OSM as part of Casa Blanca. */
  extraFootprints: ['way/395849376'],
  floors: Object.keys(ACADEMIC_COMPLEX_FLOORS).map(Number),
  /** Floor 1 level, matching the landing of Newton's lagoon portal. */
  ground: 1.15,
  storey: 3.5,
  /** Walls are cut below the ceiling so the rooms read from above. */
  wall: 2.4,
}

export function complexFloorElevation(floor: number): number {
  return ACADEMIC_COMPLEX.ground + (floor - 1) * ACADEMIC_COMPLEX.storey
}

export function isAcademicComplexBuilding(buildingId?: string): boolean {
  return ACADEMIC_COMPLEX.buildings.includes(buildingId ?? '')
}

const plates = Object.values(ACADEMIC_COMPLEX_FLOORS).flatMap((floor) => floor.slabs.flat())
export const ACADEMIC_COMPLEX_CENTER: Vec2 = [
  plates.reduce((sum, p) => sum + p[0], 0) / plates.length,
  plates.reduce((sum, p) => sum + p[1], 0) / plates.length,
]
