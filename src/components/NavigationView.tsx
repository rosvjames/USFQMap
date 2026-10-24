import { ArrowIcon, BackIcon, TurnIcon } from './icons'

interface NavigationViewProps {
  steps: string[]
  step: number
  onStep: (step: number) => void
  walk?: { minutes: number; meters: number }
  destination: string
  onEnd: () => void
}

/** Long steps read "what to do: what you will see"; the part after the colon becomes a quieter detail line. */
function splitStep(text: string): [string, string] {
  const colon = text.indexOf(': ')
  if (colon < 0) return [text, '']
  const detail = text.slice(colon + 2)
  return [text.slice(0, colon), detail.charAt(0).toUpperCase() + detail.slice(1)]
}

/** Turn-by-turn mode: the mascot reads out one step at a time; tapping the banner moves to the next one. */
export function NavigationView({ steps, step, onStep, walk, destination, onEnd }: NavigationViewProps) {
  const last = step === steps.length - 1
  const [instruction, detail] = splitStep(steps[step])
  return <>
    <section className="nav-banner" aria-label="Indicación actual" aria-live="polite">
      <p className="nav-brand" aria-hidden="true">Explora <span>USFQ</span></p>
      <div className="nav-body">
        <span className="nav-turn"><TurnIcon size={24} /></span>
        <div className="nav-text">
          <p className="nav-progress">
            Paso {step + 1} de {steps.length}
            <span className="nav-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === step ? 'current' : i < step ? 'done' : ''} />)}</span>
          </p>
          <p className="nav-step">{instruction}</p>
          {detail && <p className="nav-detail">{detail}</p>}
          {!last && <button className="nav-next" onClick={() => onStep(step + 1)}>Siguiente paso <ArrowIcon size={18} /></button>}
        </div>
      </div>
      <img key={step} className={`nav-mascot${last ? ' arrived' : ''}`} src={last ? '/ui/gaston-llegada.webp' : '/ui/gaston-guia.webp'} width={480} height={480} alt="" />
    </section>

    <section className="nav-bar" aria-label="Resumen del recorrido">
      <div className="nav-summary">
        {walk && <p className="eta-inline"><strong>{walk.minutes} min</strong> · {walk.meters} m</p>}
        <p className="sub">Hacia {destination}</p>
        <span className="progress" aria-hidden="true"><span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} /></span>
      </div>
      {step > 0 && <button className="secondary-button icon-only" onClick={() => onStep(step - 1)} aria-label="Paso anterior"><BackIcon /></button>}
      <button className="secondary-button" onClick={onEnd}>Terminar</button>
    </section>
  </>
}
