# USFQ · Explora

Mapa 3D del campus de Cumbayá para una casa abierta. Permite buscar edificios y códigos de aula, consultar las fuentes, trazar rutas exteriores aproximadas y navegar por el campus mediante el mapa y el GPS.

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
- Buscar M302, G111, DW010, H100F, un edificio o un servicio como Registro.
- «Fuentes y cobertura» muestra las referencias y los límites de los datos.
- «Ver canchas y terrazas» acerca la cámara al sector deportivo. El interruptor «Nombres de edificios», arriba a la derecha, muestra u oculta sus etiquetas, incluida la del edificio seleccionado. Los nombres están activados inicialmente.

## Datos y precisión

El catálogo contiene 36 lugares con geometría de OpenStreetMap y 13 referencias públicas a aulas, oficinas y un laboratorio. Los servicios menores conservan los nombres de OSM. Dos huellas junto a Casa Hannah Arendt permanecen como «Nombre pendiente», sin asignarles un nombre por suposición. Las ubicaciones interiores solo identifican edificio y piso: **no hay planos interiores reales incorporados**. Las publicaciones antiguas se marcan como históricas. Un código válido por su formato no confirma la existencia del aula.

Los detalles arquitectónicos son una interpretación visual de fotografías públicas de la USFQ y de la ilustración del campus compartida por el usuario. No son una reconstrucción arquitectónica medida. Los números de las fichas corresponden al mapa oficial de 2023, cuya leyenda difiere de la imagen antigua.

La revisión satelital en Apple Maps del 1 de octubre de 2026 diferencia cubiertas terracota, oscuras, verdes y turquesa, añade claraboyas a Da Vinci, Einstein, Galileo y Newton, y combina azoteas claras con bandas de cubierta oscura en Hayek. Los patios pavimentados se recortan alrededor de edificios, agua, jardines y desniveles; los centros de los céspedes se mantienen despejados y se concentra la plantación junto a la laguna. La vista general incluye el campus, el puente y Hayek. Los edificios ajenos a la universidad se dibujan como volúmenes bajos y neutros. Las posiciones y dimensiones interpretadas desde la imagen son aproximaciones visuales: no modifican las huellas ni añaden senderos confirmados al grafo de navegación.

Las rutas terminan en puntos aproximados de la huella de cada edificio. Los tramos punteados no son senderos confirmados. Se retiró el recorrido de primera persona para concentrar el proyecto en orientación y GPS; se mantiene el mapa 3D con sus rutas exteriores.

La zona deportiva se corrigió según la descripción del estudiante: dos canchas de vóley sobre arena, terraza inferior de césped con mesas y sillas metálicas, dos canchas de tenis azules más abajo, fútbol sintético con reja y fútbol natural a desnivel. Hay accesos por gradas a la izquierda del tenis y del campo natural. Las huellas se conservan, pero las profundidades, mobiliario, accesos y altura del puente son aproximaciones visuales, no un levantamiento topográfico.

La investigación completa y los próximos pasos están en [referencias/INVESTIGACION.md](referencias/INVESTIGACION.md).

## Estructura

| Ruta | Contenido |
|---|---|
| `src/data/campus.json` | Huellas, senderos, calles, jardines, canchas y laguna de OSM |
| `src/data/buildings.ts` | Catálogo de lugares y prefijos de aulas |
| `src/data/references.ts` | Referencias públicas y números del mapa oficial |
| `src/data/siteAppearance.ts` | Cubiertas, claraboyas, patios y jardines interpretados de la vista satelital |
| `src/data/plans/` | Planos interiores verificados; el ejemplo del Hall no está registrado |
| `src/lib/search.ts` | Buscador y lectura de códigos con avisos de procedencia |
| `src/lib/outdoor.ts` | Rutas sobre el grafo de senderos |
| `src/lib/terrain.ts` | Desniveles deportivos, gradas y alturas del puente |
| `src/components/SportsGround.tsx` | Arena, tenis, fútbol, redes y mobiliario |
| `src/components/CampusBridges.tsx` | Tablero, barandillas y soportes del puente a Hayek |
| `src/lib/hall.ts` | Posición, gradas y alturas de la entrada del Hall |
| `src/components/HallEntrance.tsx` | Pórtico, escalinata, David y leones según fotos del usuario |
| `src/lib/sculptures.ts` | Mallas originales aproximadas de las esculturas |
| `src/components/Pagoda.tsx` | Pabellón de madera, galería, puente, gradas, estanque y palmera |
| `src/lib/pagoda.ts` | Huella orientada y geometría de la cubierta curva |
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

