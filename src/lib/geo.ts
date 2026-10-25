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

/** Like pointInPolygon, but a point within `tolerance` of the outline counts as inside (edges rounded by booleans or Float32). */
export function pointInPolygonTolerant(point: Vec2, ring: Vec2[], tolerance: number): boolean {
  if (pointInPolygon(point, ring)) return true
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i]
    const dx = bx - ax, dy = by - ay, lengthSq = dx * dx + dy * dy
    const t = lengthSq ? Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / lengthSq)) : 0
    if (Math.hypot(point[0] - ax - t * dx, point[1] - ay - t * dy) <= tolerance) return true
  }
  return false
}
