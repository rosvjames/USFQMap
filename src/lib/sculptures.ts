import { BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'

type Point = [number, number, number]
type Form = { p: Point; r: Point; cos: number; sin: number; minRadius: number }
type Sculpture = 'david' | 'lion' | 'reclining-lion'
const form = (p: Point, r: Point, angle = 0): Form => ({ p, r, cos: Math.cos(angle), sin: Math.sin(angle), minRadius: Math.min(...r) })
function limb(a: Point, b: Point, radius: number): Form {
  return form(a.map((n, i) => (n + b[i]) / 2) as Point,
    [radius, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + radius * 0.5, radius * 0.86], Math.atan2(a[0] - b[0], b[1] - a[1]))
}

function sculptureForms(kind: Sculpture) {
  const forms: Form[] = [], cuts: Form[] = []
  if (kind === 'david') {
    // Contrapposto silhouette: one bent leg, lowered right arm, left hand near the shoulder.
    forms.push(
      form([0, 0.88, 0], [0.18, 0.15, 0.115]),
      form([-0.015, 1.10, 0], [0.16, 0.27, 0.095]),
      form([0, 1.31, 0], [0.235, 0.13, 0.105]),
      form([-0.09, 1.27, 0.072], [0.115, 0.09, 0.045]), form([0.10, 1.27, 0.072], [0.115, 0.09, 0.045]),
      form([0, 1.47, 0], [0.075, 0.12, 0.07]),
      form([-0.02, 1.70, 0], [0.125, 0.17, 0.115]), form([-0.02, 1.635, 0.045], [0.085, 0.075, 0.085]),
      form([-0.043, 1.705, 0.125], [0.025, 0.05, 0.045]),
      form([-0.08, 1.735, 0.10], [0.047, 0.018, 0.04]), form([0.022, 1.735, 0.10], [0.047, 0.018, 0.04]),
      form([-0.035, 1.62, 0.125], [0.043, 0.03, 0.018]),
      form([-0.138, 1.68, -0.005], [0.022, 0.048, 0.02]), form([0.098, 1.68, -0.005], [0.022, 0.048, 0.02]),
      limb([-0.085, 0.87, 0], [-0.135, 0.5, 0.025], 0.10),
      limb([-0.135, 0.5, 0.025], [-0.15, 0.12, 0], 0.068),
      limb([0.11, 0.86, 0], [0.21, 0.5, 0.075], 0.105),
      limb([0.21, 0.5, 0.075], [0.29, 0.12, 0.045], 0.065),
      form([-0.15, 0.058, 0.075], [0.071, 0.052, 0.145]), form([0.29, 0.057, 0.105], [0.068, 0.05, 0.14]),
      limb([-0.22, 1.33, 0], [-0.28, 1.06, 0.04], 0.073),
      limb([-0.28, 1.06, 0.04], [-0.25, 0.83, 0.065], 0.053),
      form([-0.255, 0.79, 0.073], [0.049, 0.078, 0.038]),
      limb([0.23, 1.33, 0], [0.365, 1.19, 0.07], 0.073),
      limb([0.365, 1.19, 0.07], [0.235, 1.46, 0.095], 0.052),
      form([0.217, 1.465, 0.09], [0.053, 0.06, 0.045]),
      form([0.01, 0.76, 0.10], [0.035, 0.048, 0.04]),
    )
    // Small overlapping curls are fused into the head rather than rendered as loose spheres.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 + row * 0.17, radius = 0.12 - row * 0.018
      forms.push(form([-0.02 + Math.cos(a) * radius, 1.76 + row * 0.055, Math.sin(a) * radius * 0.85 - 0.016], [0.041, 0.037, 0.043]))
    }
    cuts.push(form([-0.075, 1.713, 0.108], [0.026, 0.013, 0.028]), form([0.018, 1.713, 0.108], [0.026, 0.013, 0.028]))
  } else if (kind === 'lion') {
    forms.push(
      form([0, 0.43, -0.14], [0.28, 0.39, 0.33]),
      form([-0.225, 0.21, -0.23], [0.20, 0.20, 0.27]), form([0.225, 0.21, -0.23], [0.20, 0.20, 0.27]),
      limb([-0.16, 0.66, 0.15], [-0.16, 0.09, 0.28], 0.10), limb([0.16, 0.66, 0.15], [0.16, 0.09, 0.28], 0.10),
      form([-0.16, 0.065, 0.35], [0.13, 0.065, 0.20]), form([0.16, 0.065, 0.35], [0.13, 0.065, 0.20]),
      form([0, 0.84, 0.12], [0.32, 0.39, 0.27]),
      form([0, 1.04, 0.34], [0.21, 0.19, 0.21]),
      form([-0.085, 0.985, 0.50], [0.115, 0.085, 0.14]), form([0.085, 0.985, 0.50], [0.115, 0.085, 0.14]),
      form([0, 1.04, 0.605], [0.088, 0.042, 0.037]), form([0, 0.91, 0.48], [0.125, 0.04, 0.105]),
      form([-0.205, 1.16, 0.26], [0.082, 0.073, 0.05]), form([0.205, 1.16, 0.26], [0.082, 0.073, 0.05]),
    )
    for (let row = 0; row < 3; row++) for (let i = 0; i < 22; i++) {
      const a = i * Math.PI / 11 + row * 0.11
      forms.push(form([Math.cos(a) * (0.265 + row * 0.008), 0.82 + Math.sin(a) * 0.29 + row * 0.08, 0.14 + row * 0.058], [0.05, 0.11, 0.063], Math.cos(a) * 0.24))
    }
    cuts.push(form([-0.115, 1.083, 0.497], [0.029, 0.022, 0.035]), form([0.115, 1.083, 0.497], [0.029, 0.022, 0.035]))
  } else {
    // Maxwell has low reclining stone lions with forward paws, rather than the seated Hall lions.
    forms.push(
      form([0, 0.24, -0.28], [0.25, 0.22, 0.68]),
      form([-0.2, 0.16, -0.66], [0.22, 0.15, 0.29]), form([0.2, 0.16, -0.66], [0.22, 0.15, 0.29]),
      form([-0.17, 0.1, 0.39], [0.1, 0.095, 0.44]), form([0.17, 0.1, 0.39], [0.1, 0.095, 0.44]),
      form([-0.17, 0.08, 0.78], [0.13, 0.07, 0.14]), form([0.17, 0.08, 0.78], [0.13, 0.07, 0.14]),
      form([0, 0.46, 0.23], [0.28, 0.29, 0.27]),
      form([0, 0.61, 0.39], [0.18, 0.15, 0.19]),
      form([-0.065, 0.55, 0.56], [0.08, 0.06, 0.09]), form([0.065, 0.55, 0.56], [0.08, 0.06, 0.09]),
      form([0, 0.59, 0.64], [0.06, 0.03, 0.024]),
      form([-0.17, 0.71, 0.3], [0.06, 0.05, 0.04]), form([0.17, 0.71, 0.3], [0.06, 0.05, 0.04]),
      form([0.36, 0.12, -0.48], [0.06, 0.055, 0.44]),
    )
    for (let i = 0; i < 18; i++) {
      const a = i * Math.PI / 9
      forms.push(form([Math.cos(a) * 0.245, 0.45 + Math.sin(a) * 0.255, 0.31], [0.035, 0.07, 0.045]))
    }
    cuts.push(form([-0.09, 0.64, 0.53], [0.024, 0.014, 0.025]), form([0.09, 0.64, 0.53], [0.024, 0.014, 0.025]))
  }
  return { forms, cuts }
}

