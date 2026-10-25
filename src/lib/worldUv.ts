import { type BufferGeometry, Float32BufferAttribute, Matrix3, type Matrix4, type MeshStandardMaterial } from 'three'
import { TILE_METERS } from './campusTextures'

/** Faces whose normal is this close to vertical are mapped as floor/ceiling. */
const FLAT = .97
/** Vertex normals of one triangle must agree this closely for it to count as a flat face. */
const PLANAR = .99

/**
 * Rewrites the UVs of a non-indexed geometry so one image tile covers TILE_METERS of surface in world space:
 * floors use (x, -z), as the ground does, and walls and roofs use the metres along their horizontal tangent and
 * their downhill/up direction. Adjacent boxes of one wall therefore share a continuous texture whatever their size
 * or rotation. Triangles on curved surfaces (columns, domes) keep the geometry's own UVs.
 * Returns the geometry it worked on, which is a non-indexed copy when the input was indexed.
 */
export function projectWorldUv(input: BufferGeometry, matrixWorld: Matrix4, tile = TILE_METERS): BufferGeometry {
  const geometry = input.index ? input.toNonIndexed() : input
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal')
  if (!normal) return geometry
  let uv = geometry.getAttribute('uv')
  if (!uv) { uv = new Float32BufferAttribute(new Float32Array(position.count * 2), 2); geometry.setAttribute('uv', uv) }
  const m = new Matrix3().getNormalMatrix(matrixWorld).elements, e = matrixWorld.elements
  const px = [0, 0, 0], py = [0, 0, 0], pz = [0, 0, 0], nx = [0, 0, 0], ny = [0, 0, 0], nz = [0, 0, 0]
  for (let t = 0; t + 2 < position.count; t += 3) {
    let ax = 0, ay = 0, az = 0, ok = true
    for (let k = 0; k < 3; k++) {
      const i = t + k, x = position.getX(i), y = position.getY(i), z = position.getZ(i)
      px[k] = e[0] * x + e[4] * y + e[8] * z + e[12]
      py[k] = e[1] * x + e[5] * y + e[9] * z + e[13]
      pz[k] = e[2] * x + e[6] * y + e[10] * z + e[14]
      const a = normal.getX(i), b = normal.getY(i), c = normal.getZ(i)
      const wx = m[0] * a + m[3] * b + m[6] * c, wy = m[1] * a + m[4] * b + m[7] * c, wz = m[2] * a + m[5] * b + m[8] * c
      const length = Math.hypot(wx, wy, wz)
      if (length < 1e-9) { ok = false; break }
      nx[k] = wx / length; ny[k] = wy / length; nz[k] = wz / length
      ax += nx[k]; ay += ny[k]; az += nz[k]
    }
    if (!ok) continue
    const average = Math.hypot(ax, ay, az)
    if (average < 1e-9) continue
    ax /= average; ay /= average; az /= average
    for (let k = 0; k < 3; k++) if (nx[k] * ax + ny[k] * ay + nz[k] * az < PLANAR) { ok = false; break }
    if (!ok) continue
    if (ay >= FLAT || ay <= -FLAT) {
      for (let k = 0; k < 3; k++) uv.setXY(t + k, px[k] / tile, (ay > 0 ? -pz[k] : pz[k]) / tile)
      continue
    }
    // Horizontal tangent to the viewer's right, then the in-plane direction that climbs the face.
    const tl = Math.hypot(az, ax), tx = az / tl, tz = -ax / tl
    const bx = ay * tz, by = az * tx - ax * tz, bz = -ay * tx
    for (let k = 0; k < 3; k++) uv.setXY(t + k, (px[k] * tx + pz[k] * tz) / tile, (px[k] * bx + py[k] * by + pz[k] * bz) / tile)
  }
  uv.needsUpdate = true
  return geometry
}

/**
 * In-place metric UVs for a BoxGeometry that is not batched (selectable buildings, instanced parts): each face gets
 * its own metres, so a 20 m obelisk or a 6 m door leaf shows the texture at the same scale as a 20 cm trim.
 */
export function boxUv(geometry: BufferGeometry, tile = TILE_METERS) {
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
  for (let i = 0; i < p.count; i++) {
    const side = Math.abs(n.getX(i)) > .5, top = Math.abs(n.getY(i)) > .5
    uv.setXY(i, (side ? p.getZ(i) : p.getX(i)) / tile, (top ? p.getZ(i) : p.getY(i)) / tile)
  }
  uv.needsUpdate = true
}

/** Extrude/Shape UVs come out in metres; this expresses them in tiles. Call once per geometry. */
export function scaleUvToTiles(geometry: BufferGeometry, tile = TILE_METERS) {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile)
  uv.needsUpdate = true
  return geometry
}

const WORLD_UV_GLSL = `
vec2 campusWorldUv( vec3 p, vec3 n ) {
  const float tile = ${(1 / TILE_METERS).toFixed(8)};
  if ( n.y >= ${FLAT} ) return vec2( p.x, -p.z ) * tile;
  if ( n.y <= -${FLAT} ) return vec2( p.x, p.z ) * tile;
  vec3 t = normalize( vec3( n.z, 0.0, -n.x ) );
  vec3 b = cross( n, t );
  return vec2( dot( p, t ), dot( p, b ) ) * tile;
}
`

/**
 * Same projection computed in the vertex shader, for instanced boxes whose size varies per instance (window frames,
 * cornices, timbers), where a UV baked into a shared geometry cannot follow each instance. Needs flat-shaded faces.
 * Returns a clone that shares the original's images; it never changes the material it is given.
 */
export function withWorldUv(source: MeshStandardMaterial): MeshStandardMaterial {
  const material = source.clone()
  material.userData.worldUvShader = true
  material.customProgramCacheKey = () => 'campus-world-uv'
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${WORLD_UV_GLSL}\nvoid main() {`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  {
    vec4 wuvPosition = vec4( transformed, 1.0 );
    vec3 wuvNormal = objectNormal;
    #ifdef USE_INSTANCING
      wuvPosition = instanceMatrix * wuvPosition;
      wuvNormal = mat3( instanceMatrix ) * wuvNormal;
    #endif
    wuvPosition = modelMatrix * wuvPosition;
    wuvNormal = normalize( mat3( modelMatrix ) * wuvNormal );
    vec2 wuv = campusWorldUv( wuvPosition.xyz, wuvNormal );
    #ifdef USE_MAP
      vMapUv = wuv;
    #endif
    #ifdef USE_NORMALMAP
      vNormalMapUv = wuv;
    #endif
    #ifdef USE_ROUGHNESSMAP
      vRoughnessMapUv = wuv;
    #endif
  }`)
  }
  return material
}
