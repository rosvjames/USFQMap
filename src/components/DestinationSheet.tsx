import { useState, type ReactNode } from 'react'
import type { BuildingView } from '../lib/buildingViews'
import { useSwipeDown } from '../lib/useSheetGestures'
import { ArrowIcon, BusIcon, EyeIcon, WalkerIcon } from './icons'
import { Mascot } from './Mascot'

interface DestinationSheetProps {
  kicker: string
  title: string
  sub?: string
  walk?: { minutes: number; meters: number }
  notice?: string
  /** Gastón waiting next to the notice, while the GPS looks for the visitor. */
  noticeMascot?: boolean
  onGo?: () => void
  views: BuildingView[]
  onView: (view: BuildingView) => void
  onWalk?: () => void
  onClose: () => void
  children?: ReactNode
}

/** What and where the destination is, how long the walk takes and what to look at before leaving. Swipe down to close. */
export function DestinationSheet({ kicker, title, sub, walk, notice, noticeMascot, onGo, views, onView, onWalk, onClose, children }: DestinationSheetProps) {
  const { sheet, handle } = useSwipeDown<HTMLDivElement>(onClose)
  // Gastón stands over the head of the panel; once the content scrolls under him he steps away.
  const [scrolled, setScrolled] = useState(false)
  return (
    <div ref={sheet} className={`sheet-dock destination-dock${scrolled ? ' is-scrolled' : ''}`}>
      <div className="destination-mascot" aria-hidden="true">
        <img className="destination-clouds" src="/ui/destino-nubes.webp" width={640} height={240} alt="" />
        <img className="destination-gaston" src="/ui/gaston-destino.webp" width={600} height={563} alt="" />
      </div>
      <a className="osm-credit-map" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
      <section className="sheet destination-sheet" aria-label={`Destino: ${title}`} onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 8)}>
        <div className="sheet-handle" {...handle}>
          <span className="grabber" aria-hidden="true" />
          <div className="destination-head">
            <p className="kicker">{kicker}</p>
            <h1 className={title.length > 6 ? 'long' : undefined}>{title}</h1>
            {(sub || walk) && <p className="sub">{sub}{sub && walk && ' · '}{walk && <strong className="eta">{walk.minutes} min</strong>}</p>}
          </div>
        </div>
        {notice && <div className="sheet-note">{noticeMascot && <Mascot pose="ubicacion" />}<p role="status">{notice}</p></div>}
        {onGo && <button className="primary-button" onClick={onGo}>Iniciar ruta <ArrowIcon /></button>}
        {(views.length > 0 || onWalk) && (
          <div className="views">
            <h2>Explora este lugar</h2>
            <div className="chips">
              {views.map((view) => <button key={view.label} className="chip" onClick={() => onView(view)}>{/bus/i.test(view.label) ? <BusIcon size={20} /> : <EyeIcon size={20} />}{view.label}</button>)}
              {onWalk && <button className="chip" onClick={onWalk}><WalkerIcon size={20} />A pie</button>}
            </div>
          </div>
        )}
        {children}
      </section>
    </div>
  )
}
