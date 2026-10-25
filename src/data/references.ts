/** Public references identify a building/floor, never an indoor coordinate. */
export const SOURCES = {
  map: { title: 'Mapa oficial USFQ · 2023', url: 'https://www.usfq.edu.ec/es/mapa-de-la-universidad' },
  codes: { title: 'Cómo leer los códigos · USFQ, 2012', url: 'https://noticias.usfq.edu.ec/2012/08/ubicate-en-la-usfq-y-encuentra-tus.html' },
  orientation: { title: 'Orientación de estudiantes · USFQ, 2015', url: 'https://noticias.usfq.edu.ec/2015/01/orientacion-semestre2-1415.html' },
  registry: { title: 'Preguntas frecuentes · Oficina de Registro', url: 'https://www.usfq.edu.ec/en/node/2045' },
  press: { title: 'Contacto · Archivos Académicos USFQ', url: 'https://revistas.usfq.edu.ec/index.php/archivosacademicos/about/contact' },
  students: { title: 'Guía para Dragones · USFQ, 2019', url: 'https://noticias.usfq.edu.ec/2019/08/guia-de-supervivencia-para-dragones.html' },
  newton: { title: 'Directorio académico · ubicación N104A', url: 'https://www.usfq.edu.ec/es/perfiles/daniela-estefania-ona-villamil' },
  infrastructure: { title: 'Reporte de infraestructura · USFQ, enero 2019', url: 'https://www.usfq.edu.ec/sites/default/files/inline-files/Reporte_Infraestructura.pdf' },
  campusPhoto: { title: 'Fotografía del campus · USFQ Next', url: 'https://www.usfq.edu.ec/sites/default/files/2024-08/usfq-next-main-slide.jpg' },
  obeliskPhoto: { title: 'Obelisco y jardines · Noticias USFQ, 2021', url: 'https://noticias.usfq.edu.ec/2021/03/usfq-elegida-como-la-universidad-1-del.html' },
  david: { title: 'El David en la USFQ · Alumni, 2024', url: 'https://vivealumni.usfq.edu.ec/2024/05/esta-obra-representa-la-razon-de-ser-de.html' },
  davidScan: { title: 'David (Michelangelo) · Scan the World @ Myminifactory.com · CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:David_(Michelangelo).stl' },
  pigModel: { title: 'Farm Pig · Innerscene · CC0', url: 'https://www.innerscene.com/tools/library/3d-parts/farm-pig-85281eb9' },
  dogModel: { title: 'Large Dog Standing · Innerscene · CC0', url: 'https://www.innerscene.com/tools/library/3d-parts/large-dog-standing-6d1b30be' },
  satellite: { title: 'Vista satelital del campus · Apple Maps', url: 'https://maps.apple.com/frame?map=satellite&center=-0.197353%2C-78.436621&span=0.004231%2C0.003931' },
}

export interface LocationReference {
  code: string
  buildingId: string
  floor: number
  label: string
  source: keyof typeof SOURCES
  historical?: boolean
}

export const LOCATIONS: LocationReference[] = [
  { code: 'M106', buildingId: 'maxwell', floor: 1, label: 'Aula M106', source: 'orientation', historical: true },
  { code: 'M202', buildingId: 'maxwell', floor: 2, label: 'Aula M202', source: 'orientation', historical: true },
  { code: 'M210', buildingId: 'maxwell', floor: 2, label: 'Aula M210', source: 'orientation', historical: true },
  { code: 'M302', buildingId: 'maxwell', floor: 3, label: 'Aula M302', source: 'codes', historical: true },
  { code: 'M309', buildingId: 'maxwell', floor: 3, label: 'Aula M309', source: 'orientation', historical: true },
  { code: 'D127', buildingId: 'da-vinci', floor: 1, label: 'Aula D127', source: 'orientation', historical: true },
  { code: 'G206', buildingId: 'galileo', floor: 2, label: 'Oficina G206', source: 'codes', historical: true },
  { code: 'DW010', buildingId: 'darwin', floor: 0, label: 'Laboratorio DW010', source: 'codes', historical: true },
  { code: 'G111', buildingId: 'galileo', floor: 1, label: 'Counter de Registro', source: 'registry' },
  { code: 'E104', buildingId: 'einstein', floor: 1, label: 'Oficina E104 · trámites académicos', source: 'registry' },
  { code: 'CB110', buildingId: 'casa-blanca', floor: 1, label: 'USFQ PRESS', source: 'press' },
  { code: 'H100F', buildingId: 'hayek', floor: 1, label: 'Decanato de Estudiantes', source: 'students', historical: true },
  { code: 'N104A', buildingId: 'newton', floor: 1, label: 'Apoyo académico · oficina N104A', source: 'newton' },
]

/** Callout numbers in the official 2023 map. No coordinates inferred from its illustration. */
export const MAP_NUMBERS: Record<string, number> = {
  'miguel-de-santiago': 1, aristoteles: 2, socrates: 3, 'lao-zi': 4,
  mozart: 5, obelisco: 6, pagoda: 7, coliseo: 8, 'hannah-arendt': 10, 'casa-blanca': 11,
  'teatro-casa-blanca': 12, 'casa-tomate': 13, newton: 14, galileo: 15,
  veterinaria: 18, 'hall-principal': 20, einstein: 21, darwin: 22,
  maxwell: 24, 'casa-corona': 25, odontologia: 26, 'da-vinci': 27,
  epicuro: 29, ciceron: 30, hayek: 35, 'dragon-shop': 37,
}
