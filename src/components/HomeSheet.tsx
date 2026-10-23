import { useState } from 'react'
import type { SearchResult } from '../lib/search'
import { useSwipeDown } from '../lib/useSheetGestures'
import { ArrowIcon, FieldIcon, InfoIcon, PagodaIcon, SearchIcon, WalkerIcon } from './icons'
import { Mascot } from './Mascot'

// Places visitors ask for most, offered before they type anything.
const SHORTCUTS = [
  { label: 'Biblioteca', buildingId: 'ciceron' },
  { label: 'Hall Principal', buildingId: 'hall-principal' },
  { label: 'Coliseo', buildingId: 'coliseo' },
  { label: 'Hayek', buildingId: 'hayek' },
]

interface HomeSheetProps {
  query: string
  onQuery: (query: string) => void
  results: SearchResult[]
  onChoose: (result: SearchResult) => void
  onSelectBuilding: (buildingId: string) => void
  onWalk: () => void
  onPagoda: () => void
  onSports: () => void
  onSources: () => void
}

export function HomeSheet({ query, onQuery, results, onChoose, onSelectBuilding, onWalk, onPagoda, onSports, onSources }: HomeSheetProps) {
  const [folded, setFolded] = useState(false)
  const { sheet, handle, wasDragged } = useSwipeDown<HTMLDivElement>(() => setFolded(true))
  const showDiscover = !query && !folded

  return (
    <div ref={sheet} className={`sheet-dock home${folded ? ' is-folded' : ''}${query ? ' is-searching' : ''}`}>
      <div className="peek-window" aria-hidden="true"><Mascot className="peek" pose="asomado" /></div>
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
            {SHORTCUTS.map((shortcut) => <button key={shortcut.buildingId} className="chip" onClick={() => onSelectBuilding(shortcut.buildingId)}>{shortcut.label}</button>)}
          </div>
          <div className="sheet-heading">
            <h2>Conoce el campus</h2>
            <button className="info-button" onClick={onSources} aria-label="Fuentes, cobertura y créditos"><InfoIcon /></button>
          </div>
          <div className="tiles">
            <button className="tile tile-walk" onClick={onWalk}><WalkerIcon size={22} /><span><strong>Explorar a pie</strong><small>Recorre el campus en primera persona</small></span><ArrowIcon size={20} /></button>
            <button className="tile tile-pagoda" onClick={onPagoda}><PagodaIcon size={22} /><span>La Pagoda</span><ArrowIcon size={18} /></button>
            <button className="tile tile-sports" onClick={onSports}><FieldIcon size={22} /><span>Canchas y terrazas</span><ArrowIcon size={18} /></button>
          </div>
        </>}
      </section>
    </div>
  )
}
