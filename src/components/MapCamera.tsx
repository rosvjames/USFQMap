import { MapControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three'
import type { Vec2 } from '../types'
import { MapGestureController } from '../lib/mapGestures'
import { bindMapGestures } from '../lib/bindMapGestures'
import { type CameraGoal as Goal, stepCameraFlight } from '../lib/cameraFlight'

// Camera angles in radians: 0 looks straight down, like a flat map.
const TILT_3D = 0.85
// Not exactly 0: looking straight down, the camera has no defined heading and the map would spin.
const TILT_2D = 0.06
const MAX_TILT = 1.25
const MIN_DISTANCE = 12
const MAX_DISTANCE = 1400
// The map cannot be dragged further than this from the campus center, in meters.
const PAN_LIMIT = 450
// The bottom panel hides about half of a phone screen: the camera pulls back by PANEL_ZOOM and
// aims PANEL_SHIFT spans in front of the subject, so the subject lands in the half that stays visible.
const PANEL_ZOOM = 1.5
const PANEL_SHIFT = 0.6
const CARD_SHIFT = 0.18
// From this width the panel is a card at the side and no longer covers the map.
const WIDE_SCREEN = 760

export const INITIAL_VIEW = { tilt: TILT_3D, distance: 500, azimuth: 0 }

export interface MapFocus {
  center: Vec2
  /** Meters of ground that should fit on screen. */
  span: number
  /** True while the bottom panel covers the lower part of the map. */
  aboveThePanel: boolean
  /** Optional map orientation when focusing a photo-located facade. */
  azimuth?: number
  height?: number
  tilt?: number
}

export interface MapCameraHandle {
  zoomBy: (factor: number) => void
  faceNorth: () => void
  setTilted: (tilted: boolean) => void
  flyTo: (focus: MapFocus) => void
  flyToAnimal: (id: 'gaston' | 'pancho' | 'pancha') => void
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
  const scene = useThree(state=>state.scene)
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)
  const canvas = useThree((state) => state.gl.domElement)
  const controls = useRef<ComponentRef<typeof MapControls>>(null)
  const goal = useRef<Goal | null>(null)
  const following=useRef<{id:string;position:Vector3}|null>(null)
  const touch = useRef<MapGestureController | null>(null)
  const stopFlight = useCallback(() => { goal.current = null; following.current=null }, [])
  // Only the starting point: handing the controls a new target later would swing the camera around it.
  const [initialTarget] = useState((): [number, number, number] => [focus.center[0], 0, -focus.center[1]])

  function fly(next: Goal) {
    if (next.target) {
      // Stay inside the area the user is allowed to pan, or the move would never arrive.
      next.target.x = MathUtils.clamp(next.target.x, -PAN_LIMIT, PAN_LIMIT)
      next.target.z = MathUtils.clamp(next.target.z, -PAN_LIMIT, PAN_LIMIT)
    }
    goal.current = { ...goal.current, ...next, elapsed: 0 }
    invalidate()
  }

  function flyTo({ center, span, aboveThePanel, azimuth, height = 0, tilt }: MapFocus) {
    following.current=null
    // Phones are taller than wide, so the horizontal field of view is the tight one.
    const visibleRatio = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * Math.min(1, camera.aspect)
    const target = new Vector3(center[0], height, -center[1])
    const covered = aboveThePanel && window.innerWidth < WIDE_SCREEN
    if ((aboveThePanel || window.innerWidth >= WIDE_SCREEN) && controls.current) {
      const heading = azimuth ?? goal.current?.azimuth ?? controls.current.getAzimuthalAngle()
      // On a phone the panel is below the subject; on a wide screen it is a card to its left.
      const away = covered ? new Vector3(Math.sin(heading), 0, Math.cos(heading)) : new Vector3(-Math.cos(heading), 0, Math.sin(heading))
      target.add(away.multiplyScalar(span * (covered ? PANEL_SHIFT : CARD_SHIFT)))
    }
    const distance = (span * (covered ? PANEL_ZOOM : 1)) / visibleRatio
    fly({ target, distance: MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE), ...(azimuth !== undefined && { azimuth }), ...(tilt !== undefined && { tilt }) })
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
    flyToAnimal(id) {
      const animal=scene.getObjectByName(`campus-animal-${id}`)
      if(animal){
        flyTo({center:[animal.position.x,-animal.position.z],height:animal.position.y+1,span:18,aboveThePanel:true,azimuth:.4,tilt:.65})
        following.current={id:animal.name,position:animal.position.clone()}
      }
    },
  }))

  // eslint-disable-next-line react-hooks/exhaustive-deps -- flyTo only reads refs and the camera
  useEffect(() => flyTo(focus), [focusKey, size.width, size.height])

  useEffect(() => {
    const orbit = controls.current
    if (!orbit) return
    const gestures = new MapGestureController(camera, orbit.target, () => canvas.getBoundingClientRect(), { minDistance: MIN_DISTANCE, maxDistance: MAX_DISTANCE, panLimit: PAN_LIMIT })
    touch.current = gestures
    const dispose = bindMapGestures(canvas, orbit, gestures, invalidate, stopFlight)
    return () => { dispose(); touch.current = null }
  }, [camera, canvas, invalidate, stopFlight])

  useFrame((_, delta) => {
    if (touch.current?.flush()) { controls.current?.update(); invalidate() }
    const current = goal.current
    const orbit = controls.current
    const tracking=following.current,animal=tracking&&scene.getObjectByName(tracking.id)
    if(tracking&&animal&&orbit){
      const movement=animal.position.clone().sub(tracking.position)
      tracking.position.copy(animal.position)
      if(current?.target)current.target.add(movement)
      else {orbit.target.add(movement);camera.position.add(movement);orbit.update()}
    }
    if (!current || !orbit) return
    const arrived = stepCameraFlight(camera, orbit.target, current, delta)
    orbit.update()

    if (arrived) goal.current = null
    else invalidate()
  })

  const handleChange = useCallback(() => {
    const orbit = controls.current
    if (!orbit) return
    const x = MathUtils.clamp(orbit.target.x, -PAN_LIMIT, PAN_LIMIT)
    const z = MathUtils.clamp(orbit.target.z, -PAN_LIMIT, PAN_LIMIT)
    if (x !== orbit.target.x || z !== orbit.target.z) {
      camera.position.x += x - orbit.target.x
      camera.position.z += z - orbit.target.z
      orbit.target.set(x, orbit.target.y, z)
    }
    onViewChange(orbit.getAzimuthalAngle(), orbit.getPolarAngle() > 0.15)
  }, [camera, onViewChange])

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
      onStart={stopFlight}
      onChange={handleChange}
    />
  )
}
