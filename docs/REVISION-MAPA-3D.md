# Revisión del mapa 3D · 23 de octubre de 2026

Se revisaron el terreno exterior, los materiales y el recorrido a pie. Los cambios están concentrados en la escena 3D; la interfaz puede rediseñarse en paralelo.

## Corrección de la unión con el puente

La aclaración del estudiante establece que el pasillo entre las canchas entra directamente a la esquina del tablero. La rampa lateral comunica con la calle inferior. Se corrigió la topografía para representar esas dos conexiones:

- El campus se eleva junto con sus pisos, edificios, vegetación, interiores, cámara y rutas. Conserva sus desniveles internos y llega al tablero en la esquina; la pendiente del Coliseo ya no termina en el pie de la rampa de calle.
- El entorno asciende hacia Pampite y conserva el nivel inferior de la Interoceánica. Hayek mantiene su base y la llegada al puente en su fachada.
- El puente empieza en la salida del campus. El pasillo interior conserva su pavimento, sin tablero, vigas, barandas ni señalización de puente. La abertura en la baranda exterior y el recorte de la esquina de Herbario comparten una entrada de 2,8 m con las colisiones.
- El límite sur sigue la fachada exterior de Herbario, Guardianía y COM. La rampa y su aproximación inferior quedan fuera del campus; se elimina la franja elevada que antes las encerraba. Los laterales del terreno se cierran con superficies de contención y las bases de los edificios llegan por debajo de la pendiente.
- El acceso inferior conserva su propio piso. El movimiento mantiene la altura del caminante al pasar bajo el puente y al subir la rampa, evitando saltar al tablero por compartir las mismas coordenadas en planta.

Estas cotas son relativas y aproximadas: se ajusta la relación entre campus, calle y puente descrita por el estudiante, sin atribuirle precisión de levantamiento topográfico. La prueba del pasillo al puente y la del acceso de calle cubren los recorridos completos. Las nuevas capturas y la comprobación del navegador se guardan en `output/revision-puente-campus/`.

## Problemas corregidos

- **Capas de piso que se atravesaban.** El césped general, los jardines, las plazas y los caminos se dibujaban por separado y a distintas alturas. Ahora el terreno general tiene regiones de césped y pavimento recortadas entre sí. Los edificios, el agua, las canchas y los pisos especiales conservan su espacio propio.
- **Caminos deformados por otras alturas.** El pavimento general consultaba también alturas de puentes, entradas y plataformas. Ahora sigue el terreno; los accesos especiales conservan su geometría y desniveles. Los tramos en los jardines inclinados de Galileo y Newton se rellenan siguiendo esas pendientes.
- **Paso bloqueado junto al Coliseo.** La huella deportiva y su reja invadían el espacio del camino, especialmente en la esquina suroccidental. Las superficies deportivas se recortan con el mismo ancho de camino que utiliza el pavimento. Sus rejas y colisiones usan la huella corregida. Los encuentros entre tramos incluyen sus curvas, sin pequeños dientes de terreno en las esquinas.
- **Escalera del fútbol natural inaccesible.** Su arranque estaba fijado en +0,55 m mientras el camino ya había bajado. Ahora arranca a la altura del terreno y llega hasta el campo, atravesando todo el ancho del acceso. El pavimento lateral y los muros de contención también siguen la pendiente. La altura al caminar sobre el jardín del Coliseo coincide con su piso modelado.
- **Césped y baldosas inconsistentes.** Césped y jardines comparten material; los caminos peatonales comparten el pavimento. Las superficies horizontales agrupadas utilizan coordenadas del campus: una repetición cada 2,4 m, con baldosas de aproximadamente 60 cm. Así los patios girados dejan de tener baldosas gigantes, diminutas o con otra orientación. El jardín de mesas y el campo natural utilizan el mismo césped. Arena, tenis y césped sintético mantienen acabados propios.
- **Texturas repetidas en memoria.** Los acabados que usan el mismo patrón comparten sus mapas de color y relieve. La liberación de recursos evita disponer dos veces los materiales compartidos.

Los ajustes de anchuras y desniveles son aproximaciones del modelo existente. El archivo cartográfico original permanece como fuente; las correcciones se aplican a la representación 3D.

## Verificación y rendimiento observado

La suite completa pasó sus 144 pruebas y la compilación de producción. Las pruebas de regresión comprueban el recorrido de ida y vuelta entre el cuadrángulo y el fútbol natural por el camino central, el paso junto al Coliseo, las escaleras, puentes, colisiones y alineación de baldosas. Las pruebas geométricas verifican que las regiones generales de césped y pavimento no se superpongan ni cubran los pisos reservados. Las operaciones cartográficas utilizan precisión milimétrica.

La comprobación con Chromium incluyó escritorio de 1440 × 1000 a DPR 1 y móvil emulado de 390 × 844 a DPR 2, entrada y salida del recorrido y desplazamiento de la cámara. La ejecución revisada no registró errores de JavaScript/WebGL ni geometría con coordenadas inválidas. También se verificó que los 20 mapas procedurales compartidos se liberaran una sola vez.

