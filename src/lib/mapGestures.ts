import { MathUtils, PerspectiveCamera, Plane, Raycaster, Spherical, Vector2, Vector3 } from 'three'

type Point = { x: number; y: number }
type Bounds = { left: number; top: number; width: number; height: number }
type Limits = { minDistance: number; maxDistance: number; panLimit: number }

/** Accumulates pointer positions and applies one camera update per rendered frame. */
export class MapGestureController {
  private points = new Map<number, Point>()
  private previous: Point[] = []
  private starts = new Map<number, Point>()
  private pending = false
  private ray = new Raycaster()
  private plane = new Plane(new Vector3(0, 1, 0))
  dragged = false

  constructor(private camera: PerspectiveCamera, private target: Vector3, private bounds: () => Bounds, private limits: Limits) {}
  get active() { return this.points.size > 0 }
  get count() { return this.points.size }
  has(id: number) { return this.points.has(id) }

  start(id: number, x: number, y: number) {
    this.flush()
    if (!this.active) this.dragged = false
    const point = { x, y }
    this.points.set(id, point); this.starts.set(id, point)
    if (this.count > 1) this.dragged = true
    this.rebase()
  }
  move(id: number, x: number, y: number) {
    if (!this.points.has(id)) return
    const start = this.starts.get(id)!
    if (Math.hypot(x - start.x, y - start.y) > 6) this.dragged = true
    this.points.set(id, { x, y }); this.pending = true
  }
  end(id: number) {
    this.flush(); this.points.delete(id); this.starts.delete(id); this.rebase()
  }
  cancel() { this.points.clear(); this.starts.clear(); this.rebase() }
  private rebase() { this.previous = [...this.points.values()]; this.pending = false }

  private ground(point: Point) {
    const bounds = this.bounds()
    if (!bounds.width || !bounds.height) return null
    this.camera.updateMatrixWorld()
    this.ray.setFromCamera(new Vector2((point.x - bounds.left) / bounds.width * 2 - 1, 1 - (point.y - bounds.top) / bounds.height * 2), this.camera)
    this.plane.constant = -this.target.y
    return this.ray.ray.intersectPlane(this.plane, new Vector3())
  }
  flush(): boolean {
    if (!this.pending || this.count === 0 || this.count > 2) return false
    const next = [...this.points.values()], prev = this.previous
    this.pending = false
    if (prev.length !== next.length) { this.rebase(); return false }
    const center = (points: Point[]): Point => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length })
    const before = center(prev), after = center(next), anchor = this.ground(before)
    if (next.length === 2) {
      const oldX = prev[1].x - prev[0].x, oldY = prev[1].y - prev[0].y
      const newX = next[1].x - next[0].x, newY = next[1].y - next[0].y
      const oldLength = Math.hypot(oldX, oldY), newLength = Math.hypot(newX, newY)
      // Coincident fingers have no meaningful angle or zoom ratio; rebase and wait.
      if (oldLength >= 8 && newLength >= 8) {
        const view = new Spherical().setFromVector3(this.camera.position.clone().sub(this.target))
        const angle = Math.atan2(newY, newX) - Math.atan2(oldY, oldX)
        view.theta += Math.atan2(Math.sin(angle), Math.cos(angle))
        view.radius = MathUtils.clamp(view.radius * oldLength / newLength, this.limits.minDistance, this.limits.maxDistance)
        this.camera.position.copy(this.target).add(new Vector3().setFromSpherical(view))
        this.camera.lookAt(this.target)
      }
    }
    // Keep the same ground point under the fingers throughout pan, pinch and twist.
    const destination = this.ground(after)
    if (anchor && destination) {
      const shift = anchor.sub(destination)
      shift.set(MathUtils.clamp(this.target.x + shift.x, -this.limits.panLimit, this.limits.panLimit) - this.target.x, 0,
        MathUtils.clamp(this.target.z + shift.z, -this.limits.panLimit, this.limits.panLimit) - this.target.z)
      this.target.add(shift); this.camera.position.add(shift)
    }
    this.camera.lookAt(this.target); this.camera.updateMatrixWorld()
    this.previous = next
    return true
  }
}
