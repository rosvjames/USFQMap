import type { BuildingPlan } from '../../types'
import { hallPrincipal } from './hallPrincipal'

/** Indoor plans keyed by building id. Add a file per building and register it here. */
export const PLANS: Record<string, BuildingPlan> = {
  [hallPrincipal.buildingId]: hallPrincipal,
}
