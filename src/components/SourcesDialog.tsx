import { useEffect, useRef } from 'react'
import { SOURCES } from '../data/references'

export function SourcesDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return (
    <dialog ref={dialog} className="sources-dialog" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="sources-title">
      <button className="dialog-close" onClick={onClose} aria-label="Cerrar fuentes">×</button>
      <p className="eyebrow">Detrás del mapa</p>
      <h2 id="sources-title">Fuentes y cobertura</h2>
      <p>El campus se construye con huellas y senderos de OpenStreetMap. Los servicios menores conservan los nombres de OpenStreetMap; dos huellas sin identificación se muestran como «Nombre pendiente».</p>
      <div className="coverage-note"><strong>Interiores pendientes de levantar</strong><p>No encontramos planos públicos de distribución de aulas. Las referencias identifican edificio y piso; no la puerta ni el recorrido interior. Algunos códigos vienen de publicaciones antiguas y pueden haber cambiado.</p></div>
      <p>Los materiales, la cúpula, las ventanas, molduras y vegetación se inspiran en fotografías públicas de la USFQ y en la ilustración del campus. Los detalles y las posiciones de los árboles son aproximados. Usamos alturas de OpenStreetMap cuando existen y estimaciones visuales en los demás casos; no son mediciones arquitectónicas.</p>
      <p>La vista satelital de Apple Maps guía los colores de las cubiertas, las claraboyas, los patios pavimentados y la plantación alrededor de la laguna. El campus, el puente y Hayek reciben el detalle principal; los edificios del entorno son volúmenes simplificados. Los patios y anchos interpretados desde la imagen son aproximados y no confirman nuevos tramos de navegación.</p>
      <p>La entrada del Hall Principal, sus gradas, el David y los dos leones se modelaron a partir de las fotos compartidas por el estudiante. Las esculturas y las dimensiones son aproximaciones visuales; no son escaneos ni medidas tomadas en sitio.</p>
      <p>La Pagoda se representa como un pabellón bajo de madera, con cubierta curva de tejas, galería, puente arqueado y pequeño estanque, según las fotos aportadas por el estudiante. Sus dimensiones y la forma del estanque son aproximadas.</p>
      <p>La entrada de Maxwell mira al patio de Darwin y Galileo según la captura del estudiante. El arco de piedra, las columnas, las gradas y los leones claros recostados siguen su fotografía; la posición exacta y las dimensiones son aproximadas.</p>
      <ul className="source-list">
        {Object.values(SOURCES).map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true">↗</span></a></li>)}
      </ul>
      <p className="note">Consulta de fuentes: 1 de octubre de 2026. Las entradas a edificios y los tramos punteados son aproximaciones. La navegación utiliza el mapa y las rutas exteriores. Los desniveles y el mobiliario deportivo se modelaron según la descripción del estudiante, con alturas aproximadas.</p>
      <a className="osm-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© Colaboradores de OpenStreetMap · ODbL</a>
    </dialog>
  )
}
