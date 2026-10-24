import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace, type Sprite } from 'three'
import { useCollidingLabel } from './LabelCollision'

type Variant = 'plain' | 'tag' | 'pill'

const FONT_SIZE = 44
const FONT = `700 ${FONT_SIZE}px 'Lato', system-ui, sans-serif`
const TAIL = 12
// Building names are white balloons pointing down at their building; the selected one turns red.
const STYLES: Record<Variant, { color: string; background?: string; halo?: string; tail?: boolean }> = {
  plain: { color: '#231f20', background: 'rgba(255, 255, 255, 0.96)', tail: true },
  tag: { color: '#1a1a1a', background: 'rgba(255, 255, 255, 0.92)' },
  pill: { color: '#ffffff', background: '#e11b22', tail: true },
}

function drawLabel(text: string, variant: Variant) {
  const style = STYLES[variant]
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = FONT
  const paddingX = style.background ? 22 : 10
  const shadow = style.tail ? 6 : 0
  const boxHeight = FONT_SIZE + 28
  canvas.width = Math.ceil(context.measureText(text).width) + paddingX * 2 + shadow * 2
  canvas.height = boxHeight + (style.tail ? TAIL : 0) + shadow * 2

  // Resizing the canvas resets its state, so the font is set again.
  context.font = FONT
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  if (style.background) {
    const width = canvas.width - shadow * 2
    context.save()
    context.translate(shadow, shadow)
    context.shadowColor = 'rgba(35, 31, 32, 0.22)'
    context.shadowBlur = shadow
    context.shadowOffsetY = shadow / 3
    context.fillStyle = style.background
    context.beginPath()
    context.roundRect(0, 0, width, boxHeight, style.tail ? 18 : 14)
    if (style.tail) {
      context.moveTo(width / 2 - TAIL, boxHeight - 1)
      context.lineTo(width / 2, boxHeight + TAIL)
      context.lineTo(width / 2 + TAIL, boxHeight - 1)
    }
    context.fill()
    context.restore()
  }
  if (style.halo) {
    context.lineWidth = 9
    context.lineJoin = 'round'
    context.strokeStyle = style.halo
    context.strokeText(text, canvas.width / 2, shadow + boxHeight / 2 + 2)
  }
  context.fillStyle = style.color
  context.fillText(text, canvas.width / 2, shadow + boxHeight / 2 + 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { texture, aspect: canvas.width / canvas.height }
}

/**
 * Text that always faces the camera, keeps the same size on screen and is never hidden by buildings.
 * With a priority, it joins the surrounding LabelCollision and hides whenever a more important label needs its spot.
 */
export function MapLabel({ text, position, variant = 'plain', depthTest = false, priority }: { text: string; position: [number, number, number]; variant?: Variant; depthTest?: boolean; priority?: number }) {
  const sprite = useRef<Sprite>(null)
  useCollidingLabel(sprite, priority)
  // Canvas text falls back to a system font until the web font has loaded, so labels are redrawn then.
  const [fontReady, setFontReady] = useState(() => document.fonts.check(FONT))
  useEffect(() => {
    if (fontReady) return
    let mounted = true
    document.fonts.load(FONT).then(() => mounted && setFontReady(true))
    return () => {
      mounted = false
    }
  }, [fontReady])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- fontReady is a redraw trigger
  const { texture, aspect } = useMemo(() => drawLabel(text, variant), [text, variant, fontReady])
  useEffect(() => () => texture.dispose(), [texture])

  // With sizeAttenuation off, the scale is a fraction of the view rather than meters.
  const height = variant === 'tag' ? 0.025 : 0.031
  return (
    <sprite ref={sprite} position={position} scale={[height * aspect, height, 1]} renderOrder={10} raycast={() => null}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={depthTest} transparent />
    </sprite>
  )
}
