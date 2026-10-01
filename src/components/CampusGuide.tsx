import { useEffect, useRef } from 'react'
import { BUILDINGS } from '../data/buildings'
import { LOCATIONS, MAP_NUMBERS, SOURCES } from '../data/references'

export function CampusGuide({ onSelectBuilding, onWalk, onSports }: { onSelectBuilding: (id: string) => void; onWalk: () => void; onSports: () => void }) {
  return (
    <section className="guide">
      <p className="eyebrow">Universidad San Francisco de Quito</p>
      <h1>Campus Cumbayá</h1>
      <p className="guide-intro">Explora Cumbayá en 3D, encuentra un edificio o busca el código de tu aula.</p>
      <button className="walk-button" onClick={onWalk}>Recorrer a pie <span aria-hidden="true">↗</span></button>
      <button className="sports-button" onClick={onSports}>Ver canchas y terrazas <span aria-hidden="true">↗</span></button>
      <div className="guide-stats"><span><strong>{BUILDINGS.length}</strong> lugares en el mapa</span><span><strong>{LOCATIONS.length}</strong> referencias de aulas y oficinas</span></div>
      <details className="directory">
        <summary>Explorar directorio <span aria-hidden="true">＋</span></summary>
        <div className="directory-list">
          {BUILDINGS.map((building) => <button key={building.id} onClick={() => onSelectBuilding(building.id)}>
            <span className="map-number">{MAP_NUMBERS[building.id]?.toString().padStart(2, '0') ?? '—'}</span>
            <span>{building.name}</span><span aria-hidden="true">↗</span>
          </button>)}
        </div>
      </details>
      <p className="guide-hint">Arrastra para moverte · rueda para acercar<br />Botón derecho para girar el mapa</p>
    </section>
  )
}

export function SourcesDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return (
    <dialog ref={dialog} className="sources-dialog" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="sources-title">
      <button className="dialog-close" onClick={onClose} aria-label="Cerrar fuentes">×</button>
      <p className="eyebrow">Detrás del mapa</p>
      <h2 id="sources-title">Lo que conocemos.</h2>
      <p>El campus se construye con huellas y senderos de OpenStreetMap. Los números de referencia siguen el mapa de la USFQ de 2023. Los servicios menores conservan los nombres de OpenStreetMap; dos huellas sin identificación se muestran como «Nombre pendiente».</p>
      <div className="coverage-note"><strong>Interiores pendientes de levantar</strong><p>No encontramos planos públicos de distribución de aulas. Las referencias identifican edificio y piso; no la puerta ni el recorrido interior. Las publicaciones antiguas se señalan como históricas.</p></div>
      <p>Los materiales, la cúpula, las ventanas, molduras y vegetación se inspiran en fotografías públicas de la USFQ y en la ilustración del campus. Los detalles y las posiciones de los árboles son aproximados. Usamos alturas de OpenStreetMap cuando existen y estimaciones visuales en los demás casos; no son mediciones arquitectónicas.</p>
      <ul className="source-list">
        {Object.values(SOURCES).map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true">↗</span></a></li>)}
      </ul>
      <p className="note">Consulta de fuentes: 1 de octubre de 2026. Las entradas a edificios y los tramos punteados son aproximaciones. El recorrido a pie incluye el campus principal y el puente peatonal hacia Hayek. Los desniveles y el mobiliario deportivo se modelaron según la descripción del estudiante, con alturas aproximadas.</p>
      <a className="osm-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© Colaboradores de OpenStreetMap · ODbL</a>
    </dialog>
  )
}
