import { ExtrudeGeometry, Shape } from 'three'

/** Scalloped bat-wing silhouette, with a thin curved membrane and mirrored span. */
export function createDragonWingGeometry(side: -1 | 1): ExtrudeGeometry {
  const wing = new Shape()
  const p = (x: number) => x * side
  wing.moveTo(p(0.48), 1.1)
  wing.quadraticCurveTo(p(1.5), 2.1, p(3.3), 2.4)
  wing.quadraticCurveTo(p(6), 2.25, p(9.2), 2.08)
  wing.quadraticCurveTo(p(8.5), 1.2, p(8.25), 0.25)
  wing.quadraticCurveTo(p(7.4), 1.15, p(6.5), -0.05)
  wing.quadraticCurveTo(p(5.6), 0.75, p(4.5), -0.7)
  wing.quadraticCurveTo(p(3.7), 0.4, p(2.8), 0.15)
  wing.quadraticCurveTo(p(1.8), 0.25, p(0.48), 1.1)
  wing.closePath()
  const geometry = new ExtrudeGeometry(wing, { depth: 0.075, bevelEnabled: false, curveSegments: 12 })
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const x = Math.abs(positions.getX(i))
    positions.setZ(i, positions.getZ(i) + 0.65 + Math.sin(x * 0.36) * 0.2)
  }
  geometry.computeVertexNormals()
  return geometry
}
