import type { BuildingPlan } from '../../types'

// DATOS DE EJEMPLO. The nodes below only sit inside the real footprint of the building;
// rooms, corridors and stairs are invented so the app has something to route over.
// Replace them with the real layout once it is surveyed (see README, "Levantar un edificio").
export const hallPrincipal: BuildingPlan = {
  buildingId: 'hall-principal',
  placeholder: true,
  floors: [1, 2],
  nodes: [
    { id: 'hp-entrada', kind: 'entrance', floor: 1, x: -12, y: 50, label: 'Entrada principal' },
    { id: 'hp-1-p1', kind: 'corridor', floor: 1, x: -14, y: 62 },
    { id: 'hp-1-p2', kind: 'corridor', floor: 1, x: -18, y: 78 },
    { id: 'hp-1-p3', kind: 'corridor', floor: 1, x: -18, y: 98 },
    { id: 'hp-1-p4', kind: 'corridor', floor: 1, x: 0, y: 98 },
    { id: 'hp-1-esc', kind: 'stairs', floor: 1, x: -8, y: 98, label: 'Escaleras centrales' },
    { id: 'hp-ej101', kind: 'room', floor: 1, x: -28, y: 78, code: 'EJ101', label: 'Aula de ejemplo 101' },
    { id: 'hp-ej102', kind: 'room', floor: 1, x: -28, y: 98, code: 'EJ102', label: 'Aula de ejemplo 102' },
    { id: 'hp-ej103', kind: 'room', floor: 1, x: 4, y: 115, code: 'EJ103', label: 'Oficina de ejemplo 103' },

    { id: 'hp-2-esc', kind: 'stairs', floor: 2, x: -8, y: 98, label: 'Escaleras centrales' },
    { id: 'hp-2-p1', kind: 'corridor', floor: 2, x: -18, y: 98 },
    { id: 'hp-2-p2', kind: 'corridor', floor: 2, x: -18, y: 78 },
    { id: 'hp-ej201', kind: 'room', floor: 2, x: -28, y: 98, code: 'EJ201', label: 'Aula de ejemplo 201' },
    { id: 'hp-ej202', kind: 'room', floor: 2, x: -28, y: 78, code: 'EJ202', label: 'Aula de ejemplo 202' },
  ],
  edges: [
    { from: 'hp-entrada', to: 'hp-1-p1' },
    { from: 'hp-1-p1', to: 'hp-1-p2' },
    { from: 'hp-1-p2', to: 'hp-1-p3' },
    { from: 'hp-1-p3', to: 'hp-1-esc' },
    { from: 'hp-1-esc', to: 'hp-1-p4' },
    { from: 'hp-1-p2', to: 'hp-ej101' },
    { from: 'hp-1-p3', to: 'hp-ej102' },
    { from: 'hp-1-p4', to: 'hp-ej103' },

    { from: 'hp-1-esc', to: 'hp-2-esc' },
    { from: 'hp-2-esc', to: 'hp-2-p1' },
    { from: 'hp-2-p1', to: 'hp-2-p2' },
    { from: 'hp-2-p1', to: 'hp-ej201' },
    { from: 'hp-2-p2', to: 'hp-ej202' },
  ],
}
