import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Stroke({ size = 22, children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
}

export const WalkerIcon = (props: IconProps) => <Stroke {...props}><circle cx="13" cy="4" r="2" /><path d="m8 21 3-7 3 3v4M6 12l3-4 4 1 2 4 4 1M11 9l-1 5" /></Stroke>
export const SearchIcon = (props: IconProps) => <Stroke strokeWidth="2.6" {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Stroke>
export const LayersIcon = (props: IconProps) => <Stroke {...props}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></Stroke>
export const InfoIcon = (props: IconProps) => <Stroke {...props}><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><circle cx="12" cy="7.6" r="0.6" fill="currentColor" /></Stroke>
export const BackIcon = (props: IconProps) => <Stroke strokeWidth="2.6" {...props}><path d="m15 5-7 7 7 7" /></Stroke>
export const CloseIcon = (props: IconProps) => <Stroke strokeWidth="2.8" {...props}><path d="M6 6l12 12M18 6 6 18" /></Stroke>
export const ArrowIcon = (props: IconProps) => <Stroke strokeWidth="2.8" {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Stroke>
export const EyeIcon = (props: IconProps) => <Stroke {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Stroke>
export const PagodaIcon = (props: IconProps) => <Stroke {...props}><path d="M3 9c4-1 6-4 9-6 3 2 5 5 9 6" /><path d="M6 9v11M18 9v11M4 20h16M9 14h6" /></Stroke>
export const FieldIcon = (props: IconProps) => <Stroke {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14" /><circle cx="12" cy="12" r="3" /></Stroke>
export const ColumnsIcon = (props: IconProps) => <Stroke {...props}><path d="M3 9.5 12 4l9 5.5H3Z" /><path d="M5.5 10v8M10 10v8M14 10v8M18.5 10v8M3 20.5h18" /></Stroke>
export const StadiumIcon = (props: IconProps) => <Stroke {...props}><ellipse cx="12" cy="10" rx="9" ry="4" /><path d="M3 10v5c0 2.2 4 4 9 4s9-1.8 9-4v-5" /><path d="M8 14.7v3.8M12 15v4M16 14.7v3.8" /></Stroke>
export const BusIcon = (props: IconProps) => <Stroke {...props}><rect x="4" y="3.5" width="16" height="14" rx="3" /><path d="M4 11h16M7 17.5V20M17 17.5V20" /><circle cx="8" cy="14.3" r=".6" fill="currentColor" /><circle cx="16" cy="14.3" r=".6" fill="currentColor" /></Stroke>
export const TurnIcon =(props: IconProps) => <Stroke strokeWidth="2.8" {...props}><path d="M7 20v-7a4 4 0 0 1 4-4h8" /><path d="m15 5 4 4-4 4" /></Stroke>
export const LocateIcon = ({ size = 22, ...props }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}><path d="M21 3 3 10.5l7.2 2.3L12.5 20Z" /></svg>
export const HeartIcon = ({ size = 22, ...props }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z" /></svg>
