import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const state = vi.hoisted(() => ({
  inserts: [] as { table: string; row: any }[],
  insertError: null as any,
  rpcResult: { data: true as any, error: null as any },
}))

vi.mock('/utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) },
    rpc: async () => state.rpcResult,
    from: (table: string) => ({
      insert: async (row: any) => {
        state.inserts.push({ table, row })
        return { error: state.insertError }
      },
    }),
  },
}))

import { blockUser, isAppAdmin, reportContent } from './api'

const ID = '22222222-2222-4222-8222-222222222222'

describe('reportContent', () => {
  beforeEach(() => {
    state.inserts = []
    state.insertError = null
  })

  it('envia só alvo, motivo e texto (o resto o banco preenche)', async () => {
    await reportContent({ targetType: 'tribute', targetId: ID, reason: 'hate', details: '  feio  ' })
    expect(state.inserts).toEqual([
      { table: 'reports', row: { target_type: 'tribute', target_id: ID, reason: 'hate', details: 'feio' } },
    ])
  })

  it('texto vazio vira null', async () => {
    await reportContent({ targetType: 'user', targetId: ID, reason: 'spam', details: '   ' })
    expect(state.inserts[0].row.details).toBeNull()
  })

  it('recusa motivo desconhecido e id inválido sem chamar o banco', async () => {
    await expect(reportContent({ targetType: 'post', targetId: ID, reason: 'xx' as any })).rejects.toThrow('motivo')
    await expect(reportContent({ targetType: 'post', targetId: 'abc', reason: 'spam' })).rejects.toThrow()
    expect(state.inserts).toEqual([])
  })

  it('denúncia repetida vira uma mensagem amigável', async () => {
    state.insertError = { code: '23505', message: 'duplicate key' }
    await expect(reportContent({ targetType: 'post', targetId: ID, reason: 'spam' })).rejects.toThrow(
      'Você já denunciou isto'
    )
  })

  it('repassa a mensagem escrita pelo banco', async () => {
    state.insertError = { code: 'P0001', message: 'Você não pode denunciar o seu próprio conteúdo.' }
    await expect(reportContent({ targetType: 'post', targetId: ID, reason: 'spam' })).rejects.toThrow(
      'próprio conteúdo'
    )
  })

  it('avisa quando a migration 0015 ainda não foi aplicada', async () => {
    state.insertError = { code: 'PGRST205', message: 'not found' }
    await expect(reportContent({ targetType: 'post', targetId: ID, reason: 'spam' })).rejects.toThrow('0015')
  })
})

describe('blockUser', () => {
  beforeEach(() => {
    state.inserts = []
    state.insertError = null
  })

  it('grava o bloqueio do usuário logado', async () => {
    await blockUser(ID)
    expect(state.inserts).toEqual([{ table: 'user_blocks', row: { blocker_id: 'me', blocked_id: ID } }])
  })

  it('não deixa bloquear a si mesmo', async () => {
    await expect(blockUser('me')).rejects.toThrow('si mesmo')
    expect(state.inserts).toEqual([])
  })

  it('bloquear de novo não dá erro', async () => {
    state.insertError = { code: '23505', message: 'duplicate key' }
    await expect(blockUser(ID)).resolves.toBeUndefined()
  })
})

describe('isAppAdmin', () => {
  it('só é administrador se o banco disser true', async () => {
    state.rpcResult = { data: true, error: null }
    expect(await isAppAdmin()).toBe(true)
    state.rpcResult = { data: false, error: null }
    expect(await isAppAdmin()).toBe(false)
    state.rpcResult = { data: null, error: { code: 'PGRST202', message: 'no function' } }
    expect(await isAppAdmin()).toBe(false)
  })
})
