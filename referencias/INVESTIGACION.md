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

- 36 lugares seleccionables con huellas ya presentes en la descarga de OpenStreetMap. Se incorporan talleres, guardianías, baños, Herbario, la casita de la 12 de octubre (huella registrada como GOBE), mantenimiento y los dos sectores COM usando sus nombres registrados. Dos huellas al este del Coliseo, junto a Casa Hannah Arendt, permanecen como «Nombre pendiente».
- 13 referencias documentadas de aulas, oficinas y laboratorio, cada una con enlace y aviso histórico cuando corresponde.
- Interpretación de códigos, incluidos sufijos (H100F, N104A). Un código interpretable que no está en el catálogo se muestra explícitamente como no confirmado.
- Rutas exteriores existentes, con accesos aproximados y conexiones no mapeadas punteadas.
- Zona deportiva corregida a partir de la descripción en sitio del estudiante del 1 de octubre de 2026: arena con dos canchas de vóley, terraza rebajada de césped con mesas circulares y sillas metálicas, dos canchas azules de tenis más abajo, fútbol sintético con cerramiento de malla y fútbol natural a desnivel. Se incluyen gradas a la izquierda de tenis y fútbol natural, y una entrada aproximada a la reja en el modelo exterior. Se reutilizan las huellas de OSM; alturas, distribución del mobiliario y posición exacta de accesos son estimaciones visuales. El puente y sus accesos ya estaban etiquetados como elevados en OSM, pero antes se dibujaban a ras del suelo; su tablero se representa aproximadamente a 6 metros.
- Modelo exterior con materiales basados en referencias fotográficas y detalles arquitectónicos aproximados. Los seis árboles originales de OSM se conservan; los árboles decorativos adicionales se sitúan dentro de áreas verdes mapeadas, evitando senderos y edificios.
- El Hall Principal inventado se conserva como plantilla de modelado y prueba de rutas, pero está fuera de los planos ofrecidos al visitante.

## Revisión satelital del campus, el puente y Hayek

