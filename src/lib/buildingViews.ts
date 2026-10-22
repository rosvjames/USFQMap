import type { MapFocus } from '../components/MapCamera'
import type { CampusAnimalId } from './campusAnimals'
import { MAXWELL_ENTRANCE, maxwellToCampus } from './maxwell'
import { HALL_ENTRANCE, hallToCampus } from './hall'
import { HALL_FLAGS_VIEW } from './hallFlags'
import { HALL_MINI_CENTER } from './hallMiniPlaza'
import { HALL_PASSAGE, HALL_TUNNEL } from './hallPassage'
import { MIGUEL_ENTRANCE, miguelToCampus } from './miguel'
import { DA_VINCI_PASSAGE, daVinciToCampus } from './daVinci'
import { DA_VINCI_FRONT, daVinciFrontToCampus } from './daVinciPlaza'
import { HAYEK_ENTRANCE, HAYEK_APICE, hayekToCampus } from './hayek'
import { MIGUEL_GARDEN_ENTRANCE, MIGUEL_ROCKET, miguelGardenToCampus } from './miguelGarden'
import { CAMPUS_SLOPE, campusBaseHeightAt } from './campusSlope'
import { PAGODA, PAGODA_STAIR_FOOT } from './pagoda'
import { CASITA, casitaToCampus } from './casita'
import { COLISEO, coliseoToCampus } from './coliseo'
import { EPICURO_FRONT, epicuroToCampus } from './epicuro'
import { NEWTON_ENTRANCE, newtonToCampus } from './newton'
import { GALILEO_ENTRANCE, galileoToCampus } from './galileo'

/** A camera shot of a modelled detail, offered as a chip on the building's sheet. */
export type BuildingView =
  | { label: string; focus: () => MapFocus }
  | { label: string; animal: Extract<CampusAnimalId, 'gaston' | 'pancho'> }

// Phones see less ground, so most shots frame a tighter span there.
const narrow = () => window.innerWidth < 760

