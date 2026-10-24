import type { ReactNode } from 'react'
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
  return (
    <div ref={sheet} className="sheet-dock destination-dock">
      <img className="destination-mascot" src="/ui/gaston-destino.webp" width={340} height={289} alt="" />
      <a className="osm-credit-map" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a>
      <section className="sheet destination-sheet" aria-label={`Destino: ${title}`}>
        <div className="sheet-handle" {...handle}>
          <span className="grabber" aria-hidden="true" />
          <div className="destination-head">
            <p className="kicker">{kicker}</p>
            <h1>{title}</h1>
            {sub && <p className="sub">{sub}</p>}
            {walk && <p className="eta"><strong>{walk.minutes} min</strong> · {walk.meters} m a pie</p>}
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
