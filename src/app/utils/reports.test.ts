import { describe, it, expect } from 'vitest'
import { isPermissionError, reportReasonLabel, reportTargetFromPostKey } from './reports'

const M = '11111111-1111-4111-8111-111111111111'
const T = '22222222-2222-4222-8222-222222222222'

describe('reportTargetFromPostKey', () => {
  it('homenagem e publicação denunciam o próprio item', () => {
    expect(reportTargetFromPostKey(`tribute:${T}`, M)).toEqual({ type: 'tribute', id: T })
    expect(reportTargetFromPostKey(`post:${T}`, M)).toEqual({ type: 'post', id: T })
  })

  it('post de criação e foto da galeria denunciam o memorial', () => {
    expect(reportTargetFromPostKey(`memorial:${M}`, M)).toEqual({ type: 'memorial', id: M })
    expect(reportTargetFromPostKey('gallery:https://x.supabase.co/a:b.jpg', M)).toEqual({ type: 'memorial', id: M })
  })

  it('ignora chaves com id inválido ou tipo desconhecido', () => {
    expect(reportTargetFromPostKey('tribute:abc', M)).toBeNull()
    expect(reportTargetFromPostKey(`outro:${T}`, M)).toBeNull()
    expect(reportTargetFromPostKey(`memorial:${M}`, 'nao-uuid')).toBeNull()
  })
})

describe('isPermissionError', () => {
  it('reconhece o erro de RLS do Postgres', () => {
    expect(isPermissionError({ code: '42501', message: 'x' })).toBe(true)
    expect(isPermissionError({ code: 'XX', message: 'new row violates row-level security policy' })).toBe(true)
    expect(isPermissionError({ code: '23505', message: 'duplicate' })).toBe(false)
    expect(isPermissionError(null)).toBe(false)
  })
})

describe('reportReasonLabel', () => {
  it('traduz o motivo e cai em "Outro motivo" se não conhecer', () => {
    expect(reportReasonLabel('spam')).toBe('Spam, propaganda ou golpe')
    expect(reportReasonLabel('???')).toBe('Outro motivo')
  })
})
