import type { BuildingInfo } from '../types'

// Footprints and floor counts come from OpenStreetMap (src/data/campus.json).
// Codes are only filled in where a source confirms them; add the rest after checking on site.
export const BUILDINGS: BuildingInfo[] = [
  { id: 'hall-principal', name: 'Hall Principal', osmId: 'way/395847792', aliases: ['Edificio Espejo', 'Hall'] },
  { id: 'eugenio-espejo', name: 'Eugenio Espejo', code: 'EE', osmId: 'way/395848709' },
  { id: 'miguel-de-santiago', name: 'Miguel de Santiago', code: 'MS', osmId: 'way/395842616' },
  { id: 'aristoteles', name: 'Aristóteles', code: 'A', osmId: 'way/395842617' },
  { id: 'socrates', name: 'Sócrates', osmId: 'way/395842618' },
  { id: 'lao-zi', name: 'Lao Zi', osmId: 'way/395842619', aliases: ['Lao Tse'] },
  { id: 'mozart', name: 'Mozart', osmId: 'way/395847785' },
  { id: 'coliseo', name: 'Coliseo Alexandros', osmId: 'way/395847786' },
  { id: 'pagoda', name: 'La Pagoda', osmId: 'way/395847787' },
  { id: 'galileo', name: 'Galileo', code: 'G', osmId: 'way/395847788' },
  { id: 'newton', name: 'Newton', osmId: 'way/395847789' },
  { id: 'einstein', name: 'Einstein', code: 'E', osmId: 'way/395847790' },
  { id: 'epicuro', name: 'Epicuro', code: 'EP', osmId: 'way/395848710' },
  { id: 'darwin', name: 'Darwin', code: 'DW', osmId: 'way/395848711', aliases: ['Salón Azul'] },
  { id: 'teatro-casa-blanca', name: 'Teatro Casa Blanca', osmId: 'way/395848713' },
  { id: 'casa-blanca', name: 'Casa Blanca', osmId: 'way/395849376' },
  { id: 'casa-corona', name: 'Casa Corona', osmId: 'way/395849378' },
  { id: 'maxwell', name: 'Maxwell', code: 'M', osmId: 'way/1036851212' },
  { id: 'ciceron', name: 'Cicerón', code: 'C', osmId: 'way/1036857030', aliases: ['Biblioteca'] },
  { id: 'da-vinci', name: 'Da Vinci', code: 'D', osmId: 'relation/8744168' },
  { id: 'hayek', name: 'Complejo Hayek', osmId: 'way/1049493937' },
]

export const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]))
