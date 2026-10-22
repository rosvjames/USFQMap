import type { ReactNode } from 'react'
import type { BuildingView } from '../lib/buildingViews'
import { useSwipeDown } from '../lib/useSheetGestures'
import { ArrowIcon, EyeIcon, WalkerIcon } from './icons'

interface DestinationSheetProps {
  kicker: string
  title: string
  sub?: string
  walk?: { minutes: number; meters: number }
  notice?: string
  onGo?: () => void
  views: BuildingView[]
  onView: (view: BuildingView) => void
  onWalk?: () => void
  onClose: () => void
  children?: ReactNode
}

/** What and where the destination is, how long the walk takes and what to look at before leaving. Swipe down to close. */
export function DestinationSheet({ kicker, title, sub, walk, notice, onGo, views, onView, onWalk, onClose, children }: DestinationSheetProps) {
  const { sheet, handle } = useSwipeDown<HTMLElement>(onClose)
  return (
    <div className="sheet-dock">
      <a className="osm-credit-map" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
      <section ref={sheet} className="sheet destination-sheet" aria-label={`Destino: ${title}`}>
        <div className="sheet-handle" {...handle}>
          <span className="grabber" aria-hidden="true" />
          <div className="destination-head">
            <div>
              <p className="kicker">{kicker}</p>
              <h1>{title}</h1>
              {sub && <p className="sub">{sub}</p>}
            </div>
            {walk && <p className="eta"><strong>{walk.minutes} min</strong><span>{walk.meters} m a pie</span></p>}
          </div>
        </div>
        {notice && <p className="sheet-note" role="status">{notice}</p>}
        {onGo && <button className="primary-button" onClick={onGo}>¡Vamos! <ArrowIcon /></button>}
        {(views.length > 0 || onWalk) && (
          <div className="views">
            <h2>Mira antes de ir</h2>
            <div className="chips">
              {views.map((view) => <button key={view.label} className="chip" onClick={() => onView(view)}><EyeIcon size={18} />{view.label}</button>)}
              {onWalk && <button className="chip" onClick={onWalk}><WalkerIcon size={18} />A pie</button>}
            </div>
          </div>
        )}
        {children}
      </section>
    </div>
  )
}