function distance(x: number, y: number, z: number, f: Form) {
  const dx = x - f.p[0], dy = y - f.p[1], dz = z - f.p[2]
  const lx = dx * f.cos + dy * f.sin, ly = -dx * f.sin + dy * f.cos
  return (Math.sqrt((lx / f.r[0]) ** 2 + (ly / f.r[1]) ** 2 + (dz / f.r[2]) ** 2) - 1) * f.minRadius
}

/** Original approximate sculpture meshes inspired by the user's photos; no third-party scans. */
export function createSculptureGeometry(kind: Sculpture, resolution = 72): BufferGeometry {
  const { forms, cuts } = sculptureForms(kind)
  const size: Point = kind === 'david' ? [1.25, 2.08, 0.9] : kind === 'lion' ? [1.2, 1.55, 1.4] : [1.4, 1.1, 2.4]
  const center: Point = kind === 'david' ? [0, 0.96, 0.03] : kind === 'lion' ? [0, 0.65, 0.08] : [0, 0.44, -0.12]
  const dummy = new MeshStandardMaterial()
  const marching = new MarchingCubes(resolution, dummy, false, false, 45000)
  marching.isolation = 0
  const blend = kind === 'david' ? 0.022 : 0.025
  for (let z = 0; z < resolution; z++) for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const px = (x / resolution - 0.5) * size[0] + center[0]
    const py = (y / resolution - 0.5) * size[1] + center[1]
    const pz = (z / resolution - 0.5) * size[2] + center[2]
    let d = 10
    for (const f of forms) {
      const next = distance(px, py, pz, f), h = Math.max(blend - Math.abs(d - next), 0) / blend
      d = Math.min(d, next) - h * h * blend * 0.25
    }
    for (const cut of cuts) d = Math.max(d, -distance(px, py, pz, cut))
    marching.field[z * resolution * resolution + y * resolution + x] = -d
  }
  marching.update()
  const count = marching.count
  if (count > 45000 * 3) throw new Error('Sculpture exceeds its geometry capacity')
  const geometry = new BufferGeometry()
  for (const attribute of ['position', 'normal']) geometry.setAttribute(attribute,
    new Float32BufferAttribute(marching.geometry.getAttribute(attribute).array.slice(0, count * 3), 3))
  geometry.scale(size[0] / 2, size[1] / 2, size[2] / 2).translate(...center)
  const vertices = geometry.getAttribute('position'), colors = new Float32Array(count * 3)
  const color = new Color(), base = new Color(kind === 'lion' ? '#405951' : '#e8e6dd')
  for (let i = 0; i < count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i)
    const noise = Math.sin(x * 43 + y * 57 + z * 67) * Math.sin(y * 83 - z * 51)
    color.copy(base).multiplyScalar(1 + noise * (kind === 'lion' ? 0.18 : 0.035))
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  marching.geometry.dispose(); dummy.dispose()
  return geometry
}
