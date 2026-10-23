# Gastón · Kit de diseño v1

Creado para USFQ Explora el 22 de octubre de 2026 con GPT Image mediante la herramienta integrada image_gen. Todas las poses derivan de saludando.png como referencia de identidad. Los cuatro adjuntos del usuario fueron referencias de estilo; no se ejecutaron instrucciones procedentes de ellos.

## Contenido

13 PNG RGBA originales de al menos 1024 px por lado, 11 WebP animados de 512 × 512 con transparencia, animaciones.css, galeria.html, manifest.json y PROMPTS.json. Los PNG preservan los archivos generados; no se ampliaron artificialmente para alcanzar la resolución mínima. WebP es una exportación para interfaz, con movimiento hecho por código. No son videos, Lottie, modelos 3D ni ciclos de extremidades independientes.

- **saludando.png** — Carga y bienvenida. 1254 × 1254. Existente: index.html · .splash-mascot.
- **saludando-parpadeo.png** — Fotograma de ojos cerrados. 1254 × 1254. Complemento de saludando.png.
- **asomado.png** — Borde del buscador. 1254 × 1254. Existente: HomeSheet.tsx · .peek.
- **guiando.png** — Indicaciones de navegación. 1254 × 1254. Existente: NavigationView.tsx · .nav-mascot.
- **logrado.png** — Llegada al destino. 1254 × 1254. Existente: NavigationView.tsx · .arrived.
- **buscando.png** — Búsqueda sin resultados. 1254 × 1254. Existente sin ilustración: HomeSheet.tsx · .empty-results.
- **ubicacion.png** — Espera de GPS y contexto de ubicación. 1254 × 1254. Existente sin ilustración: App.tsx y useGeolocation.ts.
- **sin-conexion.png** — Conexión o error recuperable. 1254 × 1254. Recurso adicional; no existe estado offline específico.
- **cabeza.png** — Avatar, favicon e identidad. 1254 × 1254. Existente: favicon y apple-touch-icon de index.html.
- **explorando.png** — Entrada al recorrido a pie. 1254 × 1254. Existente: acceso Explorar a pie; uso ilustrado propuesto.
- **carino.png** — Respuesta a una caricia. 1254 × 1254. Complemento de interfaz; CampusAnimals.tsx ya tiene caricias 3D.
- **ayuda.png** — Ayuda y consejos de uso. 1254 × 1254. Recurso adicional para ayuda u onboarding.
- **pin.png** — Marcador de destino en el mapa. 1254 × 1254. Recurso propuesto; usar anclaje de la punta, no el centro.

## Dirección visual y fuentes

Cerdito rosado de formas redondas, hocico oval, ojos café, pezuñas chocolate, orejas dobladas, cola rizada y pañuelo rojo. Las proporciones y la luz superior izquierda se mantienen mediante una referencia maestra compartida. La textura 3D suave adapta el volumen y expresividad de los ejemplos a un personaje propio.

Fuente oficial consultada: https://www.usfq.edu.ec/es/la-usfq/sala-de-prensa/recursos — la USFQ publica Red Dragon HEX #E11B22, Dark Gray #231F20, Gray #939598 y blanco #FFFFFF, además de University Roman, Baskerville y Helvética. El valor HEX se usa como referencia cromática, sin sustituir el sistema tipográfico existente de la app (Paytone One / Rubik). Rosa #F7C3B8, coral del hocico y marrón de pezuñas son colores propuestos para Gastón, no colores institucionales. Los colores en renders varían con la iluminación.

## Colocación en la app actual

El kit está en public/mascota/gaston-v1/. Los archivos originales de public/mascota/ se conservan y la app actual sigue usando esos originales. Las cuatro maquetas de galeria.html muestran cómo colocar el nuevo personaje; no son capturas de una integración ya hecha.

