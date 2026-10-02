import { MathUtils, PerspectiveCamera, Spherical, Vector3 } from 'three'

export interface CameraGoal {
  elapsed?: number
  target?: Vector3
  distance?: number
  azimuth?: number
  tilt?: number
}

/** Time only advances while drawing; a paused tab must not silently discard its last command. */
export function stepCameraFlight(camera: PerspectiveCamera, target: Vector3, goal: CameraGoal, delta: number): boolean {
  const activeDelta = MathUtils.clamp(delta, 0, 0.1)
  goal.elapsed = (goal.elapsed ?? 0) + activeDelta
  if (goal.elapsed > 3) return true
  const ease = 1 - Math.exp(-activeDelta * 5)
  const view = new Spherical().setFromVector3(camera.position.clone().sub(target))
  if (goal.target) target.lerp(goal.target, ease)
  if (goal.distance !== undefined) view.radius = MathUtils.lerp(view.radius, goal.distance, ease)
  if (goal.tilt !== undefined) view.phi = MathUtils.lerp(view.phi, goal.tilt, ease)
  const turn = goal.azimuth === undefined ? 0 : Math.atan2(Math.sin(goal.azimuth - view.theta), Math.cos(goal.azimuth - view.theta))
  view.theta += turn * ease; view.makeSafe()
  camera.position.copy(target).add(new Vector3().setFromSpherical(view))
  camera.lookAt(target)
  return (!goal.target || target.distanceTo(goal.target) < 0.3)
    && (goal.distance === undefined || Math.abs(view.radius - goal.distance) < 0.5)
    && (goal.tilt === undefined || Math.abs(view.phi - goal.tilt) < 0.005)
    && Math.abs(turn) < 0.005
}
