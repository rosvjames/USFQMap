# Gastón v2 · MiCampus USFQ

Kit creado el 23 de octubre de 2026 con la herramienta integrada image_gen. La referencia aprobada es `output/imagegen/gaston-mock-kit-colores-solidos-v2.png`. Se generó un maestro aislado propio, `output/gaston-v2/originales/saludando.png`, y se usó ese mismo maestro como referencia de todas las poses. Ningún archivo de producción se recortó del tablero.

## Entrega

17 PNG RGBA de 1254 × 1254 px, 17 WebP estáticos de 512 × 512 px en `optimizados/`, 12 WebP animados transparentes de 512 × 512 en `animados/`, tres vistas de construcción dentro del inventario, un ícono opaco de 180 × 180, `animaciones.css`, galería, manifiesto, prompts y control de calidad. Los originales de image_gen se conservan completos en `output/gaston-v2/originales/`, incluido el primer maestro antes de retirar los brillos de ojos. Los PNG finales ajustan únicamente tamaño y posición en un lienzo transparente común; no se amplía artificialmente el dibujo.

La app debe cargar solo la pose necesaria. Preferir el WebP estático optimizado y aplicar CSS. No importar el inventario completo ni precargar todas las ilustraciones al arrancar. El PNG es el archivo de alta resolución y la alternativa universal. La galería se abre en `/mascota/gaston-v2/galeria.html`; el ZIP incluye recursos y originales para entrega independiente.

## Identidad

Gastón es un cerdito con disfraz de dragón, con orejas y hocico rosados visibles. Lleva parche carbón alrededor del ojo izquierdo anatómico, que queda a la derecha del espectador en vistas frontales; el perfil derecho no muestra parche. Cuernos pequeños ocre, alas plegadas, vientre marfil, cola de traje y pezuñas hendidas completan su silueta. Mantener la identidad y no reflejar las imágenes para apuntar en otra dirección: existen `guiando` y `guiando-izquierda` por separado.

Paleta objetivo: rojo `#E11B22`, carbón `#231F20`, marfil `#F6EFE6`, rosa `#E8AEA3`, ocre `#C89B48`. Ilustración de contornos limpios sin grano, crayón, aspecto 3D, peluche o brillos de ojos. Existe una variación tonal sutil heredada de la referencia generada; estos raster no garantizan tintas planas idénticas píxel por píxel. No hay tipografía incrustada.

## Inventario y colocación

| Archivo | Uso | Gesto CSS |
|---|---|---|
| saludando.png | Carga o bienvenida | saludo |
| saludando-parpadeo.png | Fotograma opcional de párpados | capa, sin gesto propio |
| asomado.png | Borde de buscador | asomado |
| guiando.png | Orientación hacia la derecha del espectador | guia |
| guiando-izquierda.png | Orientación hacia la izquierda del espectador | guia-izquierda |
| logrado.png | Llegada | logrado |
| buscando.png | Sin resultados | buscando |
| ubicacion.png | Consulta GPS | ubicacion |
| sin-conexion.png | Error recuperable | pausa |
| cabeza.png | Avatar o favicon | estático |
| explorando.png | Inicio de exploración | explorando |
| carino.png | Respuesta afectuosa | carino |
| ayuda.png | Ayuda | ayuda |
| pin.png | Recurso opcional de destino | pin |
| vista-frontal.png | Construcción frontal | estático |
| vista-lateral.png | Construcción del perfil derecho | estático |
| vista-posterior.png | Construcción posterior | estático |

Todas las imágenes tienen un anclaje inferior común aproximado `(0.5, 0.9203)` y margen transparente de unos 8% por lado. `asomado` apoya las pezuñas cerca de y=0.92: colocar el borde de la tarjeta alrededor de y=0.91 del cuadro de imagen, o compensar su 8% de margen inferior. No cortar orejas, cuernos o alas con `overflow:hidden` del contenedor. Tamaños sugeridos: saludo 180–260 CSS px; asomado 100–150; navegación 72–100; estados vacíos 88–120; cabeza 32–64. Revisar el teléfono real.

`pin` es solo un recurso para destino y no cambia el mapa actual. Su punta se ancla cerca de `(0.5, 0.9203)`. No sustituir con este personaje el indicador real de ubicación del usuario. El gesto no determina la dirección de navegación: conservar las instrucciones reales en texto y el icono correspondiente. `ubicacion` y `sin-conexion` deben acompañarse de estado real y una acción útil; nunca prolongar una espera para mostrar el gesto.

## Integración CSS

Las clases funcionan en un `img` independiente y en un contenedor `.gaston` con imagen hija. Un gesto se ejecuta una vez por evento y termina en reposo; no hay rebotes permanentes. Todas las clases respetan `prefers-reduced-motion: reduce`. El ejemplo usa una ilustración decorativa; si transmite información sin texto equivalente, usar un alt apropiado.

```html
<link rel="stylesheet" href="/mascota/gaston-v2/animaciones.css">
<img class="gaston gaston--guia" src="/mascota/gaston-v2/optimizados/guiando.webp"
     width="96" height="96" alt="" aria-hidden="true">
```

Añadir `.gaston-pausado` al elemento raíz o a un ancestro para pausa manual; `.gaston-oculto` para ocultación de pestaña; `.gaston--quieto` para una ilustración concreta. Registrar `visibilitychange` en la aplicación y alternar la clase al cambiar `document.hidden`. Para repetir, reiniciar la animación cuando ocurre un evento, sin temporizadores perpetuos.

El saludo opcional con parpadeo usa un contenedor de dos imágenes. Esperar `decode()` de ambas antes de iniciar. El fotograma cerrado generado conserva proporciones cercanas al maestro, pero puede tener deriva fuera del rostro: la máscara CSS revela solo dos pequeñas regiones de ojos, nunca sustituye la silueta entera.

```html
<span class="gaston gaston--saludo" style="--gaston-size:220px" aria-hidden="true">
  <img src="/mascota/gaston-v2/saludando.png" alt="">
  <img class="gaston-parpado" src="/mascota/gaston-v2/saludando-parpadeo.png" alt="">
</span>
```

Los 12 WebP animados son previsualizaciones de los mismos gestos a 20fps, una reproducción, con alpha. Mueven la ilustración por transformaciones CSS; no son rig de huesos, animación independiente de brazos ni ciclo real de caminata. El navegador no garantiza pausa o movimiento reducido dentro de un WebP animado: en interfaz preferir imagen estática + CSS. Si se usa WebP animado, sustituir el src por la versión estática bajo movimiento reducido o al ocultar la pestaña.

## Verificación y reproducción

`CONTROL-CALIDAD.json` registra dimensiones, alpha real, contenido no vacío, márgenes, anclas, hashes, pesos y cuadros de animaciones. La galería permite revisar fondo claro/oscuro, tamaños pequeños, pausar, repetir y simular movimiento reducido. Las tres vistas de construcción son estáticas.

Scripts de producción en `output/gaston-v2/`: `preparar-kit.mjs`, `inventario.mjs`, `exportar-animaciones.mjs`, `crear-galeria.mjs`, `verificar-kit.mjs`. Usan Node con `sharp`, Playwright y `img2webp` ya disponibles en el entorno. `PROMPTS.json` conserva los prompts reales y rutas de salida de la herramienta integrada. Las originales conservan la procedencia de generación; las exportaciones no usan API/CLI de imágenes.