La entrada del Hall Principal utiliza las tres fotos compartidas por el estudiante: fachada roja, frontón gris, columnas, plataforma elevada, seis gradas, estatua central clara y dos leones en bronce sobre bases rojizas. La figura central representa al David de Miguel Ángel, cuya réplica identifica [Alumni USFQ](https://vivealumni.usfq.edu.ec/2024/05/esta-obra-representa-la-razon-de-ser-de.html). Las esculturas se generan como mallas propias y no son escaneos de las piezas reales. Alturas, distancias y proporciones se estiman a partir de las fotos.

Para verificar: `npm test` y `npm run build`. Las pruebas cubren búsqueda, rutas, desniveles, alturas del puente, entrada del Hall, mallas de esculturas y geometría de techos cóncavos, pavimentos y terreno rebajado.

La navegación táctil usa un dedo para desplazar, la separación de dos dedos para acercar/alejar y el ángulo entre ellos para orientar la cámara. El movimiento de ambos dedos también desplaza el mapa. Los cambios se acumulan y aplican una vez por fotograma; añadir o retirar un dedo reinicia la referencia sin saltos. Los gestos interrumpen el vuelo automático, conservan la inclinación y no seleccionan edificios al terminar un arrastre. Un toque sigue seleccionando edificios. Los movimientos automáticos cuentan el tiempo de dibujo activo, de modo que una pausa de la pestaña no descarte órdenes de zoom o cambios de vista. En PC se conservan el arrastre con botón izquierdo, la rueda y el giro con botón derecho.

La tarjeta «Campus Cumbayá» puede recogerse en una pestaña lateral y restaurarse; su estado se conserva al consultar un edificio. El mapa adapta su resolución a la densidad de la pantalla, hasta dos píxeles por píxel de interfaz, y mantiene el suavizado de bordes. En móvil utiliza sombras de 1024 × 1024. Las sombras se calculan cuando cambia el contenido, no al desplazar la cámara. La decoración inmóvil se agrupa por material, el entorno urbano se dibuja como un único conjunto y escribir en la búsqueda no vuelve a renderizar la escena. Las pruebas de gestos usan una cámara de perspectiva real y eventos de puntero para comprobar zoom, giro, límites, cancelación, limpieza de controles y selección. La revisión visual utiliza tamaños de teléfono y escritorio; no sustituye una medición de fluidez en un teléfono físico.

La Pagoda se remodeló a partir de las tres fotografías compartidas por el estudiante: pabellón bajo de madera con un único techo de tejas oscuras y aleros curvos, columnas, ventanas de celosía, galería con balaustres y puente arqueado de acceso. Incluye gradas de piedra, muros rojizos con remates verdes, pequeño estanque con piedras y hojas acuáticas, y una palmera en el lado de la laguna. El pabellón y su orientación siguen la huella de OSM; alturas, ornamentos, estanque y vegetación son estimaciones visuales. Las fotos no se redistribuyen. «Ver la Pagoda» abre su ficha en el mapa; no activa un recorrido de primera persona.

Corrección del estudiante: el pequeño estanque rodea toda la Pagoda, conservando su inicio occidental junto al puente. El agua continúa por los cuatro lados bajo el pabellón elevado y el borde de piedras sigue su perímetro completo.

La entrada de Maxwell se sitúa en la fachada hacia el patio de Darwin y Galileo, según la captura del estudiante. Las fotografías guían el arco con ocho bandas de piedra y juntas radiales, puerta metálica oscura, columnas y columnillas claras, cinco gradas, dos leones pequeños recostados, macetas, friso y rosetón. El patio tiene una pileta en el centro de un cuadrado y cuatro jardines reflejados en las esquinas, con setos bajos, bordes de piedra, palmeras y faroles claros, conforme a la aclaración del estudiante. Un dragón rojo de alas extendidas ocupa aproximadamente 30 metros sobre la cornisa. «Ver patio y dragón» encuadra el conjunto. Las rutas a Maxwell terminan al pie de las gradas; las dimensiones y el anclaje son aproximados, sin levantamiento. La vegetación genérica dentro del patio se sustituye por la composición de las fotos. Las esculturas son mallas propias y las fotografías no se redistribuyen.

El patio lateral de Maxwell, en el espacio entre su ala occidental y Da Vinci, sigue la fotografía `IMG_0420.JPG` y la zona marcada por el estudiante: pavimento claro, bus antiguo con mural original rojo y negro, obelisco rojizo, césped de mesas blancas y tres sombrillas rojas, macetas y balcón con baranda oscura. «Ver patio del bus» permite acercarse al conjunto. Sus proporciones se estiman visualmente; no modifica las rutas ni publica la fotografía. Sus mallas se agrupan con los demás detalles estáticos para mantener bajo el número de dibujos en móvil.

La entrada de Hayek se ancla a la fachada alcanzada por el puente, según `IMG_0421.JPG` y la captura del estudiante. El portal de ladrillo, arco rebajado, rejas, balcón, revestimiento gris, banderolas originales y terraza elevada sustituyen la fachada genérica de ese frente. La aclaración posterior sitúa la puerta pequeña un poco a la izquierda del extremo del puente; ambos portales conservan su separación y la terraza se prolonga bajo el portal grande. Las rutas a Hayek y desde Hayek usan el acceso lateral de la terraza, conectado al extremo cartografiado del puente; ya no eligen la pared posterior más cercana a un sendero. La altura visual coincide con el tablero a 6 m, una estimación del modelo. «Ver entrada y puente» encuadra el acceso. El tablero comparte bordes en cada curva y rellena los encuentros con rampas; las barandas siguen el perímetro combinado, sin cerrar las conexiones. Se conservan las coordenadas del grafo y las fotografías no se distribuyen.

La foto posterior del lado de Da Vinci, tomada hacia Maxwell, guía la fachada suroeste amarilla con zócalo rojizo, enredaderas que dejan libres las ventanas, jardineras lineales, barandas oscuras y terraza pavimentada con gradas. Los últimos tramos de baranda junto a Maxwell se retiran en ambos lados para dejar libres los pasos peatonales. El césped ilustrativo en ese paso se retira; se conservan los árboles del patio de Maxwell. «Ver fachada hacia Maxwell» muestra la perspectiva de referencia. La vegetación usa una sola malla con instancias y una textura de hojas generada localmente; las alturas y detalles se estiman visualmente, sin modificar las conexiones del grafo.

La foto de Miguel de Santiago compartida por el estudiante guía las alas de estuco claro con base rojiza, ventanas individuales, torre central acristalada y cubiertas verdes escalonadas. Los volúmenes de 7, 10.5 y 12.4 m se recortan sobre la misma huella OSM; la torre superior, el acceso gris con marquesina, gradas, módulo frontal y barandas se estiman visualmente. La guardianía adyacente recibe cubierta verde y paredes rojizas. «Ver entrada y torre» encuadra este frente. Las rutas de Miguel de Santiago usan el pie de las gradas fotografiadas como origen y destino, conservando el grafo de senderos. Las fotografías no se distribuyen en la aplicación.

La foto y la aclaración posterior del estudiante identifican un paso exterior con gradas a la derecha del Hall Principal, en el hueco entre el Hall y Einstein. El Hall conserva íntegros su volumen, cubierta, frente simétrico y tres puertas. Como las huellas originales de OSM se tocan, se abre una separación aproximada de 3.8 m únicamente en los primeros 14 m del paso, sin mover la pared del Hall. En la boca del túnel termina el patio descubierto y los edificios vuelven a unirse: la huella posterior de Einstein se conserva y su volumen se divide en un nivel inferior con el túnel abierto y otro superior completo, bajo una cubierta continua. Se retira el panel oscuro que parecía un muro o una puerta cerrada. Dentro se representa una rampa que desciende desde la altura ilustrativa de 1.57 m al piso del pasillo de 0.55 m, con pasamanos laterales; su longitud y altura libre son aproximaciones visuales. «Ver túnel y rampa» permite revisar la abertura. El corredor, descanso lateral y gradas tienen ancho uniforme; se añaden ventanas, acceso lateral de Einstein y macetas con dimensiones aproximadas. La conexión peatonal se incorpora al grafo junto a los senderos existentes. Las rutas Hall–Einstein usan este paso en ambos sentidos sin atravesar ninguno de los edificios. «Ver paso Hall–Einstein» muestra el sector desde el frente del Hall. La última captura del estudiante confirma la entrada de Einstein en la pared derecha del pasillo, justo antes del túnel. La puerta de dos hojas tiene tiradores y un umbral bajo; su posición se comparte con el punto de llegada y salida de las rutas, y las indicaciones describen ese acceso.

Las fotos de la plaza frente a Da Vinci y las dos capturas del estudiante sitúan la pileta circular entre el frente noroeste de Da Vinci y el ala opuesta del Hall. El estudiante confirma que la fachada amarilla con arcos y toldo verde corresponde al ala previamente roja a la derecha de la primera captura. La pileta circular tiene tres gradas concéntricas y una escultura aproximada. La última perspectiva aportada por el estudiante corrige el entorno: césped alrededor de la pileta, senderos y acceso desde las columnas pavimentados, bancos, árbol y palmera a los lados. Se retiran la carpa blanca y las farolas de esa plaza. El frente noroeste de Da Vinci recibe dos filas de ventanas, panel central rojo, pórtico de cuatro columnas claras, marquesina, gradas y barandas laterales. El ala del Hall frente a la pileta recibe dos filas de arcos y una entrada elevada con toldo verde y borde festoneado; solo esta ala se eleva a 7.5 m y su cubierta se separa de la cubierta restante, conservando íntegra la huella y la entrada principal del Hall. «Ver plaza y columnas» y «Ver pileta y toldo» muestran las dos referencias. Los detalles y las medidas son estimaciones visuales, sin incorporar las fotos a la aplicación.


### Galileo y el borde de la laguna

La foto diagonal aportada por el estudiante sitúa el portal acristalado de Galileo en la fachada que mira hacia la laguna. Se conserva la huella del edificio y se aproxima el acabado naranja, el marco claro del portal, las puertas de dos hojas, seis gradas y un descanso a 1.6 m, con césped en pendiente a ambos lados. El acceso se conecta al sendero existente mediante un tramo corto; las rutas llegan y salen del pie de esas gradas y evitan un atajo largo que atraviese el agua. La posición precisa dentro de la fachada y las dimensiones son estimaciones visuales.

La laguna principal conserva su contorno de OpenStreetMap. Una franja ajardinada, flores bajas, rocas y palmeras reemplazan el pavimento pegado al agua, dejando libres los senderos existentes. Se usa agua verde azulada con ondulación discreta y pavimento cálido en los caminos del borde. La Pagoda conserva su pabellón y estanque modelados anteriormente. «Ver entrada y laguna» permite comparar el conjunto desde una vista diagonal. Estas alturas representan la fotografía; no constituyen un levantamiento topográfico ni una ruta accesible verificada.


### Plazoleta lateral del Hall Principal

La fotografía recortada y la captura del modelo sitúan una pequeña plazoleta en el hueco a la izquierda del portal principal, entre el Hall y Eugenio Espejo. La composición se completa de manera simétrica: fuente de dos niveles sobre el eje central, cuatro canteros con setos y flores violetas, dos árboles y reja frontal con acceso abierto centrado y pilares claros. Encaja en el espacio existente sin alterar las huellas, el portal, las gradas ni el paso hacia Einstein. Las dimensiones y la mitad no visible de la composición se interpretan visualmente. «Ver plazoleta lateral» permite revisar ese rincón.

El frente de Newton hacia la laguna se ajustó con la fotografía transversal: acabado naranja, dos filas de ventanas, cubierta baja y portal con gradas. La tarjeta de Newton incluye «Ver frente de Newton»; las rutas parten y llegan a ese acceso. La orilla de la laguna incluye piedras irregulares, un afloramiento rocoso y vegetación en grupos. Proporciones aproximadas sobre las huellas OSM.

Epicuro tiene ahora el frente elevado visto desde Da Vinci: base roja, balcón, tres filas de ventanas con molduras, torre con cubierta piramidal verde y fuente baja con nicho arqueado. El acceso a la derecha desde Pampite baja por gradas al patio; su forma es provisional hasta recibir la fotografía de ese acceso. Se revisa desde «Ver torre y fuente» en la ficha de Epicuro.

La segunda entrada de Miguel de Santiago, hacia el jardín del lado sur, está modelada con torre de vidrio desde el suelo, cubierta plana verde, puertas centrales, pequeño alero y camino flanqueado por setos y árboles altos. La ficha del edificio incluye «Ver entrada del jardín».

Ápice se representa bajo la terraza de Hayek y aparece en la búsqueda como cafetería y punto de encuentro del piso 0. La ficha también identifica los subsuelos −1 y −2 de aulas. La ruta exterior llega a la entrada del puente; el descenso interior y los planos de los subsuelos están pendientes.


La huella anteriormente identificada como GOBE se muestra como «La casita de la 12 de octubre», según la indicación del estudiante. La fotografía guía el cuerpo blanco, entramado de madera rojiza, cubierta a dos aguas con hastial alto, ventanas de ático, balcones y arcos inferiores. El volumen de dos plantas y ático es una estimación visual; la descarga original de OSM se conserva.

Gastón, el cerdito, camina automáticamente por senderos entre la casita y el Hall y visita el borde ajardinado de la laguna y vuelve por el sendero amplio. Pancho y Pancha son dos galgos negros que recorren el patio de la entrada principal de Miguel de Santiago. Los modelos incluyen nombres y movimiento de patas y cola. Los recorridos dejan espacio para el cuerpo completo al girar y se comprueban contra edificios, agua, muros, rejas, bebederos y pedestales de los accesos. Cada movimiento comprueba también el tramo entre cuadros; si queda bloqueado, el animal se detiene sin saltar al otro lado. Las barreras añadidas al modelo se registran en `src/lib/animalObstacles.ts`; el jardín de las banderas se mantiene libre. La animación se pausa al ocultar la pestaña.

La última fotografía del Hall deja el césped central despejado: se retiran los árboles ilustrativos de esa parcela y se añaden la reja negra del extremo de la calle, retornos laterales y diez banderas bicolores en dos filas de cinco. Las banderas son recreaciones gráficas, no emblemas oficiales verificados.

La referencia de la Pagoda corrige sus gradas: ocho peldaños que bajan y se ensanchan hacia el camino, con muros rojos inclinados y remates verdes. Piedras y plantas acuáticas dejan libre el acceso. El terreno y los senderos descienden de forma continua hasta el pie de la rampa de acceso al puente del lado del campus. El desnivel se ajusta a la referencia del Coliseo y es una estimación visual, sin levantar una topografía ni certificar accesibilidad; el tablero del puente y los niveles de las canchas se conservan.


### Coliseo y camino en bajada

Las fotografías del estudiante corrigen el Coliseo Alexandros: paredes naranja rojizas, vanos horizontales con persianas, molduras arqueadas, puerta acristalada y cubierta metálica verde con un segundo nivel ventilado y remate central. El camino existente desciende desde arriba de la Pagoda, pasa junto al Coliseo y llega al pie de la rampa del puente. El césped de enfrente permanece más alto, con un borde de contención y gradas; la vegetación deja libre el camino. La ficha del Coliseo incluye «Ver fachada y bajada». La caída total representada es aproximadamente 3.2 m y la diferencia entre camino y césped ronda 0.5–1 m frente a la fachada: son estimaciones visuales, no medidas topográficas. Se conserva la huella OSM del Coliseo; la posición de la puerta y las gradas es aproximada.


### Jardín deportivo, gradas y casita del Obelisco

La segunda serie de fotografías del estudiante guía las cintas naranjas, redes blancas, arena con huellas, setos, mallas protectoras con acceso abierto y luminarias de las dos canchas de vóley. La terraza de mesas incorpora cuatro pérgolas oscuras con enredaderas, bases de piedra, senderos, canteros, árboles y sombrillas rojas.

Frente al Coliseo hay una escalinata ancha que une el camino inferior con el césped elevado del Obelisco. La casita de esa zona corresponde al volumen catalogado como «Baños · zona deportiva»; tiene paredes rojizas y cubierta baja. Su huella se desplaza visualmente 4.4 m hacia el oeste y 6 m hacia el norte para despejar el paso y separarla del Obelisco. El ajuste se aplica en `campus.ts` para compartir la posición entre mallas, recortes y obstáculos, sin editar el archivo OSM original. Las dimensiones y desplazamientos son aproximaciones interpretadas de las fotos.

El mural usa la fotografía aportada por el estudiante, guardada intacta en `public/textures/coliseo-annex-mural-reference.jpg`; las coordenadas UV seleccionan el panel de la imagen. Las vistas de la ficha del Coliseo permiten acercarse al mural, las gradas y el jardín con vóley.

### Interior de Galileo, Einstein, Darwin y Newton

Los cuatro edificios comparten un mismo juego de planos de evacuación (Departamento de Operaciones, pisos 1–3). Las fotos se guardan solo en local, en `referencias/planos-evacuacion/`, y `scripts/trazar-planos-evacuacion.py` genera a partir de ellas `src/data/academicComplexWalls.ts`. El proceso rectifica cada foto a una hoja común usando la leyenda y el cajetín, alinea los pisos 2 y 3 sobre el 1 por sus muros, columnas y gradas, y georreferencia el conjunto con el jardín en estrella de la salida de Newton hacia la laguna y la esquina de Galileo sobre imagen satelital. La calibración está en `scripts/planos-evacuacion.json`.

Solo se trazan los muros rectos dibujados con línea doble. Las gradas en arco, las curvas y los tabiques de línea simple no aparecen, y las posiciones tienen un error aproximado de ±1 m. Según la aclaración del estudiante, Newton incluye el ala de las dos salidas que OSM etiqueta como Casa Blanca. Las aulas todavía no están identificadas, así que el interior no forma parte de la navegación. El corte sin techo con selector de piso está oculto (`ACADEMIC_COMPLEX.visible`): el trazado desde fotos se desvía demasiado de la planta real. Se reactivará cuando se tengan los planos en CAD del Departamento de Operaciones.
