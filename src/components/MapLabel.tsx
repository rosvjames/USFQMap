import { useEffect, useMemo, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

type Variant = 'plain' | 'tag' | 'pill'

const FONT_SIZE = 44
const FONT = `600 ${FONT_SIZE}px 'Barlow Semi Condensed', system-ui, sans-serif`
const STYLES: Record<Variant, { color: string; background?: string; halo?: string }> = {
  plain: { color: '#3a3330', halo: '#ffffff' },
  tag: { color: '#1a1a1a', background: 'rgba(255, 255, 255, 0.92)' },
  pill: { color: '#ffffff', background: '#c8102e' },
}

function drawLabel(text: string, variant: Variant) {
  const style = STYLES[variant]
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = FONT
  const paddingX = style.background ? 22 : 10
  canvas.width = Math.ceil(context.measureText(text).width) + paddingX * 2
  canvas.height = FONT_SIZE + 28

  // Resizing the canvas resets its state, so the font is set again.
  context.font = FONT
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  if (style.background) {
    context.fillStyle = style.background
    context.beginPath()
    context.roundRect(0, 0, canvas.width, canvas.height, variant === 'pill' ? canvas.height / 2 : 14)
    context.fill()
  }
  if (style.halo) {
    context.lineWidth = 9
    context.lineJoin = 'round'
    context.strokeStyle = style.halo
    context.strokeText(text, canvas.width / 2, canvas.height / 2 + 2)
  }
  context.fillStyle = style.color
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { texture, aspect: canvas.width / canvas.height }
}

/** Text that always faces the camera, keeps the same size on screen and is never hidden by buildings. */
export function MapLabel({ text, position, variant = 'plain', depthTest = false }: { text: string; position: [number, number, number]; variant?: Variant; depthTest?: boolean }) {
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
  const height = variant === 'plain' ? 0.021 : 0.025
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10} raycast={() => null}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={depthTest} transparent />
    </sprite>
  )
}
