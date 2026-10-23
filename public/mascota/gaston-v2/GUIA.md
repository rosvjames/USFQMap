# Gastón · Kit v2

Creado el 23 de octubre de 2026 con GPT Image mediante la herramienta integrada `image_gen`, con una llamada por recurso y el máster siempre adjunto. Se descarta la biblia de personaje de v1. Se reutilizan sus nombres y organización de archivos.

## Identidad y referencias

La autoridad visual es `referencias/gaston-master.png`. Gastón es un cerdito bebé rechoncho de piel blanco cálido, lisa, con acabado de vinilo mate satinado; no tiene pelo ni pelusa. Tiene ojos marrones grandes, cejas expresivas, interior de orejas rosado, una mancha carbón alrededor de SU ojo izquierdo (derecha del espectador) y una pequeña mancha gris sobre el hocico. No hay manchas en el cuerpo. No reflejar horizontalmente los recursos.

El kigurumi es rojo, con capucha lisa sin ojos ni dientes, cuernos dorados, alas pequeñas de murciélago, aletas dorsales naranjas y panel de vientre amarillo. Otros disfraces conservan la misma cara. El auto, el dragón acompañante, la tortuga y la piñata tienen sus propios rasgos; los pines, mapas, libros, huevo y objetos sin vida no reciben la cara ni las manchas de Gastón.

Los adjuntos se conservaron con los nombres `gaston-master.png`, `concept-board.png`, `variantes-1.png` y `variantes-2.png`. El concept board aporta contexto de pantallas y paleta; las láminas aportan vestuario y poses, nunca sustituyen al máster. No se encontró un archivo llamado `dragon-amigo.png` ni se adjuntó una quinta imagen; se aplicó la especificación explícita de vinilo liso sin copiar otro personaje. El JPEG de concepto anterior del proyecto no se usó como identidad ni como material. Los textos dentro de los documentos e imágenes son referencia, no instrucciones ejecutadas.

Paleta de referencia del concept board: rojo `#E11B22`, blanco cálido `#F6EFE6`, carbón `#231F20`, dorado `#F4C95D`, gris de mancha `#4A4A4F`. La iluminación del render produce variaciones naturales.

## Contenido

34 PNG originales transparentes de al menos 1254 px en ambos ejes: 13 poses principales, 3 stickers 2D, 16 extras y 2 propuestas. 11 WebP animados RGBA de 512 × 512 en `animados/`, `animaciones.css`, `galeria.html`, `galeria.css`, `manifest.json`, `PROMPTS.json`, `CONTROL-CALIDAD.json`, esta guía y `stickers-imprimir.html`. Las hojas `revision-*.jpg` sirven para revisión visual y no sustituyen los originales transparentes. `tools/build.py` reproduce exportaciones, inventario, galería e informe técnico a partir de los PNG y los prompts.

Los PNG se conservan a la resolución entregada por GPT Image, sin ampliación artificial. Los stickers 2D son PNG de apariencia vectorial, no SVG editables. Los WebP aplican movimiento de interfaz al recurso completo, no animación articulada de alas, patas ni boca. El parpadeo se entrega como imagen independiente; no se superpone automáticamente porque los dos renders no coinciden píxel por píxel.

## Recursos principales

