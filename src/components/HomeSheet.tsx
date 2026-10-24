import { useState } from 'react'
import type { SearchResult } from '../lib/search'
import { useSwipeDown } from '../lib/useSheetGestures'
import { ArrowIcon, BookIcon, CapIcon, ColumnsIcon, FieldIcon, InfoIcon, PagodaIcon, SearchIcon, StadiumIcon, WalkerIcon } from './icons'
import { Mascot } from './Mascot'

// Places visitors ask for most, offered before they type anything.
const SHORTCUTS = [
  { label: 'Biblioteca', buildingId: 'ciceron', Icon: BookIcon },
  { label: 'Hall Principal', buildingId: 'hall-principal', Icon: ColumnsIcon },
  { label: 'Coliseo', buildingId: 'coliseo', Icon: StadiumIcon },
  { label: 'Hayek', buildingId: 'hayek', Icon: CapIcon },
]

// Places worth a visit, each pictured with a view of the 3D campus; 'sports' frames the courts instead of one building.
const PLACES = [
  { label: 'La Pagoda', target: 'pagoda', image: 'pagoda', Icon: PagodaIcon },
  { label: 'Coliseo Alexandros', target: 'coliseo', image: 'coliseo', Icon: StadiumIcon },
  { label: 'Hall Principal', target: 'hall-principal', image: 'hall-principal', Icon: ColumnsIcon },
  { label: 'Canchas y terrazas', target: 'sports', image: 'canchas', Icon: FieldIcon },
]

interface HomeSheetProps {
  query: string
  onQuery: (query: string) => void
  results: SearchResult[]
  onChoose: (result: SearchResult) => void
  onSelectBuilding: (buildingId: string) => void
  onWalk: () => void
  onSports: () => void
  onSources: () => void
}

export function HomeSheet({ query, onQuery, results, onChoose, onSelectBuilding, onWalk, onSports, onSources }: HomeSheetProps) {
  const [folded, setFolded] = useState(false)
  const { sheet, handle, wasDragged } = useSwipeDown<HTMLDivElement>(() => setFolded(true))
  const showDiscover = !query && !folded

  return (
    <div ref={sheet} className={`sheet-dock home${folded ? ' is-folded' : ''}${query ? ' is-searching' : ''}`}>
      <div className="peek-window" aria-hidden="true"><img className="peek" src="/ui/gaston-asomado.webp" width={340} height={269} alt="" /></div>
      <a className="osm-credit-map" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
      <section className="sheet" aria-label="Buscar en el campus">
        <div className="sheet-handle" {...handle}>
          <button className="grabber" aria-label={folded ? 'Mostrar lugares del campus' : 'Plegar el panel'} aria-expanded={!folded} onClick={() => { if (!wasDragged()) setFolded(!folded) }} />
        </div>
        {showDiscover && <div className="home-intro"><p className="kicker">Campus Cumbayá</p><h2>Encuentra tu destino</h2></div>}
        <label className="search-field">
          <SearchIcon />
          <span className="visually-hidden">Buscar aula o edificio</span>
          <input
            type="search"
            name="destino"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) onChoose(results[0]) }}
            onFocus={() => setFolded(false)}
            placeholder="Buscar aula o edificio"
          />
        </label>

        {results.length > 0 && (
          <ul className="results">
            {results.map((result) => (
              <li key={result.key}>
                <button onClick={() => onChoose(result)}>
                  <strong>{result.title}</strong>
                  <span>{result.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && <div className="empty-results" role="status"><Mascot pose="buscando" /><div><strong>No encontramos ese lugar</strong><p>Prueba con otro nombre o un código como M302.</p></div></div>}

        {showDiscover && <>
          <div className="chips quick-destinations" role="group" aria-label="Destinos frecuentes">
            {SHORTCUTS.map(({ label, buildingId, Icon }) => <button key={buildingId} className="chip" onClick={() => onSelectBuilding(buildingId)}><Icon size={20} />{label}</button>)}
          </div>
          <button className="walk-card" onClick={onWalk}>
            <WalkerIcon size={28} />
            <span><strong>Explorar a pie</strong><small>Recorre el campus en primera persona</small></span>
            <img src="/ui/explorar-a-pie.svg" width={300} height={100} alt="" />
            <ArrowIcon size={22} />
          </button>
          <div className="sheet-heading">
            <h2>Conoce el campus</h2>
            <button className="info-button" onClick={onSources} aria-label="Fuentes, cobertura y créditos"><InfoIcon /></button>
          </div>
          <ul className="places">
            {PLACES.map(({ label, target, image, Icon }) => (
              <li key={target}>
                <button className="place-card" onClick={() => target === 'sports' ? onSports() : onSelectBuilding(target)}>
                  <img src={`/ui/lugares/${image}.webp`} width={640} height={320} alt="" loading="lazy" />
                  <span><Icon size={18} />{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>}
      </section>
    </div>
  )
}
