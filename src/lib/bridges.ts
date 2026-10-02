import { BufferGeometry, Float32BufferAttribute } from 'three'
import polygonClipping from 'polygon-clipping'
import type { CampusWalkway } from './campus'
import type { Vec2 } from '../types'
import { bridgeVertexHeight, segmentProjection } from './terrain'

export function bridgeSections(way: CampusWalkway) {
  const half = Math.max(way.width, 2.8) / 2
  const normals = way.line.slice(1).map((b, i): Vec2 => {
    const a = way.line[i], length = Math.hypot(b[0]-a[0], b[1]-a[1])
    return [-(b[1]-a[1])/length, (b[0]-a[0])/length]
  })
  return way.line.map((point, i) => {
    const before = normals[Math.max(0, i-1)], after = normals[Math.min(i, normals.length-1)]
    const mx = before[0]+after[0], my = before[1]+after[1], divisor = mx*after[0]+my*after[1]
    const scale = half / divisor
    return { left: [point[0]+mx*scale, point[1]+my*scale] as Vec2,
      right: [point[0]-mx*scale, point[1]-my*scale] as Vec2, height: bridgeVertexHeight(way,i) }
  })
}

/** Each bend shares one section; all top, bottom and side faces close at that section. */
export function createBridgeDeckGeometry(way: CampusWalkway) {
  const sections = bridgeSections(way), vertices: number[] = [], uv: number[] = []
  type Point = [number, number, number]
  const at = (p: Vec2, h: number): Point => [p[0], h, -p[1]]
  const quad = (a: Point,b: Point,c: Point,d: Point) => {
    for (const p of [a,b,c,a,c,d]) { vertices.push(...p); uv.push(p[0]/2.4,p[2]/2.4) }
  }
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i-1], b = sections[i]
    const al=at(a.left,a.height), ar=at(a.right,a.height), bl=at(b.left,b.height), br=at(b.right,b.height)
    const abl=at(a.left,a.height-0.32), abr=at(a.right,a.height-0.32), bbl=at(b.left,b.height-0.32), bbr=at(b.right,b.height-0.32)
    quad(al,ar,br,bl); quad(abl,bbl,bbr,abr)
    quad(al,bl,bbl,abl); quad(ar,abr,bbr,br)
    if (i===1) quad(al,abl,abr,ar)
    if (i===sections.length-1) quad(bl,br,bbr,bbl)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3)); geometry.setAttribute('uv',new Float32BufferAttribute(uv,2))
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}

function surfaceHeight(point: Vec2, ways: CampusWalkway[]) {
  let nearest = Infinity, height = 0
  for (const way of ways) for (let i=1;i<way.line.length;i++) {
    const projected = segmentProjection(point,way.line[i-1],way.line[i])
    if (projected.distance < nearest) {
      nearest = projected.distance
      const t = Math.max(0,Math.min(1,projected.t))
      height = bridgeVertexHeight(way,i-1)*(1-t)+bridgeVertexHeight(way,i)*t
    }
  }
  return height
}

export function bridgeJunctions(ways: CampusWalkway[]) {
  const points = new Map<string,{point:Vec2; ways:Set<string>; radius:number; height:number}>()
  for (const way of ways) way.line.forEach((point,i)=>{
    const key=point.join(','), item=points.get(key)??{point,ways:new Set<string>(),radius:0,height:bridgeVertexHeight(way,i)}
    item.ways.add(way.osmId); item.radius=Math.max(item.radius,Math.max(way.width,2.8)/2); points.set(key,item)
  })
  return [...points.values()].filter(item=>item.ways.size>1)
}

/** Unioned perimeter keeps the far rail continuous while opening the side ramp. */
export function bridgeBoundaryRails(ways: CampusWalkway[]) {
  const polygons = ways.map(way => { const sections=bridgeSections(way); return [[...sections.map(s=>s.left),...sections.map(s=>s.right).reverse()]] as polygonClipping.Polygon })
  const patches = bridgeJunctions(ways).map(({point,radius})=>[Array.from({length:16},(_,i):Vec2=>[point[0]+Math.cos(i*Math.PI/8)*radius,point[1]+Math.sin(i*Math.PI/8)*radius])] as polygonClipping.Polygon)
  const outline = polygonClipping.union(polygons[0],...polygons.slice(1),...patches)
  const degree = new Map<string,number>()
  for (const way of ways) for (let i=1;i<way.line.length;i++) for (const p of [way.line[i-1],way.line[i]]) degree.set(p.join(','),(degree.get(p.join(','))??0)+1)
  const terminals = ways.flatMap(way=>[0,way.line.length-1].filter(i=>degree.get(way.line[i].join(','))===1).map(i=>{
    const end=way.line[i], next=way.line[i===0?1:i-1], length=Math.hypot(next[0]-end[0],next[1]-end[1])
    return {end,dir:[(next[0]-end[0])/length,(next[1]-end[1])/length] as Vec2}
  }))
  return outline.flatMap(polygon=>polygon.flatMap(ring=>ring.slice(1).flatMap((b,i)=>{
    const a=ring[i], middle: Vec2=[(a[0]+b[0])/2,(a[1]+b[1])/2]
    if (terminals.some(({end,dir})=> Math.abs((middle[0]-end[0])*dir[0]+(middle[1]-end[1])*dir[1])<0.02 && Math.hypot(middle[0]-end[0],middle[1]-end[1])<2)) return []
    return [{a:a as Vec2,b:b as Vec2,ah:surfaceHeight(a as Vec2,ways),bh:surfaceHeight(b as Vec2,ways)}]
  })))
}
