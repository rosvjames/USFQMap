const MOTION = {
  buscando: 'buscando',
  ubicacion: 'ubicacion',
} as const

/** Each pose is a 512 px square with Gastón standing on the same baseline (see scripts/ui-v3-assets.py). */
export function Mascot({ pose, className = '' }: { pose: keyof typeof MOTION; className?: string }) {
  return <img className={`gaston gaston--${MOTION[pose]} ${className}`} src={`/mascota/gaston/${pose}.webp`} width={512} height={512} decoding="async" alt="" aria-hidden="true" />
}
