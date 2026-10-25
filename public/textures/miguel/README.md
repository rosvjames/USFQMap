# Miguel de Santiago: materiales de prueba

Texturas originales generadas con la herramienta integrada de GPT Image el 24 de octubre de 2026 para probar el acabado más realista de Miguel de Santiago. Se aplican únicamente a Miguel y a su entrada/plazoleta. No se utiliza la imagen de concepto como fachada ni se cambian las rutas o la forma del edificio.

- `stucco.webp`: estuco beige.
- `roof.webp`: metal verde con juntas longitudinales.
- `terracotta.webp`: estuco terracota de la planta baja.
- `paving.webp`: piedra clara de la plazoleta y gradas.
- `*-bump.webp`: relieve aproximado a partir de luminancia; no son mediciones físicas.
- `reflections.webp`: panorama sintético reutilizado únicamente para el reflejo estático del agua. No representa una captura exacta del campus ni reflejos dinámicos de los objetos de la escena.
- `foliage.webp`: grupo de hojas con transparencia, generado con GPT Image para las copas de los árboles cercanos a Miguel; se conserva el alfa al exportar a WebP.

Los cuatro materiales se extrajeron de cuadrantes iguales de una imagen generada de 1254 × 1254 px, se redujeron a 512 × 512 px y se exportaron a WebP. El panorama se redujo a 1024 × 512 px. Cada repetición de los materiales representa 2,4 m, conservando la escala de las superficies del proyecto. Los mapas de color usan sRGB y los de relieve no tienen conversión de color.

Dirección utilizada para generar los materiales: escaneos perpendiculares, luz uniforme, sin perspectiva, edificios ni sombras; estuco beige de grano fino, metal verde con seis juntas verticales por muestra, estuco terracota y cuadrícula de cuatro por cuatro losas de piedra. Dirección del panorama: proyección equirectangular, cielo diurno, árboles y patio universitario, sin personas ni rótulos.

Los prompts completos y las capturas de comparación se conservan localmente en `output/imagegen/miguel-realismo/` (carpeta de resultados excluida de Git).

La segunda pasada incorpora aberturas reales con jambas de 32 cm, marcos y alféizares separados, cubiertas con planos rectos y paños de vidrio oscuro. La oclusión de aleros, jambas y cornisas se aproxima una sola vez mediante colores de vértice; las sombras de contacto del patio se capturan una vez y se conservan. No es una simulación de iluminación global ni un horneado de luz trazado con rayos. Por petición del usuario se retiraron los reflejos del vidrio y metal, así como el entorno global. El panorama queda reservado al agua. Se conservan la luz ambiental directa y las sombras solares de más resolución en escritorio.

Las copas cercanas usan grupos de ramas y hojas cruzados que se instancian y conservan su volumen al girar la cámara. El resto del campus utiliza las familias compartidas de vegetación de campus-v1. El resultado continúa siendo una visualización aproximada del campus y no es idéntico a la imagen de concepto.

El prompt del follaje y las capturas de la segunda pasada se conservan en `output/revision-miguel-realismo-v2/`.
