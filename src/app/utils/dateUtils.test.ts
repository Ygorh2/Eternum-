import { describe, it, expect } from 'vitest'
import { parseLocalDate, formatDate, getYear, todayLocalISO } from './dateUtils'

describe('dateUtils', () => {
  it('trata YYYY-MM-DD como data local (não volta um dia no fuso do Brasil)', () => {
    const d = parseLocalDate('2020-05-10')
    expect(d).not.toBeNull()
    expect(d!.getDate()).toBe(10)
    expect(d!.getMonth()).toBe(4)
    expect(d!.getFullYear()).toBe(2020)
  })

  it('formata em pt-BR por padrão', () => {
    expect(formatDate('2020-05-10')).toBe('10/05/2020')
  })

  it('retorna vazio/null para valores ausentes ou inválidos', () => {
    expect(parseLocalDate(undefined)).toBeNull()
    expect(parseLocalDate('')).toBeNull()
    expect(parseLocalDate('não é data')).toBeNull()
    expect(formatDate(null)).toBe('')
    expect(getYear('lixo')).toBeNull()
  })

  it('extrai o ano', () => {
    expect(getYear('1950-01-01')).toBe(1950)
  })

  it('todayLocalISO devolve YYYY-MM-DD', () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