| Contador del renderizador, vista general de escritorio | Antes | Después, aproximadamente |
|---|---:|---:|
| Triángulos dibujados | 834.000 | 811.500 |
| Llamadas de dibujo | 907 | 907 |
| Texturas asignadas por el renderizador | 111 | 64 |
| Programas de shader | 30 | 30 |

Estos contadores corresponden a una escena de desarrollo y pueden variar ligeramente con la cámara y los animales. Indican menos geometría y menos texturas, con un número de dibujos equivalente. El número de texturas no mide sus bytes. Tampoco permite deducir un porcentaje de mejora en FPS.

Se mantienen las sombras almacenadas, de 2048² en escritorio y 1024² en móvil. El recorrido dibuja continuamente; la vista de mapa dibuja bajo demanda. La compilación de producción funciona, con el aviso de Vite sobre el tamaño del paquete JavaScript, de aproximadamente 466 kB comprimidos.

Las capturas y las comprobaciones del navegador están en [`output/revision-mapa-3d/`](../output/revision-mapa-3d/). La emulación permite revisar funcionamiento y composición; el rendimiento, la temperatura y el consumo sostenido requieren pruebas en teléfonos físicos.

## Viabilidad de un aspecto más realista

**Sí es viable mejorar bastante el aspecto cercano manteniendo la lectura actual desde lejos.** La escena ya utiliza materiales PBR (`MeshStandardMaterial`), relieve, reflejos y sombras. Estos materiales ya permiten trabajar con normales y rugosidad; un shader completamente nuevo no es un requisito para esa mejora. [Documentación de materiales de Three.js](https://threejs.org/docs/pages/MeshStandardMaterial.html).

El aspecto simplificado procede de varios elementos combinados: texturas procedurales de 256², vegetación con siluetas geométricas, detalles arquitectónicos aproximados y sombras que abarcan un área muy grande. Cambiar solamente las texturas mejoraría los acabados, pero las siluetas, ventanas y esculturas seguirían mostrando su geometría actual.

| Mejora posterior | Beneficio esperado | Impacto probable y condiciones |
|---|---|---|
| Acabados de ladrillo, revoque, piedra, pavimento y césped con color, normales y rugosidad | Más detalle al acercarse, con superficies menos uniformes | Costo bajo a moderado por píxel; aumenta la memoria y la descarga. Compartir pocos juegos de texturas y empezar en 512² |
| Sombras y oclusión horneadas para los edificios estáticos | Contacto y profundidad bajo aleros, columnas y vegetación | Poco trabajo adicional por cuadro; requiere preparar UV y mapas, y consume memoria |
| Sombras cercanas de mayor calidad durante el recorrido | Bordes más definidos al caminar | Costo moderado o alto si se recalculan al mover la cámara. Probar como opción de calidad después de medir |
| Vegetación con mejores siluetas y niveles de detalle según distancia | Reduce mucho el aspecto geométrico de cerca | Puede reducir geometría lejana; hojas transparentes densas pueden aumentar el trabajo de la GPU |
| Oclusión en pantalla, varias luces con sombras o reflejos del agua en tiempo real | Más profundidad y reflejos dinámicos | Mayor costo por cuadro. Evaluar individualmente después de establecer el presupuesto del móvil |

Una textura RGBA de 1024² con mipmaps ocupa aproximadamente 5,3 MiB sin compresión de GPU. Seis acabados con tres mapas de ese tamaño sumarían aproximadamente **96 MiB**; a 512² serían unos **24 MiB**. Son ejemplos de presupuesto, no una medición de esta app. El tamaño del archivo JPEG/WebP descargado no equivale a su consumo en la GPU. [Memoria de texturas en Three.js](https://threejs.org/manual/pages/textures.html).

Las sombras actuales cubren unos 460 m de ancho en el espacio de la luz: equivalen aproximadamente a 22 cm por texel en escritorio y 45 cm en móvil, antes de considerar la proyección. Esto explica parte de su falta de detalle al acercarse. Acotar esa región mejora la definición, pero hacerla seguir al usuario puede exigir recalcular las sombras. Cada luz adicional que proyecta sombras implica más trabajo de renderizado. [Funcionamiento de las sombras en Three.js](https://threejs.org/manual/pages/shadows.html).

La secuencia aconsejada es probar primero un acabado de pavimento y uno de fachada en una zona representativa, con mapas de 512², y compararlos en un teléfono de gama media. Después, añadir iluminación horneada y mejores siluetas cercanas. Para aprobar cada mejora, medir tiempos por cuadro, memoria, carga inicial y temperatura durante varios minutos de recorrido. Como objetivos de evaluación: 30 FPS sostenidos en el teléfono elegido y 60 FPS en escritorio; son metas que hay que comprobar, no resultados garantizados.
