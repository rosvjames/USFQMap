import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import type { Vec2 } from '../types'

type Point = [number, number, number]

// Below the sheets and the map controls (z-index 15 and up), so the markers never cover the interface.
const BEHIND_UI: [number, number] = [10, 0]
// The destination pin and its name stay above the route dots.
const ABOVE_DOTS: [number, number] = [12, 11]

/** Douglas–Peucker: the corners that remain once wiggles smaller than `tolerance` meters are ironed out. */
function corners(path: Vec2[], tolerance: number, from = 0, to = path.length - 1): number[] {
  const [a, b] = [path[from], path[to]]
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  let farthest = -1
  let distance = tolerance
  for (let i = from + 1; i < to; i++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - path[i][1]) - (a[0] - path[i][0]) * (b[1] - a[1])) / length
    if (d > distance) [farthest, distance] = [i, d]
  }
  return farthest < 0 ? [] : [...corners(path, tolerance, from, farthest), farthest, ...corners(path, tolerance, farthest, to)]
}

/** The real turns of the walk: corners of the simplified line that bend by more than 40°. */
export function routeBends(path: Vec2[], tolerance = 8): number[] {
  const kept = [0, ...corners(path, tolerance), path.length - 1]
  return kept.slice(1, -1).filter((i, k) => {
    const [a, b, c] = [path[kept[k]], path[i], path[kept[k + 2]]]
    const turn = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]))
    return Math.min(turn, 2 * Math.PI - turn) > (40 * Math.PI) / 180
  })
}

/** "You are here": a white disc with a red arrow pointing along the first stretch of the walk, inside a pulsing red halo. */
export function OriginMarker({ position, toward }: { position: Point; toward: Point }) {
  const arrow = useRef<SVGSVGElement>(null)
  const camera = useThree((state) => state.camera)
  const [a, b] = useMemo(() => [new Vector3(), new Vector3()], [])
  useFrame(() => {
    if (!arrow.current) return
    a.set(...position).project(camera)
    b.set(...toward).project(camera)
    // Screen y grows downwards, projected y upwards.
    arrow.current.style.rotate = `${Math.atan2(b.x - a.x, b.y - a.y)}rad`
  })
  return (
    <Html position={position} center zIndexRange={BEHIND_UI} style={{ pointerEvents: 'none' }}>
      <span className="route-origin">
        <svg ref={arrow} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 20 20 12 15.5 4 20Z" fill="currentColor" /></svg>
      </span>
    </Html>
  )
}

export function BendDot({ position }: { position: Point }) {
  return (
    <Html position={position} center zIndexRange={BEHIND_UI} style={{ pointerEvents: 'none' }}>
      <span className="route-bend" />
    </Html>
  )
}

const PIN_ICONS: Record<string, string> = {
  // Open book
  ciceron: 'M12 7c-1.7-1.2-4.3-1.6-7-1.2v10.6c2.7-.4 5.3 0 7 1.2 1.7-1.2 4.3-1.6 7-1.2V5.8c-2.7-.4-5.3 0-7 1.2ZM12 7v10.6',
  // Stadium
  coliseo: 'M4 10c0-1.8 3.6-3.2 8-3.2s8 1.4 8 3.2v4.4c0 1.8-3.6 3.2-8 3.2s-8-1.4-8-3.2ZM4 10c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2',
  // Pagoda roof
  pagoda: 'M4 10c3.4-.8 5.4-3.2 8-5 2.6 1.8 4.6 4.2 8 5M7 10v8M17 10v8M5 18h14',
}
// Columns of a classical façade, for any other building.
const DEFAULT_PIN_ICON = 'M4 9.5 12 5l8 4.5ZM6.5 10v7M10.2 10v7M13.8 10v7M17.5 10v7M4 18.5h16'

/** A red map pin standing on the destination, with a white icon of what is there and its name beside it.
 *  On the right half of the screen the name moves to the left of the pin, so it never runs off the edge. */
export function DestinationMarker({ position, buildingId, name }: { position: Point; buildingId?: string; name?: string }) {
  const marker = useRef<HTMLSpanElement>(null)
  const camera = useThree((state) => state.camera)
  const point = useMemo(() => new Vector3(), [])
  useFrame(() => {
    if (!marker.current) return
    marker.current.classList.toggle('name-left', point.set(...position).project(camera).x > 0.15)
  })
  return (
    <Html position={position} zIndexRange={ABOVE_DOTS} style={{ pointerEvents: 'none' }}>
      <span ref={marker} className="route-destination">
        <svg className="route-pin" viewBox="0 0 44 54" width="44" height="54" aria-hidden="true">
          <path d="M22 52S4 34.5 4 21a18 18 0 0 1 36 0c0 13.5-18 31-18 31Z" fill="#e11b22" stroke="#fff" strokeWidth="3" />
          <g transform="translate(10 9)" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={PIN_ICONS[buildingId ?? ''] ?? DEFAULT_PIN_ICON} />
          </g>
        </svg>
        {name && <span className="route-destination-name">{name}</span>}
      </span>
    </Html>
  )
}