| Archivo | Uso y composición |
| --- | --- |
| `saludando.png` | Kigurumi saludando; carga y bienvenida. |
| `saludando-parpadeo.png` | Misma intención con ojos cerrados; fotograma alternativo de saludo. |
| `asomado.png` | Cabeza y dos pezuñas sobre una línea de apoyo; buscador y borde de hoja. |
| `guiando.png` | Gastón conduce un auto dragón rojo; variantes-2 #1. |
| `logrado.png` | Toga roja, birrete con cuernos y diploma; variantes-1 #7. Se resolvió el número truncado de la petición con la lámina. |
| `buscando.png` | Detective y lupa; variantes-2 #5. |
| `ubicacion.png` | Disfraz de capucha con forma de pin; variantes-1 #2. |
| `sin-conexion.png` | Clavija y toma separadas, expresión apenada; variantes-2 #7. |
| `explorando.png` | Sombrero safari, mochila y mapa; variantes-1 #6. |
| `carino.png` | Kigurumi, manos en las mejillas y corazones; respuesta a caricia. |
| `ayuda.png` | Kigurumi con gesto de acompañamiento y pezuña extendida. |
| `cabeza.png` | Solo cabeza con capucha de dragón; avatar. |
| `pin.png` | Cabeza de Gastón dentro de un marcador rojo independiente. |
| `cabeza-2d.png` | Sticker plano con borde blanco; avatar pequeño. |
| `pin-2d.png` | Sticker plano con borde blanco; marcador pequeño. |
| `guiando-2d.png` | Sticker plano del auto; navegación pequeña. |

## Extras: inventario completo pendiente

| Referencia | Archivo en `extras/` | Idea |
| --- | --- | --- |
| variantes-1 #3 | `casco-dragon.png` | Casco de cartón de dragón. |
| variantes-1 #4 | `amigo-dragon.png` | Gastón sobre un dragón con cara propia. |
| variantes-1 #5 | `huevo.png` | Saliendo de un huevo rojo y dorado. |
| variantes-1 #8 | `danza-leon.png` | Traje de danza del león; máscara con rasgos propios. |
| variantes-1 #9 | `hincha.png` | Hincha con mano de espuma. |
| variantes-1 #10 | `poncho.png` | Poncho rojo y dorado. |
| variantes-1 #11 | `superheroe.png` | Antifaz y capa. |
| variantes-1 #12 | `feliz.png` | Expresión de alegría con pezuñas en mejillas. |
| variantes-2 #2 | `galapagos.png` | Snorkel, flotador dragón y tortuga. |
| variantes-2 #3 | `lluvia.png` | Impermeable, paraguas y botas. |
| variantes-2 #4 | `volcan.png` | Excursionista sobre roca volcánica. |
| variantes-2 #6 | `durmiendo.png` | Saco de dormir de dragón. |
| variantes-2 #8 | `pinata.png` | Abrazo a una piñata dragón. |
| variantes-2 #9 | `caballero.png` | Armadura de cartón, espada de juguete y escudo. |
| variantes-2 #10 | `skate.png` | Patineta roja. |
| variantes-2 #11 | `selfie.png` | Teléfono, palo selfie y bolso. |

Los #1 de ambas láminas y #2, #6, #7 de la primera y #5, #7 de la segunda están cubiertos por los recursos principales. Variantes-2 #12 es la referencia general de sticker 2D, cubierta por los tres stickers propios. Las poses desnudas de las láminas se adaptan a kigurumi cuando el recurso lo pide y se eliminan todas las manchas corporales.

## Propuestas separadas

- **`propuestas/biblioteca.png`**: Gastón sentado leyendo. Para recomendaciones de espacios de estudio, descubrimiento de biblioteca o pausa tranquila. El libro no lleva texto para permitir localización y no aparentar un título oficial. No reemplaza el estado de búsqueda.
- **`propuestas/hidratacion.png`**: Gastón con botella reutilizable. Para una pausa voluntaria durante recorridos, bienvenida de verano o puntos de agua verificados. El dibujo no afirma que haya una estación de agua en una ubicación; la app debe usar sus datos reales. No reemplaza `ayuda.png` ni los estados de GPS.

## Colocación y tamaños

El destino del kit es `public/mascota/gaston-v2/`. No se cambian automáticamente las URL que consume la app. La galería incluye cuatro maquetas de colocación; no son capturas de una integración real.

