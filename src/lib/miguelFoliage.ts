import { PlaneGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Intersecting branch cards break the spherical silhouette from every camera angle. */
export function createMiguelCanopy() {
  let seed = 431
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const cards = Array.from({ length: 96 }, (_, i) => {
    const angle = i * 2.39996, y = 1 - 2 * (i + .5) / 96, radius = Math.sqrt(1 - y * y) * (.65 + random() * .28)
    const card = new PlaneGeometry(.62 + random() * .35, .62 + random() * .35)
    card.rotateX(random() * Math.PI).rotateY(angle).rotateZ(random() * Math.PI)
    card.translate(Math.cos(angle) * radius, y * .82, Math.sin(angle) * radius)
    return card
  })
  const canopy = mergeGeometries(cards)!
  cards.forEach(card => card.dispose())
  return canopy
}
