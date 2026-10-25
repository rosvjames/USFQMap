import type { Vec2 } from '../types'

// Local frame: meters east/north of a fixed point near the middle of the Cumbayá campus.
// The campus is ~500 m wide, so a flat approximation is accurate to a few centimeters.
export const ORIGIN = { lon: -78.4357, lat: -0.1968 }

const METERS_PER_DEG_LAT = 110574
const METERS_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)

export function toLocal([lon, lat]: number[]): Vec2 {
  return [(lon - ORIGIN.lon) * METERS_PER_DEG_LON, (lat - ORIGIN.lat) * METERS_PER_DEG_LAT]
}

export function centroid(ring: Vec2[]): Vec2 {
  let x = 0
  let y = 0
  for (const p of ring) {
    x += p[0]
    y += p[1]
  }
  return [x / ring.length, y / ring.length]
}

export function pointInPolygon([x, y]: Vec2, ring: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  // The exact end, not a rounded copy, so a point that snaps to a graph node keeps its id.
  if (t <= 0) return a
  if (t >= 1) return b
  return [a[0] + t * dx, a[1] + t * dy]
}

export function closestPointOnRing(p: Vec2, ring: Vec2[]): Vec2 {
  let best = ring[0]
  for (let i = 0; i < ring.length; i++) {
    const q = closestPointOnSegment(p, ring[i], ring[(i + 1) % ring.length])
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(best[0] - p[0], best[1] - p[1])) best = q
  }
  return best
}
