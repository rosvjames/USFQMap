import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Sprite } from 'three'

interface ManagedLabel {
  sprite: RefObject<Sprite | null>
  priority: number
}

// Breathing room between two labels on screen, in pixels.
const GAP = 6
const LabelRegistry = createContext<Set<ManagedLabel> | null>(null)
const projected = new Vector3()

/**
 * Shows only the labels that fit, like a map app: every frame the labels are placed on screen
 * from the most to the least important, and any label that would cover one already placed is hidden.
 */
export function LabelCollision({ children }: { children: ReactNode }) {
  const [labels] = useState(() => new Set<ManagedLabel>())

  useFrame(({ camera, size }) => {
    // Labels ignore distance, so their height on screen is scale × focal length, in half-viewport units.
    const toPixels = camera.projectionMatrix.elements[5] * size.height / 2
    const placed: { left: number; right: number; top: number; bottom: number }[] = []
    for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
      const sprite = label.sprite.current
      if (!sprite) continue
      sprite.getWorldPosition(projected).project(camera)
      if (projected.z > 1 || Math.abs(projected.x) > 1.2 || Math.abs(projected.y) > 1.2) {
        sprite.visible = false
        continue
      }
      const x = (projected.x + 1) / 2 * size.width
      const y = (1 - projected.y) / 2 * size.height
      const halfWidth = sprite.scale.x * toPixels / 2 + GAP
      const halfHeight = sprite.scale.y * toPixels / 2 + GAP
      const box = { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight }
      const covered = placed.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)
      sprite.visible = !covered
      if (!covered) placed.push(box)
    }
  })

  return <LabelRegistry.Provider value={labels}>{children}</LabelRegistry.Provider>
}

/** Hands a label to the nearest LabelCollision; higher priorities win when two labels overlap. */
export function useCollidingLabel(sprite: RefObject<Sprite | null>, priority: number | undefined) {
  const labels = useContext(LabelRegistry)
  useEffect(() => {
    if (!labels || priority === undefined) return
    const label = { sprite, priority }
    labels.add(label)
    return () => { labels.delete(label) }
  }, [labels, sprite, priority])
}