El 1 de octubre de 2026 se inspeccionaron la [vista satelital de Apple Maps](https://maps.apple.com/frame?map=satellite&center=-0.197353%2C-78.436621&span=0.004231%2C0.003931), el sector académico norte y el sector de Hayek. La imagen permite contrastar la disposición exterior, tonos y formas de cubierta, plazas, céspedes y conexiones visibles. La fecha de consulta no indica la fecha de captura de las imágenes, que no se verificó.

Se distinguen cubiertas terracota en el conjunto del Hall/Cicerón/Epicuro, oscuras en Galileo/Einstein/Da Vinci, turquesas en Miguel de Santiago y el conjunto Aristóteles/Sócrates/Lao Zi, y verdes en el Coliseo y otros sectores. Las superficies translúcidas de los edificios académicos se interpretan como claraboyas; no se abren patios interiores a partir de ellas. La relación de Da Vinci en la API pública de OpenStreetMap (8744168, consultada el mismo día) solo contiene miembros exteriores. Hayek conserva su huella con el entrante del patio y recibe una azotea clara con franjas oscuras junto al borde interior, aproximando lo visible en la imagen.

`src/data/siteAppearance.ts` registra esta interpretación por separado de la descarga de OSM. Los pavimentos se unen y recortan para no cubrir edificios, laguna, jardines ni terrazas rebajadas. Los anchos visuales respetan las anchuras explícitas de OSM. La vegetación ilustrativa deja despejados los centros de los céspedes y añade la franja arbolada junto a la Pagoda. Los senderos y sus conexiones para calcular rutas se conservan: una plaza visible no confirma una puerta, un paso bajo vegetación ni una ruta accesible.

El detalle se concentra en la universidad, el puente y Hayek por solicitud del estudiante. La cámara general incorpora ambos lados de la Interoceánica y los edificios de la ciudad se simplifican a volúmenes bajos sin sombras proyectadas. No se redistribuyen capturas de Apple Maps dentro de la aplicación; materiales y geometrías se generan localmente. Las cubiertas, claraboyas, patios, posiciones de árboles y alturas siguen siendo estimaciones, no un levantamiento métrico.

## Entrada del Hall Principal

Las tres fotos aportadas por el estudiante el 1 de octubre de 2026 sirven como referencia para el pórtico rojo, el frontón gris, las columnas, la plataforma elevada, la escalinata, los leones laterales y la figura central. [Alumni USFQ, mayo de 2024](https://vivealumni.usfq.edu.ec/2024/05/esta-obra-representa-la-razon-de-ser-de.html) identifica la réplica como el David de Miguel Ángel. No se confunde con el nombre del edificio Miguel de Santiago.

La fachada se ancla al borde de la huella de OSM que mira al cuadrángulo. La plataforma se representa aproximadamente a un metro sobre el camino, con seis gradas y separación simétrica de leones. Las dimensiones, posiciones y altura exterior del Hall son estimaciones de las fotografías, sin valor de levantamiento. El David y los leones se modelan mediante mallas propias suaves; no se descargaron ni incorporaron escaneos de terceros. Las fotos no se redistribuyen en la aplicación.

El Hall conserva su representación exterior en el mapa. Se retiró el recorrido de primera persona, sus controles y el sistema de colisiones por solicitud del estudiante, para concentrar el proyecto en navegación y GPS. Las referencias a pisos y aulas documentadas y las rutas sobre senderos se mantienen.

## Cómo completar interiores con datos reales

Pedir a Planta Física o a la coordinación del edificio planos simplificados por piso, con códigos de aulas, accesos, escaleras, ascensores y pasillos. Confirmar que se pueden usar en el proyecto de la casa abierta. Alternativamente, realizar un levantamiento acompañado y permitido por la universidad.

Conviene empezar por un solo edificio: registrar en una hoja cada aula y punto de giro con su piso, medir distancias entre nodos y documentar quién verificó cada tramo y cuándo. Usar `plantilla-levantamiento.csv` como registro inicial.

Convertir esas mediciones al sistema de coordenadas local de `src/lib/geo.ts`, crear un archivo en `src/data/plans/` y registrarlo en `PLANS` solo después de verificarlo. Quitar `placeholder` únicamente tras esa verificación. Las pruebas revisan que los nodos caigan en la huella y sean alcanzables, pero la exactitud física requiere revisión en sitio.

No se han contactado oficinas ni descargado datos privados de Banner. Todos los datos añadidos vienen de páginas públicas o de la referencia compartida por el usuario.

## Pagoda

Las tres fotos aportadas por el estudiante el 1 de octubre de 2026 muestran un pabellón bajo de madera, un solo techo de tejas con aleros curvos, galería de columnas y balaustres, celosías, puente arqueado sobre un pequeño estanque, gradas y muros rojizos con coronación verde. La vista posterior muestra una palmera entre el pabellón y la laguna.

Se conserva la orientación y la huella rectangular principal de OpenStreetMap y se utiliza su saliente occidental como referencia para el puente. La cubierta anterior de varias torres apiladas se reemplazó por cuatro faldones curvos con cumbrera baja. El estanque pequeño, alturas, detalles de madera, gradas y plantación son estimaciones visuales de las fotos. La laguna mayor conserva su huella cartográfica. No se modelan interiores ni se incorporan fotografías a los archivos publicados.

Corrección del estudiante: el pequeño estanque rodea toda la Pagoda, conservando su inicio occidental junto al puente. El agua continúa por los cuatro lados bajo el pabellón elevado y el borde de piedras sigue su perímetro completo.

## Entrada de Maxwell

Referencia: fotografía del portal y captura del mapa compartidas por el estudiante el 1 de octubre de 2026. El portal se ancla aproximadamente a la mitad del frente occidental de Maxwell que mira al patio entre Darwin y Galileo. Se representan ocho bandas concéntricas de piedra con juntas, columnillas en las jambas, dos columnas exteriores, puerta oscura arqueada, plataforma y cinco gradas, dos leones claros recostados y macetas con árboles pequeños. Las proporciones y el punto exacto sobre la fachada se estiman visualmente; no se dispone de un levantamiento de esta puerta.

El destino exterior de Maxwell usa el pie de las gradas como punto de aproximación. Los tramos sin sendero cartografiado mantienen su indicación de aproximación. El botón «Ver patio y dragón» encuadra la fachada y el jardín, sin recorrido de primera persona. Los leones son mallas generadas localmente, sin escaneos de terceros, y las fotografías no se publican con la aplicación.

Las dos fotografías adicionales compartidas el 1 de octubre de 2026 guían la pileta con pedestal y figura clara, sus gradas, cuatro palmeras, setos bajos, faroles de tres globos y árboles laterales. La aclaración posterior del estudiante establece un patio cuadrado con la pileta exactamente en el centro y vegetación simétrica en las cuatro esquinas. Se refleja una misma huella de jardín a través de los dos ejes del patio y se sustituye la vegetación genérica de ese espacio, incluyendo los puntos cartografiados que coinciden con él. Las pruebas comprueban la simetría y que las huellas decorativas no invadan edificios. El dragón sobre la cornisa se construye como una escultura original con membranas rojas festoneadas, nervios, cuernos, garras y cola; su tamaño se amplía por indicación del estudiante. Su silueta, detalles y escala son interpretaciones visuales, no un escaneo ni medidas verificadas. Estos elementos no añaden senderos al grafo de navegación.

## Patio lateral del bus

La fotografía `IMG_0420.JPG` y la captura del modelo compartidas el mismo día sitúan este patio al entrar por la izquierda del frente del dragón, entre Maxwell y Da Vinci. Se sustituye el césped genérico por pavimento claro y una franja de césped de cafetería, con bus antiguo elevado en soportes, obelisco de piedra rojiza, tres sombrillas rojas, mesas y sillas claras, macetas cuadradas con árboles pequeños, balcón con barandas oscuras y frontón de tres ventanas circulares. El mural del bus es un dibujo propio que sugiere los colores de la fotografía. Las medidas y los detalles arquitectónicos son aproximaciones visuales; se conserva la huella cartográfica de los edificios y no se añaden conexiones al grafo de navegación. La fotografía se utiliza como referencia y no se incorpora a los archivos de la aplicación.

## Hayek y el puente

`IMG_0421.JPG` y la captura del modelo compartidas el 1 de octubre de 2026 identifican como entrada el frente norte alcanzado por el puente. Se proyecta el extremo de `way/390625920` sobre la arista frontal de la huella de Hayek para anclar el portal. El acceso peatonal lateral de la terraza es el punto de salida y llegada de las rutas: se reemplaza la elección anterior de una pared posterior próxima a un sendero. La terraza conserva la altura ilustrativa del puente (6 m), sin atribuirle un número de piso confirmado. Las pruebas comprueban ambos sentidos y la conexión al extremo del puente. El atajo de línea recta no sustituye un recorrido que cruza por el puente.

La foto guía el marco alto de ladrillo marrón, arco rebajado, panel de piedra con un escudo sugerido, balcón y rejas oscuras, puerta lateral, banderolas rojas, jardineras y revestimiento gris de bandas horizontales. El arte de las banderolas y el escudo son dibujos originales aproximados, sin fotografías publicadas ni identificación heráldica. La aclaración del estudiante sitúa la puerta pequeña un poco a la izquierda de la llegada del puente. Ambos portales se desplazan juntos, manteniendo su separación; la terraza se prolonga bajo el portal grande y el punto de llegada de las rutas sigue la puerta pequeña. Las dimensiones se estiman visualmente. El piso del puente comparte una sección en cada quiebre y los encuentros de ramales se cubren con descansos planos. Las barandas negras se construyen sobre el perímetro unido, dejando libres las conexiones a rampas, Hayek y los senderos. Las flechas blancas y línea amarilla se inspiran en la foto, sin asignar un sentido obligatorio al recorrido.

La foto posterior del lado de Da Vinci, tomada hacia Maxwell, guía la fachada suroeste amarilla con zócalo rojizo, enredaderas que dejan libres las ventanas, jardineras lineales, barandas oscuras y terraza pavimentada con gradas. Los últimos tramos de baranda junto a Maxwell se retiran en ambos lados para dejar libres los pasos peatonales. El césped ilustrativo en ese paso se retira; se conservan los árboles del patio de Maxwell. «Ver fachada hacia Maxwell» muestra la perspectiva de referencia. La vegetación usa una sola malla con instancias y una textura de hojas generada localmente; las alturas y detalles se estiman visualmente, sin modificar las conexiones del grafo.

La foto de Miguel de Santiago compartida por el estudiante guía las alas de estuco claro con base rojiza, ventanas individuales, torre central acristalada y cubiertas verdes escalonadas. Los volúmenes de 7, 10.5 y 12.4 m se recortan sobre la misma huella OSM; la torre superior, el acceso gris con marquesina, gradas, módulo frontal y barandas se estiman visualmente. La guardianía adyacente recibe cubierta verde y paredes rojizas. «Ver entrada y torre» encuadra este frente. Las rutas de Miguel de Santiago usan el pie de las gradas fotografiadas como origen y destino, conservando el grafo de senderos. Las fotografías no se distribuyen en la aplicación.

La foto y la aclaración posterior del estudiante identifican un paso exterior con gradas a la derecha del Hall Principal, en el hueco entre el Hall y Einstein. El Hall conserva íntegros su volumen, cubierta, frente simétrico y tres puertas. Como las huellas originales de OSM se tocan, se abre una separación aproximada de 3.8 m únicamente en los primeros 14 m del paso, sin mover la pared del Hall. En la boca del túnel termina el patio descubierto y los edificios vuelven a unirse: la huella posterior de Einstein se conserva y su volumen se divide en un nivel inferior con el túnel abierto y otro superior completo, bajo una cubierta continua. Se retira el panel oscuro que parecía un muro o una puerta cerrada. Dentro se representa una rampa que desciende desde la altura ilustrativa de 1.57 m al piso del pasillo de 0.55 m, con pasamanos laterales; su longitud y altura libre son aproximaciones visuales. «Ver túnel y rampa» permite revisar la abertura. El corredor, descanso lateral y gradas tienen ancho uniforme; se añaden ventanas, acceso lateral de Einstein y macetas con dimensiones aproximadas. La conexión peatonal se incorpora al grafo junto a los senderos existentes. Las rutas Hall–Einstein usan este paso en ambos sentidos sin atravesar ninguno de los edificios. «Ver paso Hall–Einstein» muestra el sector desde el frente del Hall. La última captura del estudiante confirma la entrada de Einstein en la pared derecha del pasillo, justo antes del túnel. La puerta de dos hojas tiene tiradores y un umbral bajo; su posición se comparte con el punto de llegada y salida de las rutas, y las indicaciones describen ese acceso.

La aclaración posterior sitúa la entrada de la universidad entre las dos primeras ventanas de la guardianía que miran hacia Miguel de Santiago. Se abre un paso bajo la cubierta verde, con marco claro, hojas de reja abiertas y pavimento continuo. El módulo naranja del patio se corrige: es una pared delgada con techo, sin laterales ni volumen de cabaña; el frente orientado hacia Miguel de Santiago incorpora una pila metálica de agua con grifos. Las medidas y el número de grifos son ilustrativos.

Las fotos de la plaza frente a Da Vinci y las dos capturas del estudiante sitúan la pileta circular entre el frente noroeste de Da Vinci y el ala opuesta del Hall. El estudiante confirma que la fachada amarilla con arcos y toldo verde corresponde al ala previamente roja a la derecha de la primera captura. La pileta circular tiene tres gradas concéntricas y una escultura aproximada. La última perspectiva aportada por el estudiante corrige el entorno: césped alrededor de la pileta, senderos y acceso desde las columnas pavimentados, bancos, árbol y palmera a los lados. Se retiran la carpa blanca y las farolas de esa plaza. El frente noroeste de Da Vinci recibe dos filas de ventanas, panel central rojo, pórtico de cuatro columnas claras, marquesina, gradas y barandas laterales. El ala del Hall frente a la pileta recibe dos filas de arcos y una entrada elevada con toldo verde y borde festoneado; solo esta ala se eleva a 7.5 m y su cubierta se separa de la cubierta restante, conservando íntegra la huella y la entrada principal del Hall. «Ver plaza y columnas» y «Ver pileta y toldo» muestran las dos referencias. Los detalles y las medidas son estimaciones visuales, sin incorporar las fotos a la aplicación.


### Galileo y el borde de la laguna

La foto diagonal aportada por el estudiante sitúa el portal acristalado de Galileo en la fachada que mira hacia la laguna. Se conserva la huella del edificio y se aproxima el acabado naranja, el marco claro del portal, las puertas de dos hojas, seis gradas y un descanso a 1.6 m, con césped en pendiente a ambos lados. El acceso se conecta al sendero existente mediante un tramo corto; las rutas llegan y salen del pie de esas gradas y evitan un atajo largo que atraviese el agua. La posición precisa dentro de la fachada y las dimensiones son estimaciones visuales.

La laguna principal conserva su contorno de OpenStreetMap. Una franja ajardinada, flores bajas, rocas y palmeras reemplazan el pavimento pegado al agua, dejando libres los senderos existentes. Se usa agua verde azulada con ondulación discreta y pavimento cálido en los caminos del borde. La Pagoda conserva su pabellón y estanque modelados anteriormente. «Ver entrada y laguna» permite comparar el conjunto desde una vista diagonal. Estas alturas representan la fotografía; no constituyen un levantamiento topográfico ni una ruta accesible verificada.


### Plazoleta lateral del Hall Principal

La fotografía recortada y la captura del modelo sitúan una pequeña plazoleta en el hueco a la izquierda del portal principal, entre el Hall y Eugenio Espejo. La composición se completa de manera simétrica: fuente de dos niveles sobre el eje central, cuatro canteros con setos y flores violetas, dos árboles y reja frontal con acceso abierto centrado y pilares claros. Encaja en el espacio existente sin alterar las huellas, el portal, las gradas ni el paso hacia Einstein. Las dimensiones y la mitad no visible de la composición se interpretan visualmente. «Ver plazoleta lateral» permite revisar ese rincón.

### Frente de Newton y orilla de la laguna — foto aportada 2026-10-01

La vista desde la orilla opuesta muestra a Galileo a la izquierda y el acceso adicional de Newton en el ala naranja de la derecha. Se interpreta ese volumen con dos filas de ventanas y una cubierta de poca pendiente, conservando su huella OSM. El portal se ubica sobre el tramo 5–6 de Newton orientado al agua, con un rellano y cuatro gradas; el acceso se conecta al segmento más cercano del camino `way/1036865904` en ambas direcciones. Dimensiones, posición precisa del portal y elevaciones son estimaciones visuales, no levantamientos. La orilla mantiene el polígono de agua y añade piedras de tamaños variados, un montículo rocoso y plantación discontinua.

### Epicuro visto desde la entrada de Da Vinci — foto aportada 2026-10-01

Se identifica el frente este sobre los tramos 0–1 y 1–2 de la huella de Epicuro. La fotografía muestra un zócalo terracota bajo el cuerpo elevado, balcón de reja oscura, tres filas de ventanas con marcos y remates claros, torre cuadrada al extremo norte, cornisa y cubierta piramidal verde con pináculo. La fuente se interpreta como nicho arqueado, escalonamiento de piedra y estanque bajo de frente curvo. Las proporciones y la interpretación del agua son aproximadas. Se conserva la huella existente y la torre queda dentro de ella.

El usuario describe además unas gradas a la derecha, desde la calle hacia el patio exterior de Da Vinci, similares a Galileo. Se modelan en el espacio lateral libre, con rellano alto, ocho peldaños descendentes, muros bajos y pilares claros. Este acceso es provisional y no se incorpora como tramo confirmado a las rutas, pendiente de la fotografía que el usuario buscará.

### Segunda entrada de Miguel de Santiago — fotografía del jardín, 2026-10-01

La fotografía y la captura ubican la segunda entrada en el saliente sur de Miguel, entre los vértices 18 y 20 de la huella OSM. Se interpreta con un volumen acristalado continuo de unos 15,5 m, cubierta plana verde, marcos claros, cinco bandas de vidrio y puertas dobles al nivel del jardín. Se recortan los tejados existentes alrededor del volumen para evitar que atraviesen el vidrio. La masa de la torre se mantiene dentro de la huella, ajustando su ancho por el leve estrechamiento de la pared lateral.

El camino se conecta visualmente al sendero `way/1036865898`, con pavimento cálido, franjas claras, setos bajos en ambos lados y tres árboles altos a la derecha. Dimensiones, reflejos del vidrio y posición exacta del paisajismo son aproximaciones de la fotografía. Este acceso adicional no sustituye el acceso frontal ya documentado en las rutas.


### Ápice y niveles inferiores de Hayek — fotografía y aclaración del estudiante

La fotografía ubica Ápice bajo la terraza de la entrada del puente. Se representa el frente blanco, el paño central con rótulo rojo, grandes ventanales oscuros, puertas, dos pilares de ladrillo con bases claras, cielo raso con luminarias, aparcabicicletas rojos y un pequeño espacio de encuentro con mesas. El portal de ladrillo superior, la terraza y el puente se conservan; los soportes genéricos frente a la cafetería se sustituyen por los pilares de la referencia. Proporciones y mobiliario son estimaciones visuales.

El usuario identifica Ápice como piso 0 de Hayek y los dos niveles inferiores como subsuelos de aulas, pisos −1 y −2. Se incorpora esa convención en la ficha y en la interpretación de códigos y pisos de Hayek, sin cambiar el piso 0 de otros edificios. Ápice se puede buscar con y sin acento, por cafetería o punto de encuentro, y «Ver Ápice · piso 0» encuadra la fachada. La ruta exterior conserva la llegada confirmada al puente y explica que se debe bajar al piso 0; la circulación interior, los accesos entre niveles y las posiciones de aulas de los subsuelos siguen pendientes de levantar. No se registra un plano interior ficticio ni un recorrido accesible sin verificar.


La huella anteriormente identificada como GOBE se muestra como «La casita de la 12 de octubre», según la indicación del estudiante. La fotografía guía el cuerpo blanco, entramado de madera rojiza, cubierta a dos aguas con hastial alto, ventanas de ático, balcones y arcos inferiores. El volumen de dos plantas y ático es una estimación visual; la descarga original de OSM se conserva.

Gastón, el cerdito, camina automáticamente por senderos entre la casita y el Hall y visita el borde ajardinado de la laguna y vuelve por el sendero amplio. Pancho y Pancha son dos galgos negros que recorren el patio de la entrada principal de Miguel de Santiago. Los modelos incluyen nombres y movimiento de patas y cola. Los recorridos dejan espacio para el cuerpo completo al girar y se comprueban contra edificios, agua, muros, rejas, bebederos y pedestales de los accesos. Cada movimiento comprueba también el tramo entre cuadros; si queda bloqueado, el animal se detiene sin saltar al otro lado. Las barreras añadidas al modelo se registran en `src/lib/animalObstacles.ts`; el jardín de las banderas se mantiene libre. La animación se pausa al ocultar la pestaña.

La última fotografía del Hall deja el césped central despejado: se retiran los árboles ilustrativos de esa parcela y se añaden la reja negra del extremo de la calle, retornos laterales y diez banderas bicolores en dos filas de cinco. Las banderas son recreaciones gráficas, no emblemas oficiales verificados.

La referencia de la Pagoda corrige sus gradas: ocho peldaños que bajan y se ensanchan hacia el camino, con muros rojos inclinados y remates verdes. Piedras y plantas acuáticas dejan libre el acceso. El terreno y los senderos descienden de forma continua hasta el pie de la rampa de acceso al puente del lado del campus. El desnivel de 1.8 m es una estimación visual, sin levantar una topografía ni certificar accesibilidad; el tablero del puente y los niveles de las canchas se conservan.