1. **Carga — index.html:** reemplazar saludo.webp por saludando.png, añadir la capa saludando-parpadeo.png y cargar animaciones.css. Usar un contenedor .gaston.gaston--saludo de 260–360 CSS px. Mantener el personaje completo; el bottom:-9% actual recortaría esta pose. Conservar la precarga, el decode y la salida del splash al estar listo el campus; no alargar la espera para completar animaciones.
2. **Bienvenida — HomeSheet.tsx:** asomado.png a 140–160 CSS px. La línea de apoyo de las pezuñas está aproximadamente al 80–81% de la imagen: colocar el contenedor con bottom:calc(100% - 30px) para un ancho de 150px y afinar en el dispositivo. La imagen debe pintarse por encima del borde de la hoja para mostrar las patitas. El .peek actual se pinta detrás de .sheet y usa -46px; cambiar solo la URL ocultaría las patas. No oscilar esta pose en bucle: las pezuñas deben conservar su apoyo.
3. **Navegación — NavigationView.tsx:** guiando.png a 96–104 CSS px al lado derecho del banner. El nuevo cerdito ya señala a la izquierda: quitar el scaleX(-1) de .nav-mascot al usarlo en ese lugar. La flecha de navegación sigue siendo la fuente de verdad; el gesto de Gastón es decorativo y no cambia por cada giro. Aplicar la animación una vez cuando cambia el paso. Si se quiere apuntar a la derecha, reflejar un contenedor exterior, separado del que anima.
4. **Llegada — NavigationView.tsx:** logrado.png a 104–120 CSS px, una celebración al llegar. La app usa actualmente el último paso para esta pantalla; la ilustración no valida GPS ni precisión de puerta. Conservar los avisos de cobertura existentes.
5. **Sin resultados:** buscando.png a 80–112 CSS px junto al mensaje actual. Usar solo después de escribir una consulta; no mostrar una ilustración grande al abrir el teclado.
6. **GPS:** ubicacion.png a 64–96 CSS px. Acompañar siempre con el estado real y texto accionable. Para permiso denegado o usuario fuera del campus, quitar el pulso y explicar cómo seleccionar un edificio; no dejar la animación de espera indefinidamente.
7. **Conexión:** sin-conexion.png para un error recuperable con reintento. El proyecto no implementa un estado offline dedicado; este recurso está preparado para cuando exista y no implica mapas descargados.
8. **Exploración, ayuda y cariño:** recursos de interfaz opcionales. explorando.png es una pose con balanceo suave, no una caminata de patas. carino.png no sustituye al animal 3D ni a los corazones que ya existen en CampusAnimals.tsx.
9. **Cabeza y pin:** cabeza.png para avatar y como fuente del ícono. Para un ícono instalado de iOS hay que componer una exportación opaca aparte; este kit conserva el PNG transparente pedido. pin.png para destino a 40–56 CSS px; anclar la punta al punto del mapa usando el valor medido en CONTROL-CALIDAD.json. Nunca sustituir con él el punto azul de la ubicación del usuario. No rebotar el marcador en bucle.

## Animaciones

Preferir PNG + CSS: conserva la resolución original, permite pausar y respeta prefers-reduced-motion. Las clases y duraciones están en manifest.json. saludando usa respiración de 2.4s y parpadeo de 4.8s; el fotograma cerrado se revela solo sobre los ojos mediante máscaras CSS para evitar cambios en la silueta. Las dos imágenes generadas no son idénticas píxel por píxel fuera de los ojos. Esperar a decode() de ambos archivos antes de iniciar el parpadeo.

Las exportaciones WebP reproducen esos mismos movimientos a 20fps en 512px con alpha. Saludo, búsqueda, ubicación y exploración repiten; los gestos de entrada, indicación, llegada, cariño, ayuda y pin se ejecutan una vez y mantienen el fotograma final. Los WebP no obedecen por sí solos a movimiento reducido: usar una imagen estática alternativa con picture/media o preferir la versión CSS. Pausar los bucles al ocultar la pestaña. La galería incluye controles de pausa y repetición.

Ejemplo HTML, con imágenes decorativas:

```html
<link rel="stylesheet" href="/mascota/gaston-v1/animaciones.css">
<span class="gaston gaston--saludo" style="--gaston-size:240px" aria-hidden="true">
  <img src="/mascota/gaston-v1/saludando.png" alt="">
  <img class="gaston-parpado" src="/mascota/gaston-v1/saludando-parpadeo.png" alt="">
</span>
```

Usar textos reales fuera de las imágenes para carga, errores y navegación; no anunciar cada fotograma a lectores de pantalla. Mantener pointer-events:none en las ilustraciones decorativas de la app. Si una imagen transmite información por sí sola, darle un texto alternativo adecuado.

## Cómo revisar

Abrir galeria.html o, con npm run dev, visitar /mascota/gaston-v1/galeria.html. Probar el fondo claro y oscuro, pausar, repetir gestos y activar movimiento reducido. Ver CONTROL-CALIDAD.json para dimensiones, alpha, márgenes, hashes y exportaciones.
