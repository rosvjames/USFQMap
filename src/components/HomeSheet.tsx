import { useState } from 'react'
import type { SearchResult } from '../lib/search'
import { useSwipeDown } from '../lib/useSheetGestures'
import { FieldIcon, InfoIcon, PagodaIcon, SearchIcon, WalkerIcon } from './icons'

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
  const { sheet, handle, wasDragged } = useSwipeDown<HTMLElement>(() => setFolded(true))
  const showDiscover = !query && !folded

  return (
    <div className="sheet-dock home">
      <img className="peek" src="/mascota/gaston/asomado.webp" width={360} height={316} alt="" />
      <a className="osm-credit-map" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
      <section ref={sheet} className="sheet" aria-label="Buscar en el campus">
        <div className="sheet-handle" {...handle}>
          <button className="grabber" aria-label={folded ? 'Mostrar lugares del campus' : 'Plegar el panel'} aria-expanded={!folded} onClick={() => { if (!wasDragged()) setFolded(!folded) }} />
        </div>
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
            placeholder="¿A dónde vas? Prueba M302…"
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
        {query && results.length === 0 && (
          <div className="empty-results">
            <img src="/mascota/gaston/buscando.webp" width={200} height={243} alt="" />
            <p role="status">No encontramos ese lugar. Prueba con un edificio o un código como M302.</p>
          </div>
        )}

        {showDiscover && <>
          <div className="chips">
            {SHORTCUTS.map((shortcut) => <button key={shortcut.buildingId} className="chip" onClick={() => onSelectBuilding(shortcut.buildingId)}>{shortcut.label}</button>)}
          </div>
          <div className="sheet-heading">
            <h2>Descubre el campus</h2>
            <button className="info-button" onClick={onSources} aria-label="Fuentes, cobertura y créditos"><InfoIcon /></button>
          </div>
          <div className="tiles">
            <button className="tile tile-walk" onClick={onWalk}><WalkerIcon size={26} />Explorar a pie</button>
            <button className="tile tile-pagoda" onClick={onPagoda}><PagodaIcon size={26} />La Pagoda</button>
            <button className="tile tile-sports" onClick={onSports}><FieldIcon size={26} />Canchas y terrazas</button>
          </div>
        </>}
      </section>
    </div>
  )
}
