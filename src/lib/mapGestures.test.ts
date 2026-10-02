import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { MapGestureController } from './mapGestures'

function setup() {
  const camera = new PerspectiveCamera(45, 400 / 800, 1, 4000)
  const target = new Vector3(0, 0, 0)
  camera.position.set(0, 100, 100); camera.lookAt(target); camera.updateMatrixWorld()
  const gestures = new MapGestureController(camera, target, () => ({ left: 0, top: 0, width: 400, height: 800 }), { minDistance: 40, maxDistance: 1400, panLimit: 450 })
  return { camera, target, gestures }
}

describe('map gestures on a real perspective camera', () => {
  it('pans with one finger without changing zoom, heading or camera height', () => {
    const { camera, target, gestures } = setup(), distance = camera.position.distanceTo(target)
    gestures.start(1, 200, 400); gestures.move(1, 250, 400); gestures.flush()
    expect(target.x).toBeLessThan(-5)
    expect(camera.position.distanceTo(target)).toBeCloseTo(distance)
    expect(camera.position.y).toBe(100)
    expect(camera.position.clone().sub(target).x).toBeCloseTo(0)
  })
  it('spreading two fingers zooms in; bringing them together zooms out', () => {
    const { camera, target, gestures } = setup(), distance = camera.position.distanceTo(target)
    gestures.start(1, 150, 400); gestures.start(2, 250, 400)
    gestures.move(1, 100, 400); gestures.move(2, 300, 400); gestures.flush()
    expect(camera.position.distanceTo(target)).toBeCloseTo(distance / 2)
    gestures.move(1, 150, 400); gestures.move(2, 250, 400); gestures.flush()
    expect(camera.position.distanceTo(target)).toBeCloseTo(distance)
  })
  it('twists around a fixed finger using the angle between the fingers, preserving tilt', () => {
    const { camera, target, gestures } = setup(), distance = camera.position.distanceTo(target)
    gestures.start(1, 200, 400); gestures.start(2, 300, 400)
    gestures.move(2, 200, 500); gestures.flush()
    const offset = camera.position.clone().sub(target)
    expect(Math.atan2(offset.x, offset.z)).toBeCloseTo(Math.PI / 2)
    expect(offset.length()).toBeCloseTo(distance)
    expect(offset.y).toBeCloseTo(100)
  })
  it('moving both fingers sideways pans instead of changing heading', () => {
    const { camera, target, gestures } = setup()
    gestures.start(1, 150, 400); gestures.start(2, 250, 400)
    gestures.move(1, 200, 400); gestures.move(2, 300, 400); gestures.flush()
    expect(target.x).toBeLessThan(0)
    expect(camera.position.clone().sub(target).x).toBeCloseTo(0)
  })
  it('rebases on adding/removing a finger without jumping, then continues a one-finger pan', () => {
    const { camera, gestures } = setup()
    gestures.start(1, 150, 400); gestures.move(1, 170, 400); gestures.flush()
    const before = camera.position.clone()
    gestures.start(2, 280, 410); gestures.flush()
    expect(camera.position.distanceTo(before)).toBeCloseTo(0)
    gestures.end(2); gestures.flush()
    expect(camera.position.distanceTo(before)).toBeCloseTo(0)
    gestures.move(1, 190, 400); gestures.flush()
    expect(camera.position.distanceTo(before)).toBeGreaterThan(1)
    expect(gestures.dragged).toBe(true)
  })
  it('clamps pinch and pan, and keeps near-coincident fingers finite', () => {
    const { camera, target, gestures } = setup()
    gestures.start(1, 100, 400); gestures.start(2, 300, 400)
    gestures.move(2, 100, 400); gestures.flush()
    expect(Number.isFinite(camera.position.length())).toBe(true)
    gestures.move(2, 101, 400); gestures.flush()
    expect(camera.position.distanceTo(target)).toBeLessThanOrEqual(1400.001)
    gestures.end(2); gestures.move(1, 100000, 400); gestures.flush()
    expect(Math.abs(target.x)).toBeLessThanOrEqual(450)
  })
  it('does not mistake a tap for a drag, and ignores mouse/unknown pointer moves', () => {
    const { gestures } = setup()
    gestures.start(1, 200, 400); gestures.move(99, 100, 100)
    expect(gestures.flush()).toBe(false)
    gestures.end(1)
    expect(gestures.dragged).toBe(false)
    expect(gestures.active).toBe(false)
  })
  it('takes the short rotation across the ±π boundary', () => {
    const { camera, target, gestures } = setup()
    gestures.start(1, 200, 400); gestures.start(2, 100, 401)
    gestures.move(2, 100, 399); gestures.flush()
    expect(Math.abs(Math.atan2(camera.position.x - target.x, camera.position.z - target.z))).toBeLessThan(0.03)
  })
  it('limits zoom in both directions without changing the ground anchor', () => {
    const { camera, target, gestures } = setup()
    gestures.start(1, 150, 400); gestures.start(2, 250, 400)
    gestures.move(1, -4800, 400); gestures.move(2, 5200, 400); gestures.flush()
    expect(camera.position.distanceTo(target)).toBeCloseTo(40)
    gestures.move(1, 196, 400); gestures.move(2, 204, 400); gestures.flush()
    expect(camera.position.distanceTo(target)).toBeCloseTo(1400)
    expect(target.length()).toBeCloseTo(0)
  })
})