const VIEWS: { buildings: string[]; view: BuildingView }[] = [
  { buildings: ['maxwell'], view: { label: 'Patio y dragón', focus: () => ({ center: maxwellToCampus([0, 8]), span: narrow() ? 28 : 42, aboveThePanel: true, azimuth: MAXWELL_ENTRANCE.angle, height: 4.6, tilt: 0.68 }) } },
  { buildings: ['maxwell'], view: { label: 'Patio del bus', focus: () => ({ center: maxwellToCampus([-27.5, -4.5]), span: narrow() ? 16 : 32, aboveThePanel: true, azimuth: MAXWELL_ENTRANCE.angle + Math.PI / 2 + 0.3, height: 3, tilt: 0.72 }) } },
  { buildings: ['hall-principal', 'einstein'], view: { label: 'Paso Hall–Einstein', focus: () => ({ center: hallToCampus([HALL_PASSAGE.center, -1.5]), span: narrow() ? 24 : 30, aboveThePanel: true, azimuth: HALL_ENTRANCE.angle, height: 2.5, tilt: 0.92 }) } },
  { buildings: ['hall-principal', 'einstein'], view: { label: 'Túnel y rampa', focus: () => ({ center: hallToCampus([HALL_PASSAGE.center, HALL_TUNNEL.mouth + 0.8]), span: narrow() ? 12 : 15, aboveThePanel: true, azimuth: HALL_ENTRANCE.angle, height: 1.9, tilt: 1.38 }) } },
  { buildings: ['hall-principal'], view: { label: 'Plazoleta lateral', focus: () => ({ center: hallToCampus(HALL_MINI_CENTER), span: narrow() ? 24 : 32, aboveThePanel: true, azimuth: HALL_ENTRANCE.angle + 0.15, height: 2, tilt: 0.9 }) } },
  { buildings: ['hall-principal'], view: { label: 'Reja y banderas', focus: () => ({ center: HALL_FLAGS_VIEW, span: 46, aboveThePanel: true, azimuth: HALL_ENTRANCE.angle, height: 3, tilt: 1.1 }) } },
  { buildings: ['miguel-de-santiago'], view: { label: 'Entrada y torre', focus: () => ({ center: miguelToCampus([-3, 3]), span: narrow() ? 46 : 50, aboveThePanel: true, azimuth: MIGUEL_ENTRANCE.angle - 0.35, height: 5.5, tilt: 1.05 }) } },
  { buildings: ['miguel-de-santiago'], view: { label: 'Entrada del jardín', focus: () => ({ center: miguelGardenToCampus([0, 3]), span: narrow() ? 30 : 40, aboveThePanel: true, azimuth: MIGUEL_GARDEN_ENTRANCE.angle + 0.14, height: 5, tilt: 1.12 }) } },
  { buildings: ['miguel-de-santiago'], view: { label: 'Cohete y jardín', focus: () => ({ center: miguelGardenToCampus(MIGUEL_ROCKET.at), span: narrow() ? 25 : 29, aboveThePanel: true, azimuth: MIGUEL_GARDEN_ENTRANCE.angle + 1.22, height: 8, tilt: 1.23 }) } },
  { buildings: ['epicuro'], view: { label: 'Torre y fuente', focus: () => ({ center: epicuroToCampus([19, 5]), span: narrow() ? 40 : 54, aboveThePanel: true, azimuth: EPICURO_FRONT.angle - 0.16, height: 5, tilt: 1.13 }) } },
  { buildings: ['newton'], view: { label: 'Frente de Newton', focus: () => ({ center: newtonToCampus([-2, 9]), span: narrow() ? 48 : 70, aboveThePanel: true, azimuth: NEWTON_ENTRANCE.angle, height: 2, tilt: 1.12 }) } },
  { buildings: ['galileo'], view: { label: 'Entrada y laguna', focus: () => ({ center: galileoToCampus([3, 15]), span: narrow() ? 46 : 82, aboveThePanel: true, azimuth: GALILEO_ENTRANCE.angle - 0.55, height: 2, tilt: 1.1 }) } },
  { buildings: ['da-vinci'], view: { label: 'Fachada hacia Maxwell', focus: () => ({ center: daVinciToCampus([20, 5]), span: narrow() ? 26 : 32, aboveThePanel: true, azimuth: DA_VINCI_PASSAGE.angle - Math.PI / 2 + 0.22, height: 3.8, tilt: 1.3 }) } },
  { buildings: ['da-vinci'], view: { label: 'Plaza y columnas', focus: () => ({ center: daVinciFrontToCampus([20, 10]), span: narrow() ? 40 : 52, aboveThePanel: true, azimuth: DA_VINCI_FRONT.angle - 0.2, height: 4.5, tilt: 1.02 }) } },
  { buildings: ['da-vinci'], view: { label: 'Pileta y toldo', focus: () => ({ center: daVinciFrontToCampus([19, 17]), span: narrow() ? 34 : 44, aboveThePanel: true, azimuth: 2.88, height: 3.5, tilt: 0.95 }) } },
  { buildings: ['coliseo'], view: { label: 'Fachada y bajada', focus: () => ({ center: coliseoToCampus([4, 5]), span: narrow() ? 38 : 48, aboveThePanel: true, azimuth: COLISEO.angle + 0.55, height: 1.5, tilt: 1.15 }) } },
  { buildings: ['coliseo'], view: { label: 'Gradas y jardín elevado', focus: () => ({ center: coliseoToCampus([1, 10]), span: 42, aboveThePanel: true, azimuth: 0.3, height: 1.5, tilt: 1.0 }) } },
  { buildings: ['coliseo', 'banos-deportes'], view: { label: 'Casita y mural', focus: () => ({ center: coliseoToCampus([-15, 10]), span: 24, aboveThePanel: true, azimuth: COLISEO.angle + Math.PI + 0.65, height: 1.8, tilt: 1.08 }) } },
  { buildings: ['coliseo'], view: { label: 'Vóley y patio', focus: () => ({ center: [-42, -69], span: 65, aboveThePanel: true, azimuth: -0.55, height: 0.5, tilt: 0.8 }) } },
  { buildings: ['pagoda'], view: { label: 'Gradas de la Pagoda', focus: () => ({ center: PAGODA_STAIR_FOOT, span: 30, aboveThePanel: true, azimuth: PAGODA.angle - Math.PI / 2, height: 1.8, tilt: 1.1 }) } },
  { buildings: ['pagoda'], view: { label: 'Bajada hacia el puente', focus: () => {
    const center: [number, number] = [(CAMPUS_SLOPE.start[0] + CAMPUS_SLOPE.end[0]) / 2, (CAMPUS_SLOPE.start[1] + CAMPUS_SLOPE.end[1]) / 2]
    return { center, span: 95, aboveThePanel: true, azimuth: -0.7, height: campusBaseHeightAt(center) + 2, tilt: 1.1 }
  } } },
  { buildings: ['gobe'], view: { label: 'Fachada de la casita', focus: () => ({ center: casitaToCampus([0, 1]), span: narrow() ? 16 : 22, aboveThePanel: true, azimuth: CASITA.angle + 0.25, height: 3.8, tilt: 1.1 }) } },
  { buildings: ['hayek'], view: { label: 'Entrada y puente', focus: () => ({ center: hayekToCampus([(HAYEK_ENTRANCE.portalX + HAYEK_ENTRANCE.door[0]) / 2, 6]), span: narrow() ? 26 : 38, aboveThePanel: true, azimuth: HAYEK_ENTRANCE.angle + 0.15, height: 9, tilt: 1.05 }) } },
  { buildings: ['hayek'], view: { label: 'Ápice · piso 0', focus: () => ({ center: hayekToCampus([HAYEK_APICE.center + 2, 3]), span: narrow() ? 22 : 26, aboveThePanel: true, azimuth: HAYEK_ENTRANCE.angle + 0.07, height: 3.2, tilt: 1.42 }) } },
  { buildings: ['gobe', 'hall-principal'], view: { label: 'Gastón', animal: 'gaston' } },
  { buildings: ['miguel-de-santiago'], view: { label: 'Pancho y Pancha', animal: 'pancho' } },
]

export function viewsFor(buildingId: string | undefined): BuildingView[] {
  return buildingId ? VIEWS.filter((entry) => entry.buildings.includes(buildingId)).map((entry) => entry.view) : []
}
