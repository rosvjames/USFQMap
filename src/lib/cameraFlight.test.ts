import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Spherical, Vector3 } from 'three'
import { type CameraGoal, stepCameraFlight } from './cameraFlight'

describe('camera commands after idle or paused frames', () => {
  it('does not drop a 2D command after a long pause and eventually reaches the requested tilt', () => {
    const camera = new PerspectiveCamera(), target = new Vector3()
    camera.position.set(0, 100, 100)
    const goal: CameraGoal = { tilt: 0.06 }
    expect(stepCameraFlight(camera, target, goal, 20)).toBe(false)
    expect(new Spherical().setFromVector3(camera.position).phi).toBeLessThan(Math.PI / 4)
    let arrived = false
    for (let i = 0; i < 180 && !arrived; i++) arrived = stepCameraFlight(camera, target, goal, 1 / 60)
    expect(arrived).toBe(true)
    expect(new Spherical().setFromVector3(camera.position).phi).toBeCloseTo(0.06, 2)
  })
  it('reaches a combined pan, zoom and heading command without a long rotation around north', () => {
    const camera = new PerspectiveCamera(), target = new Vector3()
    camera.position.setFromSpherical(new Spherical(500, 0.85, Math.PI - 0.1))
    const goal: CameraGoal = { target: new Vector3(80, 4, -90), distance: 100, azimuth: -Math.PI + 0.1 }
    stepCameraFlight(camera, target, goal, 0.016)
    expect(new Spherical().setFromVector3(camera.position.clone().sub(target)).theta).toBeGreaterThan(3)
    let arrived = false
    for (let i = 0; i < 180 && !arrived; i++) arrived = stepCameraFlight(camera, target, goal, 1 / 60)
    expect(arrived).toBe(true)
    expect(target.distanceTo(goal.target!)).toBeLessThan(0.3)
    expect(camera.position.distanceTo(target)).toBeCloseTo(100, 0)
  })
})
