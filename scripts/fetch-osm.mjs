// Downloads the campus map from OpenStreetMap and writes src/data/campus.json.
// Run with `npm run data` after editing the map on openstreetmap.org.

import { writeFile } from 'node:fs/promises'

// south, west, north, east: the campus plus a block of surrounding city for context.
const BBOX = '-0.2010,-78.4385,-0.1945,-78.4328'
const WALKABLE = /^(footway|path|pedestrian|steps|service)$/

const query = `[out:json][timeout:60];
(
  way["building"](${BBOX});
  relation["building"](${BBOX});
  way["highway"](${BBOX});
  way["leisure"~"pitch|park|garden|track"](${BBOX});
  way["landuse"~"grass|meadow|recreation_ground|forest|village_green"](${BBOX});
  way["natural"~"water|wood|scrub|grassland"](${BBOX});
  way["amenity"="university"](${BBOX});
  node["natural"="tree"](${BBOX});
);
out geom;`

function layerOf(tags) {
  if (tags.building) return 'building'
  if (tags.highway) return WALKABLE.test(tags.highway) ? 'path' : 'road'
  if (tags.amenity === 'university') return 'campus'
  if (tags.natural === 'water') return 'water'
  if (tags.natural === 'tree') return 'tree'
  if (tags.leisure === 'pitch' || tags.leisure === 'track') return 'pitch'
  return 'green'
}

const coords = (geometry) => geometry.map((p) => [p.lon, p.lat])

/** Multipolygon outlines arrive as loose segments; join them end to end into one closed ring. */
function stitch(segments) {
  const ring = [...segments[0]]
  const rest = segments.slice(1)
  while (rest.length > 0) {
    const tail = ring[ring.length - 1].join()
    const index = rest.findIndex((s) => s[0].join() === tail || s[s.length - 1].join() === tail)
    if (index < 0) return null
    const [segment] = rest.splice(index, 1)
    ring.push(...(segment[0].join() === tail ? segment : segment.reverse()).slice(1))
  }
  return ring
}

function toFeature(element) {
  const tags = element.tags ?? {}
  const layer = layerOf(tags)
  const properties = { ...tags, layer, osm_id: `${element.type}/${element.id}` }
  if (element.type === 'node') {
    return { type: 'Feature', properties, geometry: { type: 'Point', coordinates: [element.lon, element.lat] } }
  }
  if (element.type === 'relation') {
    const ring = stitch(element.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => coords(m.geometry)))
    return ring && { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [ring] } }
  }
  const line = coords(element.geometry)
  const isLine = layer === 'path' || layer === 'road'
  return {
    type: 'Feature',
    properties,
    geometry: isLine ? { type: 'LineString', coordinates: line } : { type: 'Polygon', coordinates: [line] },
  }
}

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': 'usfq-campus-nav (student project)', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ data: query }),
})
if (!response.ok) throw new Error(`Overpass respondió ${response.status}`)

const { elements } = await response.json()
const features = elements.map(toFeature).filter(Boolean)
await writeFile(new URL('../src/data/campus.json', import.meta.url), JSON.stringify({ type: 'FeatureCollection', features }))

const counts = {}
for (const f of features) counts[f.properties.layer] = (counts[f.properties.layer] ?? 0) + 1
console.log(`${features.length} elementos`, counts)
