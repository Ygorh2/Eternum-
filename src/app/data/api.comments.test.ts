import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const state = vi.hoisted(() => ({
  deletedIds: [] as string[],
  result: { data: [{ id: 'c1' }] as any[] | null, error: null as any },
}))

vi.mock('/utils/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) },
    from: (table: string) => {
      if (table !== 'post_comments') throw new Error(`tabela inesperada: ${table}`)
      return {
        delete: () => ({
          eq: (col: string, value: string) => {
            if (col === 'id') state.deletedIds.push(value)
            return { select: async () => state.result }
          },
        }),
      }
    },
  },
}))

import { deleteComment } from './api'

describe('deleteComment', () => {
  beforeEach(() => {
    state.deletedIds = []
    state.result = { data: [{ id: 'c1' }], error: null }
  })

  it('apaga o comentário pelo id', async () => {
    await deleteComment('c1')
    expect(state.deletedIds).toEqual(['c1'])
  })

  it('avisa quando o banco não apagou nada (sem permissão pelo RLS)', async () => {
    state.result = { data: [], error: null }
    await expect(deleteComment('c1')).rejects.toThrow(/permissão/)
  })

  it('repassa erro do banco', async () => {
    state.result = { data: null, error: new Error('falhou') }
    await expect(deleteComment('c1')).rejects.toThrow('falhou')
  })
})
