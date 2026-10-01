# Datos públicos y alcance del modelo

Revisado el 1 de octubre de 2026 para la casa abierta.

## Qué encontramos

- [Mapa oficial USFQ 2023](https://www.usfq.edu.ec/es/mapa-de-la-universidad): catálogo de 41 lugares y una ilustración general. Sirve para nombres y referencias; no ofrece plantas de cada piso ni coordenadas de puertas.
- [Códigos de aulas, publicación USFQ de 2012](https://noticias.usfq.edu.ec/2012/08/ubicate-en-la-usfq-y-encuentra-tus.html): explica la relación entre prefijo, edificio y piso, con M302, G206 y DW010 como ejemplos.
- [Orientación USFQ de enero de 2015](https://noticias.usfq.edu.ec/2015/01/orientacion-semestre2-1415.html): cita M106, M202, M210, M302, M309 y D127. Son referencias históricas, no una confirmación de su vigencia actual.
- [Preguntas frecuentes de Registro](https://www.usfq.edu.ec/en/node/2045): identifica G111 y E104. La página contiene información de distintas oficinas y trámites; no se usa para inferir pasillos.
- [Archivos Académicos USFQ](https://revistas.usfq.edu.ec/index.php/archivosacademicos/about/contact): identifica USFQ PRESS en Casa Blanca, CB110.
- [Guía para Dragones de 2019](https://noticias.usfq.edu.ec/2019/08/guia-de-supervivencia-para-dragones.html): cita H100F para el Decanato de Estudiantes.
- [Directorio académico de la USFQ](https://www.usfq.edu.ec/es/perfiles/daniela-estefania-ona-villamil): publica la ubicación N104A en Newton. Se incorpora como referencia de oficina, sin crear una coordenada interior.
- [Reporte de infraestructura de enero de 2019](https://www.usfq.edu.ec/sites/default/files/inline-files/Reporte_Infraestructura.pdf): contabiliza instalaciones y usos por edificio o grupo de edificios. No incluye distribución, códigos de todas las aulas ni planos; sus totales no se convierten en habitaciones inventadas.

Buscamos mapas de aulas, plantas, planos de Maxwell/Galileo y recorridos virtuales en el sitio y repositorio de la universidad. No encontramos un conjunto público de planos interiores utilizable para una reconstrucción fiel. Esto describe el resultado de la búsqueda, no demuestra que los planos no existan.

## Referencia visual del usuario

`campus-ilustrado-referencia.png` conserva la imagen compartida en el chat. Inspira los tonos terracota/verde de las cubiertas, las fachadas claras, la cúpula de Maxwell, la Pagoda y el Obelisco. Su leyenda tiene 28 referencias: **no coincide con la numeración del mapa oficial de 2023**. La aplicación usa la numeración de 2023 y no mezcla ambas leyendas.

La posición y dimensiones de los detalles de cubierta, ventanas, molduras y vegetación son aproximaciones artísticas. La imagen no se usa como plano de pisos, prueba de la vigencia de un aula ni fuente métrica.

## Referencias fotográficas y materiales

Se inspeccionaron visualmente estas fotografías públicas para corregir el aspecto del modelo:

- [Vista aérea publicada por USFQ Next](https://www.usfq.edu.ec/sites/default/files/2024-08/usfq-next-main-slide.jpg): ladrillo rojo, marcos y cornisas crema, cubiertas marrón oscuro, cúpula dorada, palmeras, jardines y agua verde.
- [Obelisco y jardines, Noticias USFQ, 2021](https://noticias.usfq.edu.ec/2021/03/usfq-elegida-como-la-universidad-1-del.html): torre blanca con relojes y vegetación de distintas alturas.
- [Campus Tour 2025](https://www.usfq.edu.ec/es/eventos/campus-tour-2025): fotografía pública de puentes, laguna y jardines.

Las fotos se consultaron como referencias; no se redistribuyen dentro de la aplicación. Las texturas de ladrillo, revoque, cubierta, césped, pavimento, agua y follaje se generan localmente. El modelo utiliza ventanas con marcos, molduras, arcos en Maxwell, vidrio con reflejo de cielo, copas orgánicas y palmeras. La selección conserva los materiales originales y destaca el perímetro.

Los techos se triangulan sobre la huella existente, conservando entrantes. Las alturas explícitas de OSM se aprovechan cuando están disponibles; la torre del Obelisco corresponde a los 20 metros registrados. El volumen del Coliseo se aproxima visualmente a 8 metros de altura hasta la cubierta. Esta estimación y la distribución decorativa de ventanas y árboles no sustituyen un levantamiento arquitectónico.

## Qué está implementado

- 27 lugares seleccionables con huellas ya presentes en la descarga de OpenStreetMap.
- 13 referencias documentadas de aulas, oficinas y laboratorio, cada una con enlace y aviso histórico cuando corresponde.
- Interpretación de códigos, incluidos sufijos (H100F, N104A). Un código interpretable que no está en el catálogo se muestra explícitamente como no confirmado.
- Rutas exteriores existentes, con accesos aproximados y conexiones no mapeadas punteadas.
- Recorrido en primera persona dentro del perímetro del campus principal, con colisión contra las huellas de edificios y el agua. No es una validación de transitabilidad real. Hayek se ve en el mapa general; el modo de caminar no permite cruzar las calles fuera del perímetro principal.
- Modelo exterior con materiales basados en referencias fotográficas y detalles arquitectónicos aproximados. Los seis árboles originales de OSM se conservan; los árboles decorativos adicionales se sitúan dentro de áreas verdes mapeadas, evitando senderos y edificios.
- El Hall Principal inventado se conserva como plantilla de modelado y prueba de rutas, pero está fuera de los planos ofrecidos al visitante.

## Cómo completar interiores con datos reales

Pedir a Planta Física o a la coordinación del edificio planos simplificados por piso, con códigos de aulas, accesos, escaleras, ascensores y pasillos. Confirmar que se pueden usar en el proyecto de la casa abierta. Alternativamente, realizar un levantamiento acompañado y permitido por la universidad.

Conviene empezar por un solo edificio: registrar en una hoja cada aula y punto de giro con su piso, medir distancias entre nodos y documentar quién verificó cada tramo y cuándo. Usar `plantilla-levantamiento.csv` como registro inicial.

Convertir esas mediciones al sistema de coordenadas local de `src/lib/geo.ts`, crear un archivo en `src/data/plans/` y registrarlo en `PLANS` solo después de verificarlo. Quitar `placeholder` únicamente tras esa verificación. Las pruebas revisan que los nodos caigan en la huella y sean alcanzables, pero la exactitud física requiere revisión en sitio.

No se han contactado oficinas ni descargado datos privados de Banner. Todos los datos añadidos vienen de páginas públicas o de la referencia compartida por el usuario.
