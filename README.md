# USFQ · Explora

Mapa 3D del campus de Cumbayá para una casa abierta. Permite buscar edificios y códigos de aula, consultar las fuentes, trazar rutas exteriores aproximadas y recorrer el campus principal y el puente hacia Hayek en primera persona.

## Ejecutar

```bash
npm ci
npm run dev
npm test
npm run build
```

Para abrirlo desde un celular en la misma red: `npm run dev -- --host 0.0.0.0` y usar la dirección de red que muestra el servidor. El GPS funciona con HTTPS o localhost; no es necesario para la presentación.

## Controles

- Mapa: arrastrar para desplazar, rueda/pellizco para acercar y botón derecho/dos dedos para girar. El botón 2D/3D cambia la perspectiva.
- «Recorrer a pie»: WASD para caminar, flechas arriba/abajo para avanzar/retroceder, izquierda/derecha para girar, arrastrar para mirar y Esc para volver. También hay botones táctiles.
- Buscar M302, G111, DW010, H100F, un edificio o un servicio como Registro.
- «Fuentes y cobertura» muestra las referencias y los límites de los datos.
- «Ver canchas y terrazas» acerca la cámara al sector deportivo. El botón Aa muestra u oculta los nombres, visibles inicialmente en todos los edificios del campus.

## Datos y precisión

El catálogo contiene 36 lugares con geometría de OpenStreetMap y 13 referencias públicas a aulas, oficinas y un laboratorio. Los servicios menores conservan los nombres de OSM. Dos huellas junto a Casa Hannah Arendt permanecen como «Nombre pendiente», sin asignarles un nombre por suposición. Las ubicaciones interiores solo identifican edificio y piso: **no hay planos interiores reales incorporados**. Las publicaciones antiguas se marcan como históricas. Un código válido por su formato no confirma la existencia del aula.

Los detalles arquitectónicos son una interpretación visual de fotografías públicas de la USFQ y de la ilustración del campus compartida por el usuario. No son una reconstrucción arquitectónica medida. Los números de las fichas corresponden al mapa oficial de 2023, cuya leyenda difiere de la imagen antigua.

Las rutas terminan en puntos aproximados de la huella de cada edificio. Los tramos punteados no son senderos confirmados. El modo a pie impide atravesar edificios, agua, rejas del campo sintético y bordes de desniveles; permite usar las gradas y el puente elevado hacia Hayek. Fuera del perímetro principal solo permite el corredor del puente.

La zona deportiva se corrigió según la descripción del estudiante: dos canchas de vóley sobre arena, terraza inferior de césped con mesas y sillas metálicas, dos canchas de tenis azules más abajo, fútbol sintético con reja y fútbol natural a desnivel. Hay accesos por gradas a la izquierda del tenis y del campo natural. Las huellas se conservan, pero las profundidades, mobiliario, accesos y altura del puente son aproximaciones visuales, no un levantamiento topográfico.

La investigación completa y los próximos pasos están en [referencias/INVESTIGACION.md](referencias/INVESTIGACION.md).

## Estructura

| Ruta | Contenido |
|---|---|
| `src/data/campus.json` | Huellas, senderos, calles, jardines, canchas y laguna de OSM |
| `src/data/buildings.ts` | Catálogo de lugares y prefijos de aulas |
| `src/data/references.ts` | Referencias públicas y números del mapa oficial |
| `src/data/plans/` | Planos interiores verificados; el ejemplo del Hall no está registrado |
| `src/lib/search.ts` | Buscador y lectura de códigos con avisos de procedencia |
| `src/lib/outdoor.ts` | Rutas sobre el grafo de senderos |
| `src/lib/walking.ts` | Puntos iniciales y colisiones del recorrido exterior |
| `src/lib/terrain.ts` | Desniveles deportivos, gradas y alturas del puente |
| `src/components/SportsGround.tsx` | Arena, tenis, fútbol, redes y mobiliario |
| `src/components/CampusBridges.tsx` | Tablero, barandillas y soportes del puente a Hayek |
| `src/components/WalkCamera.tsx` | Cámara de primera persona, teclado y mirada |
| `src/components/IllustratedRoof.tsx` | Cubiertas y detalles de los hitos |
| `src/lib/architecture.ts` | Superficies de techos y senderos |
| `src/lib/materials.ts` | Texturas y materiales generados localmente |
| `referencias/` | Investigación, ilustración del usuario y plantilla de levantamiento |

## Incorporar un plano interior

1. Obtener un plano autorizado o medir un edificio en sitio: códigos, pasillos, giros, entradas, escaleras y ascensores por piso.
2. Registrar fuente, fecha y persona que verificó cada nodo/tramo. Usar la plantilla CSV en `referencias/`.
3. Crear un `BuildingPlan` con nodos `x`/`y` en metros este/norte en el sistema local del campus; `toLocal([lon, lat])` convierte coordenadas geográficas.
4. Unir solo tramos caminables comprobados. Los cambios de piso usan nodos de escaleras o ascensor conectados entre pisos.
5. Registrar el plano en `src/data/plans/index.ts` sin `placeholder` tras verificarlo. El Hall de ejemplo se conserva como plantilla, con aulas inventadas explícitas.
6. Ejecutar `npm test` y verificar las rutas en sitio.

`?desde=<id>` fija el origen al abrir el mapa, por ejemplo `/?desde=galileo`. También admite nodos de futuros planos verificados para QRs en sitio.

Para actualizar la base cartográfica: `npm run data`. La descarga depende del servicio Overpass. Los senderos disponibles siguen siendo incompletos, especialmente al norte del campus; actualizar OSM requiere medir los caminos que falten, no dibujar conexiones a través de edificios.

Huellas y senderos: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL. Las fuentes de la USFQ se enlazan para consulta; no se redistribuyen sus planos.

### Apariencia exterior

Los materiales se contrastaron con fotografías públicas de USFQ Next y Noticias USFQ: ladrillo, revoque crema, cubiertas oscuras y metálicas, cúpula dorada y Obelisco blanco con relojes. Las texturas se generan en el navegador, sin descargas de imágenes ni servicios externos. Los senderos reciben sombras y el vidrio y la laguna reflejan un cielo generado localmente.

El volumen exterior, los detalles y la plantación siguen siendo aproximados. Se conservan las huellas y senderos de OpenStreetMap; no se infiere la distribución interior a partir de las fotografías. Las alturas de OSM se usan cuando existen; en los demás edificios se estiman a partir de pisos o proporciones visuales.

Para verificar: `npm test` y `npm run build`. Las pruebas cubren búsqueda, rutas, colisiones, gradas, rejas, alturas del puente y geometría de techos cóncavos, pavimentos y terreno rebajado.
