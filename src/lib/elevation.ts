// Relative model heights: the campus descends 3.2 m to a deck 6 m above the street datum.
export const CAMPUS_ELEVATION = 6 - (.55 - 3.2)

/** Pampite meets the upper campus; the Interoceánica and both bridge ramps stay below it. */
export function cityBaseHeightAt([, north]: [number, number]): number {
  const t = Math.max(0, Math.min(1, (north + 145) / 110))
  return .55 + CAMPUS_ELEVATION * t * t * (3 - 2 * t)
}
