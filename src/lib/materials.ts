import { CanvasTexture, CubeTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

type Surface = 'stucco' | 'brick' | 'tile' | 'metal' | 'grass' | 'paving' | 'water' | 'sand' | 'stone' | 'wood'

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
      : kind === 'paving' ? x % 64 < 1.5 || y % 64 < 1.5
      : kind === 'stone' ? y % 32 < 1.5 || (x + Math.floor(y / 32) % 2 * 32) % 64 < 1.5 : false
    const pattern = kind === 'wood' ? Math.sin(x * 0.48 + Math.sin(y * 0.07) * 3 + Math.sin(y * 0.019) * 4) * 17 + Math.sin(x * 2.2 + Math.sin(y * 0.09)) * 5
      : kind === 'water' ? Math.sin(x * Math.PI / 16 + Math.sin(y * Math.PI / 32) * 2) * 3
      : kind === 'sand' ? Math.sin(x*.5+Math.sin(y*.13)*3)*9+Math.sin(y*.8+x*.23)*5
      : kind === 'grass' ? Math.sin(x * 1.7 + y * 2.4) * 10
      : kind === 'stone' ? Math.sin(Math.floor(x / 32) * 21 + Math.floor(y / 32) * 17) * 18 : 0
    const shade = Math.max(0, Math.min(255, (joint ? bump ? 95 : kind === 'stone' ? 210 : 155 : 230) + noise * (kind === 'grass' ? 65 : kind === 'sand' ? 48 : 22) + pattern))
    const i = (y * 256 + x) * 4
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade
    pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  if (kind === 'sand') {
    // Shallow scuffs and footprints in the sand, at the scale of the UV tile.
    for(let i=0;i<18;i++) {
      const x=random()*256,y=random()*256
      ctx.save();ctx.translate(x,y);ctx.rotate(random()*Math.PI)
      ctx.fillStyle=bump?'#9f9f9f':'#bdbdbd';ctx.beginPath();ctx.ellipse(0,0,4,10,0,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#ededed';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(.5,.5,5,11,0,.2,Math.PI*1.2);ctx.stroke();ctx.restore()
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  if (!bump) texture.colorSpace = SRGBColorSpace
  return texture
}

export function createCampusMaterials() {
  const textures: CanvasTexture[] = []
  const surfaces = new Map<Surface, { map: CanvasTexture; bumpMap: CanvasTexture }>()
  function material(kind: Surface, color: string, roughness = 0.9, bumpScale = 0.035, metalness = 0) {
    let surface = surfaces.get(kind)
    if (!surface) {
      surface = { map: surfaceTexture(kind), bumpMap: surfaceTexture(kind, true) }
      surfaces.set(kind, surface); textures.push(surface.map, surface.bumpMap)
    }
    const { map, bumpMap } = surface
    return new MeshStandardMaterial({ color, map, bumpMap, bumpScale, roughness, metalness })
  }
  const grass = material('grass', '#718554', 1, 0.025)
  const paving = material('paving', '#c1b8a2', 0.95, 0.025)
  grass.userData.groundSurface = paving.userData.groundSurface = true
  const materials = {
    pagodaWood: material('wood', '#ac7841', 0.83, 0.024),
    pagodaRoof: material('tile', '#504b43', 0.95, 0.055),
    pondRock: material('stone', '#767569', 0.98, 0.04),
    pondWater: material('water', '#527e70', 0.22, 0.008, 0.25),
    stucco: material('stucco', '#d5af94'),
    casitaWhite: material('stucco', '#f0ece0'),
    daVinciYellow: material('stucco', '#e5b55f'),
    miguelCream: material('stucco', '#dccaaa'),
    brick: material('brick', '#b65e43', 0.92, 0.045),
    hayekBrick: material('brick', '#ac8964', 0.96, 0.05),
    hayekStone: material('brick', '#aaa99b', 0.96, 0.012),
    cream: material('stucco', '#e4ddc8'),
    epicuroStone: material('stucco', '#b6b09c', 0.96, 0.025),
    academicOrange: material('stucco', '#db7842', 0.95, 0.025),
    coliseoOrange: material('stucco', '#c85e35', .95, .025),
    coliseoLane: material('paving', '#73766e', .98, .025),
    hallRed: material('stucco', '#c3654f', 0.95, 0.025),
    entranceStone: material('stone', '#b8b6a8', 0.95, 0.025),
    redStone: material('stone', '#aa705a', 0.95, 0.025),
    terracotta: material('tile', '#64504a', 0.92, 0.065),
    redTileRoof: material('tile', '#b78368', 0.95, 0.055),
    tealRoof: material('metal', '#8bafa3', 0.77, 0.035, 0.15),
    concreteRoof: material('stone', '#d6d0bd', 0.96, 0.018),
    roofGlass: new MeshStandardMaterial({ color: '#8aafab', roughness: 0.28, metalness: 0.35, transparent: true, opacity: 0.88 }),
    metalRoof: material('metal', '#708c7e', 0.65, 0.045, 0.25),
    grass,
    garden: grass,
    paving,
    lakePaving: paving,
    road: material('stucco', '#aaa9a0', 1, 0.025),
    sand: material('sand', '#cec0a0', 1, 0.09),
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
  return { ...materials, environment, dispose: () => { new Set(Object.values(materials)).forEach((m) => m.dispose()); textures.forEach((t) => t.dispose()); environment.dispose() } }
}

export type CampusMaterials = ReturnType<typeof createCampusMaterials>
