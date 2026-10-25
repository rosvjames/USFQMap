import { describe, expect, it } from 'vitest'
import { search } from './search'

describe('room search fallback', () => {
  it.each([
    ['Maxwell 100', 'maxwell', 1, 'M100'],
    ['maxwell 199', 'maxwell', 1, 'M199'],
    ['M200', 'maxwell', 2, 'M200'],
    ['Maxwell 299', 'maxwell', 2, 'M299'],
    ['M300', 'maxwell', 3, 'M300'],
    ['Maxwell 312', 'maxwell', 3, 'M312'],
    ['M399', 'maxwell', 3, 'M399'],
    ['Miguel de Santiago 312', 'miguel-de-santiago', 3, 'MS312'],
    ['Eugenio Espejo 312', 'eugenio-espejo', 3, 'EE312'],
    ['Galileo 312', 'galileo', 3, 'G312'],
    ['Einstein 312', 'einstein', 3, 'E312'],
    ['Epicuro 312', 'epicuro', 3, 'EP312'],
    ['Darwin 312', 'darwin', 3, 'DW312'],
    ['Casa Blanca 312', 'casa-blanca', 3, 'CB312'],
    ['Cicerón 312', 'ciceron', 3, 'C312'],
    ['Da Vinci 312', 'da-vinci', 3, 'D312'],
    ['Hayek 312', 'hayek', 3, 'H312'],
    ['Casa Corona 312', 'casa-corona', 3, 'Casa Corona 312'],
    ['Biblioteca 212', 'ciceron', 2, 'C212'],
    ['Sócrates 112', 'socrates', 1, 'Sócrates 112'],
    ['Lao Zi 112', 'lao-zi', 1, 'Lao Zi 112'],
    ['Mozart 112', 'mozart', 1, 'Mozart 112'],
    ['A112', 'aristoteles', 1, 'A112'],
    ['N299', 'newton', 2, 'N299'],
  ])('finds %s at the building and floor', (query, buildingId, floor, title) => {
    expect(search(query)[0]).toMatchObject({ kind: 'building', buildingId, floor, title, inferred: true })
  })

  it.each([
    'Maxwell 400', 'M999', 'Maxwell 099', 'Maxwell 1000', 'Maxwell 312 basura',
    'A200', 'Aristóteles 300', 'Sócrates 200', 'Lao Tse 300', 'Mozart 299',
    'N300', 'Newton 399', 'La casita de la 12 de octubre 100', 'Casita 100',
    'Oficinas de Mantenimiento 100', 'Planta Física 200', 'Galileo S1', 'Hayek S3',
  ])('does not invent a room for %s', (query) => {
    expect(search(query)).toEqual([])
  })

  it('keeps documented locations when searched by building name', () => {
    expect(search('Maxwell 302')[0]).toMatchObject({ title: 'M302', reference: { code: 'M302' } })
    expect(search('Newton 104A')[0]).toMatchObject({ title: 'N104A', reference: { code: 'N104A' } })
  })

  it.each([
    ['Hayek S1', -1, 'Hayek S1'],
    ['H-S2', -2, 'Hayek S2'],
    ['Complejo Hayek S1', -1, 'Hayek S1'],
    ['S1', -1, 'Hayek S1'],
    ['S2', -2, 'Hayek S2'],
  ])('finds the Hayek basement level for %s', (query, floor, title) => {
    expect(search(query)[0]).toMatchObject({ buildingId: 'hayek', floor, title, landmark: true })
    expect(search(query)[0].subtitle.toLowerCase()).toContain(`subsuelo ${Math.abs(floor)}`)
  })

  it.each([
    ['H-S1-01', -1, 'HS101'],
    ['Hayek S2 12', -2, 'HS212'],
  ])('infers the Hayek basement room for %s', (query, floor, title) => {
    expect(search(query)[0]).toMatchObject({ buildingId: 'hayek', floor, title, inferred: true })
    expect(search(query)[0].subtitle).toContain(`subsuelo ${Math.abs(floor)}`)
  })

  it('provides floor directions without claiming an exact classroom position', () => {
    const result = search('Maxwell 312')[0]
    expect(result).toMatchObject({ instruction: expect.stringMatching(/Maxwell.*sube al piso 3/) })
    expect(result.subtitle).toContain('aula sin confirmar')
    expect(search('Hayek S2')[0]).toMatchObject({ instruction: expect.stringContaining('baja al subsuelo 2') })
    expect(search('Mozart 112')[0]).toMatchObject({ instruction: expect.stringContaining('piso 1') })
  })
})

describe('gym search', () => {
  it.each(['Gimnasio', 'gimnasio', 'gimna'])('routes %s to the back of the Coliseo', (query) => {
    expect(search(query)[0]).toMatchObject({
      kind: 'building', buildingId: 'coliseo', title: 'Gimnasio', landmark: true,
      instruction: expect.stringMatching(/fondo del Coliseo.*gimnasio/),
    })
  })
})
