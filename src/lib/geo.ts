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
