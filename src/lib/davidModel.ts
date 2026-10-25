/** Scan of Michelangelo's David (Scan the World, CC BY-SA 4.0), prepared by scripts/prepare-david.mjs. */
export const DAVID_MODEL = {
  desktop: '/models/david/david.glb',
  mobile: '/models/david/david-mobile.glb',
  /** Normalised by the preparation script: Y up, feet on y = 0, centred on X/Z. */
  height: 4.4,
  triangleBudget: { desktop: 100000, mobile: 40000 },
}