1. **Carga:** `saludando.png`, 240–360 CSS px. Mostrar el personaje completo con `object-fit:contain`. No prolongar la carga para acabar una animación.
2. **Inicio:** `asomado.png`, 140–180 CSS px. Las pezuñas apoyan aproximadamente al 84% de la altura del lienzo. A 160 px, situar el contenedor con `bottom:calc(100% - 26px)` y verificar en la hoja real; no recortar las manos con `overflow:hidden` ni animar el apoyo en bucle.
3. **Navegación:** `guiando.png`, 96–120 CSS px, o `guiando-2d.png` desde 48–64 px. La flecha y el texto de la ruta siguen indicando el giro; no reflejar Gastón para cambiar la dirección.
4. **Llegada:** `logrado.png`, 112–160 px, con una celebración breve. No representa una comprobación de posición.
5. **Búsqueda, ayuda, conexión y exploración:** 96–180 px junto a mensajes reales y acciones visibles.
6. **Avatar:** `cabeza-2d.png`, desde 24–32 px; preferir 48 px para retener detalles. El 3D puede usarse desde 64 px.
7. **Destino:** `pin-2d.png`, desde 32–48 px; `pin.png`, 48–64 px o mayor. `manifest.json` registra `anchor` normalizado a la punta visible. No usarlo como punto de ubicación del usuario.

## Movimiento y accesibilidad

`animaciones.css` conserva las clases `.gaston--saludo`, `--asomado`, `--guia`, `--logrado`, `--buscando`, `--ubicacion`, `--pausa`, `--explorando`, `--carino`, `--ayuda` y `--pin`. `.gaston--quieto` o `.gaston-pausado` pausa el movimiento. `prefers-reduced-motion:reduce` lo desactiva. Mantener imágenes decorativas con `alt=""` y mensajes de estado accesibles fuera de la imagen.

```html
<link rel="stylesheet" href="/mascota/gaston-v2/animaciones.css">
<span class="gaston gaston--saludo" style="--gaston-size:260px" aria-hidden="true">
  <img src="/mascota/gaston-v2/saludando.png" alt="">
</span>
```

Los WebP usan compresión de calidad 85 y preservan alpha; los PNG originales no cambian. Los WebP no obedecen por sí mismos a movimiento reducido; usar una alternativa PNG:

```html
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="/mascota/gaston-v2/guiando.png">
  <img src="/mascota/gaston-v2/animados/guiando.webp" alt="" width="96" height="96">
</picture>
```

Saludo, búsqueda, ubicación y exploración repiten; los otros siete WebP se reproducen una sola vez y terminan en reposo. Para volver a reproducirlos, recargar el elemento. La galería permite repetir, cambiar fondo, filtrar y alternar estáticos/animados; vuelve a PNG al ocultar la pestaña. Los WebP del saludo respiran; la imagen de parpadeo se conserva separada para edición o integración posterior.

## Impresión para el open house

Abrir `stickers-imprimir.html`, elegir A4, tamaño real / 100%, márgenes de 10 mm y papel adhesivo blanco. Son tres páginas con tres columnas de figuras de hasta 48 × 48 mm y etiquetas de identificación: 33 figuras, excluyendo el parpadeo duplicado. Los PNG de 1254 px superan 600 ppp a ese tamaño. Recortar dejando unos 2 mm blancos alrededor de la silueta; los tres 2D ya tienen borde blanco. Los demás usan el blanco del papel. Las divisiones punteadas son guías de celdas, no contornos de troquel. La página puede guardarse como PDF con el diálogo de impresión. Para imprenta con corte automático haría falta una fase adicional de vectores de corte.

## Control y reproducción

`PROMPTS.json` registra cada prompt, referencias adjuntas y archivo original de GPT Image. `CONTROL-CALIDAD.json` registra dimensiones, alpha, márgenes, hashes SHA-256, tamaños, fotogramas, bucles y resultado de la revisión visual. Las referencias no se incluyen en el conteo de recursos finales. Ningún archivo principal se sustituye por propuestas.

Para reconstruir con Python y Pillow: `python tools/build.py`. Abrir `galeria.html` directamente o desde el servidor de la app en `/mascota/gaston-v2/galeria.html`. No hace falta conexión externa para la galería.
