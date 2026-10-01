import { MapControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { MathUtils, type PerspectiveCamera, Spherical, Vector3 } from 'three'
import type { Vec2 } from '../types'

// Camera angles in radians: 0 looks straight down, like a flat map.
const TILT_3D = 0.9
// Not exactly 0: looking straight down, the camera has no defined heading and the map would spin.
const TILT_2D = 0.06
const MAX_TILT = 1.25
const MIN_DISTANCE = 40
const MAX_DISTANCE = 1400
// The map cannot be dragged further than this from the campus center, in meters.
const PAN_LIMIT = 450
// The bottom panel hides about half of a phone screen: the camera pulls back by PANEL_ZOOM and
// aims PANEL_SHIFT spans in front of the subject, so the subject lands in the half that stays visible.
const PANEL_ZOOM = 1.5
const PANEL_SHIFT = 0.6
const CARD_SHIFT = 0.3
// From this width the panel is a card at the side and no longer covers the map.
const WIDE_SCREEN = 760
const FLY_SPEED = 5
// A camera move that has not arrived by then is dropped, so it can never hold the map hostage.
const FLY_TIMEOUT_MS = 3000

export const INITIAL_VIEW = { tilt: TILT_3D, distance: 330 }

export interface MapFocus {
  center: Vec2
  /** Meters of ground that should fit on screen. */
  span: number
  /** True while the bottom panel covers the lower part of the map. */
  aboveThePanel: boolean
}

export interface MapCameraHandle {
  zoomBy: (factor: number) => void
  faceNorth: () => void
  setTilted: (tilted: boolean) => void
  flyTo: (focus: MapFocus) => void
}

interface Goal {
  deadline?: number
  target?: Vector3
  distance?: number
  azimuth?: number
  tilt?: number
}

interface Props {
  ref: Ref<MapCameraHandle>
  focus: MapFocus
  /** The camera reframes only when this changes, not every time `focus` is recomputed (e.g. on each GPS reading). */
  focusKey: string
  /** Called when the view turns or tilts, so the compass and the 2D/3D button can follow. */
  onViewChange: (azimuth: number, tilted: boolean) => void
}

/**
 * Map-style camera: drag to pan, pinch or scroll to zoom toward the pointer, two fingers
 * (or right-drag) to rotate and tilt. Programmatic moves glide instead of jumping.
 */
export function MapCamera({ ref, focus, focusKey, onViewChange }: Props) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const invalidate = useThree((state) => state.invalidate)
  const controls = useRef<ComponentRef<typeof MapControls>>(null)
  const goal = useRef<Goal | null>(null)
  // Only the starting point: handing the controls a new target later would swing the camera around it.
  const [initialTarget] = useState((): [number, number, number] => [focus.center[0], 0, -focus.center[1]])

  function fly(next: Goal) {
    if (next.target) {
      // Stay inside the area the user is allowed to pan, or the move would never arrive.
      next.target.x = MathUtils.clamp(next.target.x, -PAN_LIMIT, PAN_LIMIT)
      next.target.z = MathUtils.clamp(next.target.z, -PAN_LIMIT, PAN_LIMIT)
    }
    goal.current = { ...goal.current, ...next, deadline: performance.now() + FLY_TIMEOUT_MS }
    invalidate()
  }

  function flyTo({ center, span, aboveThePanel }: MapFocus) {
    // Phones are taller than wide, so the horizontal field of view is the tight one.
    const visibleRatio = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * Math.min(1, camera.aspect)
    const target = new Vector3(center[0], 0, -center[1])
    const covered = aboveThePanel && window.innerWidth < WIDE_SCREEN
    if (aboveThePanel && controls.current) {
      const azimuth = goal.current?.azimuth ?? controls.current.getAzimuthalAngle()
      // On a phone the panel is below the subject; on a wide screen it is a card to its left.
      const away = covered ? new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth)) : new Vector3(-Math.cos(azimuth), 0, Math.sin(azimuth))
      target.add(away.multiplyScalar(span * (covered ? PANEL_SHIFT : CARD_SHIFT)))
    }
    const distance = (span * (covered ? PANEL_ZOOM : 1)) / visibleRatio
    fly({ target, distance: MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE) })
  }

  useImperativeHandle(ref, () => ({
    zoomBy(factor) {
      if (!controls.current) return
      const current = goal.current?.distance ?? camera.position.distanceTo(controls.current.target)
      fly({ distance: MathUtils.clamp(current * factor, MIN_DISTANCE, MAX_DISTANCE) })
    },
    faceNorth: () => fly({ azimuth: 0 }),
    setTilted: (tilted) => fly({ tilt: tilted ? TILT_3D : TILT_2D }),
    flyTo,
  }))

  // eslint-disable-next-line react-hooks/exhaustive-deps -- flyTo only reads refs and the camera
  useEffect(() => flyTo(focus), [focusKey])

  useFrame((_, delta) => {
    const current = goal.current
    const orbit = controls.current
    if (!current || !orbit) return
    if (performance.now() > (current.deadline ?? Infinity)) {
      goal.current = null
      return
    }

    const ease = 1 - Math.exp(-delta * FLY_SPEED)
    const view = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
    if (current.target) orbit.target.lerp(current.target, ease)
    if (current.distance !== undefined) view.radius = MathUtils.lerp(view.radius, current.distance, ease)
    if (current.tilt !== undefined) view.phi = MathUtils.lerp(view.phi, current.tilt, ease)
    // Turn the short way round.
    const turn = current.azimuth === undefined ? 0 : Math.atan2(Math.sin(current.azimuth - view.theta), Math.cos(current.azimuth - view.theta))
    view.theta += turn * ease
    view.makeSafe()
    camera.position.copy(orbit.target).add(new Vector3().setFromSpherical(view))
    orbit.update()

    const arrived =
      (!current.target || orbit.target.distanceTo(current.target) < 0.3) &&
      (current.distance === undefined || Math.abs(view.radius - current.distance) < 0.5) &&
      (current.tilt === undefined || Math.abs(view.phi - current.tilt) < 0.005) &&
      Math.abs(turn) < 0.005
    if (arrived) goal.current = null
    else invalidate()
  })

  function handleChange() {
    const orbit = controls.current
    if (!orbit) return
    const x = MathUtils.clamp(orbit.target.x, -PAN_LIMIT, PAN_LIMIT)
    const z = MathUtils.clamp(orbit.target.z, -PAN_LIMIT, PAN_LIMIT)
    if (x !== orbit.target.x || z !== orbit.target.z) {
      camera.position.x += x - orbit.target.x
      camera.position.z += z - orbit.target.z
      orbit.target.set(x, 0, z)
    }
    onViewChange(orbit.getAzimuthalAngle(), orbit.getPolarAngle() > 0.15)
  }

  return (
    <MapControls
      ref={controls}
      makeDefault
      target={initialTarget}
      enableDamping
      dampingFactor={0.12}
      zoomToCursor
      maxPolarAngle={MAX_TILT}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      // A gesture always wins over a camera move in progress.
      onStart={() => (goal.current = null)}
      onChange={handleChange}
    />
  )
}
