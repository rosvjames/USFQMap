const MOTION = {
  asomado: 'asomado',
  guiando: 'guia',
  logrado: 'logrado',
  buscando: 'buscando',
  ubicacion: 'ubicacion',
} as const

/** The high-resolution PNGs stay in the kit; the app loads only the current 512px pose (see scripts/mascota-web.py). */
export function Mascot({ pose, className = '' }: { pose: keyof typeof MOTION; className?: string }) {
  return <img className={`gaston gaston--${MOTION[pose]} ${className}`} src={`/mascota/gaston/${pose}.webp`} width={512} height={512} decoding="async" alt="" aria-hidden="true" />
}
