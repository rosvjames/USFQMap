# USFQ · Encuentra tu aula

Web app móvil para ubicar aulas en el campus Cumbayá de la USFQ: buscador, mapa 3D del campus y rutas dentro de los edificios con cambios de piso.

## Uso

```bash
npm install
npm run dev     # servidor local (también accesible desde el celular en la misma red)
npm test        # pruebas de rutas, búsqueda y validez de los planos
npm run build   # verificación de tipos + build de producción en dist/
```

## Estructura

| Ruta | Contenido |
|---|---|
| `src/data/campus.json` | Mapa del campus: edificios, senderos, calles, áreas verdes, canchas y laguna. Lo genera `npm run data` desde OpenStreetMap |
| `src/data/buildings.ts` | Catálogo de edificios: nombre, prefijo de aulas, id de OpenStreetMap |
| `src/data/plans/` | Un archivo por edificio con su grafo interior (nodos y aristas) |
| `src/lib/pathfinding.ts` | A* sobre el grafo interior e instrucciones en texto |
| `src/lib/outdoor.ts` | Rutas a pie entre edificios sobre los senderos del campus |
| `src/lib/useGeolocation.ts` | Posición del usuario por GPS como punto de partida |
| `src/lib/search.ts` | Buscador y lectura de códigos de aula (M302 = Maxwell, piso 3) |
| `src/components/CampusScene.tsx` | Escena 3D (react-three-fiber) |
| `referencias/` | Mapas oficiales y datos originales |

## Levantar un edificio

El plano del Hall Principal (`src/data/plans/hallPrincipal.ts`) es de ejemplo: las aulas, pasillos y escaleras están inventados.

1. Recorre el edificio y anota, por piso: aulas (con su código), puntos de pasillo donde hay giros o cruces, escaleras, ascensores y entradas.
2. Cada punto es un nodo con `x`/`y` en metros (este/norte) en el mismo sistema del mapa del campus. `toLocal([lon, lat])` en `src/lib/geo.ts` convierte coordenadas tomadas de un mapa.
3. Une los nodos caminables con aristas. Las escaleras son dos nodos (uno por piso) unidos por una arista.
4. Quita `placeholder: true` y registra el plan en `src/data/plans/index.ts`.
5. `npm test` comprueba que todos los nodos caen dentro de la huella del edificio y que todos son alcanzables.

## Punto de partida

El usuario elige desde dónde sale en el panel: un edificio o su ubicación por GPS. El navegador solo entrega el GPS en HTTPS o en `localhost`, así que en el celular hace falta la versión desplegada (no la IP local).

`?desde=<id>` fija el origen al abrir la app, con el id de un edificio (`/?desde=galileo`) o de un nodo interior (`/?desde=hp-1-esc`). Cada QR pegado en el campus apunta a la URL del lugar donde está colocado.

## Senderos

Las rutas exteriores siguen los senderos de OpenStreetMap, que cubren bien la mitad sur del campus pero casi nada del sector norte (Maxwell, Darwin, Da Vinci, Cicerón, Epicuro). Donde no hay sendero, la ruta se completa con una línea recta punteada y la app lo avisa. Para corregirlo hay que mapear los caminos que faltan en openstreetmap.org y volver a descargar con `npm run data`.

## Datos

Huellas y senderos: © colaboradores de OpenStreetMap, licencia ODbL.
