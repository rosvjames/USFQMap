import type { BuildingPlan } from '../../types'

/** Indoor plans keyed by building id. Add a file per building and register it here. */
// Register only surveyed, non-placeholder plans. The Hall example stays in its
// own file as a modelling template, never as a real navigation destination.
export const PLANS: Record<string, BuildingPlan> = {}
