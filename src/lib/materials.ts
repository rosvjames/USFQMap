import { CanvasTexture, CubeTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

type Surface = 'stucco' | 'brick' | 'tile' | 'metal' | 'grass' | 'paving' | 'water' | 'sand'

/** Locally generated, seamless textures. No third-party photographs/assets are bundled. */
function surfaceTexture(kind: Surface, bump = false): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  let seed = 71
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const pixels = ctx.createImageData(256, 256)
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const noise = random() - 0.5
    const course = Math.floor(y / 16)
    const joint = kind === 'brick' ? y % 16 < 1.5 || (x + course % 2 * 32) % 64 < 1.5
      : kind === 'tile' ? y % 24 < 2 || (x + Math.floor(y / 24) % 2 * 16) % 32 < 1.5
      : kind === 'metal' ? x % 32 < 1.5
      : kind === 'paving' ? x % 64 < 1.5 || y % 64 < 1.5 : false
    const pattern = kind === 'water' ? Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 32) * 2) * 11
      : kind === 'grass' ? Math.sin(x * 1.7 + y * 2.4) * 10 : 0
    const shade = Math.max(0, Math.min(255, (joint ? bump ? 95 : 155 : 230) + noise * (kind === 'grass' ? 65 : 22) + pattern))
    const i = (y * 256 + x) * 4
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade
    pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  if (!bump) texture.colorSpace = SRGBColorSpace
  return texture
}

export function createCampusMaterials() {
  const textures: CanvasTexture[] = []
  function material(kind: Surface, color: string, roughness = 0.9, bumpScale = 0.035, metalness = 0) {
    const map = surfaceTexture(kind), bumpMap = surfaceTexture(kind, true)
    textures.push(map, bumpMap)
    return new MeshStandardMaterial({ color, map, bumpMap, bumpScale, roughness, metalness })
  }
  const materials = {
    stucco: material('stucco', '#d5af94'),
    brick: material('brick', '#b65e43', 0.92, 0.045),
    cream: material('stucco', '#e4ddc8'),
    terracotta: material('tile', '#64504a', 0.92, 0.065),
    metalRoof: material('metal', '#708c7e', 0.65, 0.045, 0.25),
    grass: material('grass', '#718554', 1, 0.025),
    garden: material('grass', '#647d45', 1, 0.025),
    paving: material('paving', '#c1b8a2', 0.95, 0.04),
    road: material('stucco', '#aaa9a0', 1, 0.025),
    sand: material('sand', '#d4bd8b', 1, 0.025),
    tennis: material('stucco', '#286fa8', 0.95, 0.008),
    synthetic: material('grass', '#3b6a48', 0.95, 0.009),
    water: material('water', '#557e63', 0.22, 0.035, 0.35),
  }
  // A static sky/ground reflection gives glass and water depth without remote HDR assets.
  const reflectionFaces = Array.from({ length: 6 }, (_, face) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 128)
    gradient.addColorStop(0, face === 3 ? '#7a7859' : '#8aafc3')
    gradient.addColorStop(0.58, face === 2 ? '#8aafc3' : '#d4dedc')
    gradient.addColorStop(1, face === 2 ? '#a4c2cf' : '#8b8d70')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
    return canvas
  })
  const environment = new CubeTexture(reflectionFaces)
  environment.colorSpace = SRGBColorSpace
  environment.needsUpdate = true
  return { ...materials, environment, dispose: () => { Object.values(materials).forEach((m) => m.dispose()); textures.forEach((t) => t.dispose()); environment.dispose() } }
}

export type CampusMaterials = ReturnType<typeof createCampusMaterials>
