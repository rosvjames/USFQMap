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
  { id: 'newton', name: 'Newton', code: 'N', osmId: 'way/395847789' },
  { id: 'einstein', name: 'Einstein', code: 'E', osmId: 'way/395847790' },
  { id: 'epicuro', name: 'Epicuro', code: 'EP', osmId: 'way/395848710' },
  { id: 'darwin', name: 'Darwin', code: 'DW', osmId: 'way/395848711', aliases: ['Salón Azul'] },
  { id: 'teatro-casa-blanca', name: 'Teatro Casa Blanca', osmId: 'way/395848713' },
  { id: 'casa-blanca', name: 'Casa Blanca', code: 'CB', osmId: 'way/395849376' },
  { id: 'casa-corona', name: 'Casa Corona', osmId: 'way/395849378' },
  { id: 'maxwell', name: 'Maxwell', code: 'M', osmId: 'way/1036851212' },
  { id: 'ciceron', name: 'Cicerón', code: 'C', osmId: 'way/1036857030', aliases: ['Biblioteca'] },
  { id: 'da-vinci', name: 'Da Vinci', code: 'D', osmId: 'relation/8744168' },
  { id: 'hayek', name: 'Complejo Hayek', code: 'H', osmId: 'way/1049493937', aliases: ['Decanato de Estudiantes'] },
  { id: 'casa-tomate', name: 'Casa Tomate', osmId: 'way/1554300326' },
  { id: 'hannah-arendt', name: 'Casa Hannah Arendt', osmId: 'way/1049496676', aliases: ['Hanna Arendt'] },
  { id: 'odontologia', name: 'Clínica Odontológica', osmId: 'way/1036851384' },
  { id: 'veterinaria', name: 'Clínica Veterinaria', osmId: 'way/1036867750' },
  { id: 'dragon-shop', name: 'Dragon Shop', osmId: 'way/1036853470' },
  { id: 'obelisco', name: 'Obelisco', osmId: 'way/1049503109' },
  { id: 'taller-metal', name: 'Taller de Metal-Madera', osmId: 'way/395842620' },
  { id: 'herbario', name: 'Herbario USFQ', osmId: 'way/1036855377' },
  { id: 'mantenimiento', name: 'Oficinas de Mantenimiento', osmId: 'way/1036860351', aliases: ['Planta Física'] },
  { id: 'gobe', name: 'GOBE', osmId: 'way/1036865897' },
  { id: 'guardiania-norte', name: 'Guardianía · entrada principal', osmId: 'way/395853817' },
  { id: 'guardiania-sur', name: 'Guardianía · acceso al puente', osmId: 'way/1036855779' },
  { id: 'banos-deportes', name: 'Baños · zona deportiva', osmId: 'way/395853835' },
  { id: 'com-oeste', name: 'COM · sector oeste', osmId: 'way/1036855378' },
  { id: 'com-este', name: 'COM · sector este', osmId: 'way/395842621' },
]

export const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]))
