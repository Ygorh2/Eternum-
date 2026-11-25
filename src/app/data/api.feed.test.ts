import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso que só registra as chamadas de cada consulta e devolve
// linhas fixas por tabela.
const db = vi.hoisted(() => ({
  calls: [] as { table: string; ops: [string, ...unknown[]][] }[],
  rows: {} as Record<string, any[]>,
}))

vi.mock('/utils/supabase/client', () => {
  function from(table: string) {
    const entry = { table, ops: [] as [string, ...unknown[]][] }
    db.calls.push(entry)
    const builder: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (resolve: any, reject: any) =>
              Promise.resolve({ data: db.rows[table] || [], error: null }).then(resolve, reject)
          }
          return (...args: unknown[]) => {
            entry.ops.push([prop, ...args])
            return builder
          }
        },
      }
    )
    return builder
  }
  return { supabase: { from } }
})

import { fetchFeedMemorialsPage, fetchFeedTributesPage, fetchFollowingScope } from './api'

const ME = '11111111-1111-4111-8111-111111111111'
const FRIEND = '22222222-2222-4222-8222-222222222222'
const MEM = '33333333-3333-4333-8333-333333333333'

const opsOf = (i: number) => db.calls[i].ops.map(([name]) => name)
const argsOf = (i: number, name: string) => db.calls[i].ops.find(([n]) => n === name)?.slice(1)

beforeEach(() => {
  db.calls = []
  db.rows = {}
})

describe('feed paginado na api', () => {
  it('Explorar: uma consulta só, ordenada, limitada e com cursor', async () => {
    db.rows.memorials = [{ id: MEM, name: 'Maria', type: 'pet', created_by: ME, created_at: '2024-01-01T00:00:00Z' }]
    const result = await fetchFeedMemorialsPage({ scope: 'explore', type: 'pet', limit: 10, before: '2024-02-01T00:00:00Z' })
    expect(db.calls).toHaveLength(1)
    expect(argsOf(0, 'limit')).toEqual([10])
    expect(argsOf(0, 'lt')).toEqual(['created_at', '2024-02-01T00:00:00Z'])
    expect(argsOf(0, 'eq')).toEqual(['type', 'pet'])
    expect(opsOf(0)).not.toContain('in')
    expect(result[0]).toMatchObject({ id: MEM, createdBy: ME })
  })

  it('Seguindo: memoriais de pessoas seguidas e memoriais seguidos', async () => {
    await fetchFeedMemorialsPage({
      scope: 'following',
      type: 'all',
      limit: 10,
      following: { userIds: [ME, FRIEND], memorialIds: [MEM] },
    })
    expect(db.calls.map((_, i) => argsOf(i, 'in'))).toEqual([
      ['created_by', [ME, FRIEND]],
      ['id', [MEM]],
    ])
  })

  it('Seguindo: ignora ids que não são UUID (não monta filtro com texto livre)', async () => {
    await fetchFeedMemorialsPage({
      scope: 'following',
      type: 'all',
      limit: 10,
      following: { userIds: [ME, 'x),id.neq.(0'], memorialIds: [] },
    })
    expect(db.calls).toHaveLength(1)
    expect(argsOf(0, 'in')).toEqual(['created_by', [ME]])
  })

  it('Seguindo: junta as consultas, sem repetir e na ordem certa', async () => {
    db.rows.tributes = [
      { id: 't1', memorial_id: MEM, author_id: FRIEND, content: 'a', created_at: '2024-01-01T00:00:00Z', memorial: { id: MEM, name: 'Maria', type: 'person' } },
      { id: 't2', memorial_id: MEM, author_id: ME, content: 'b', created_at: '2024-01-03T00:00:00Z', memorial: { id: MEM, name: 'Maria', type: 'person' } },
    ]
    const result = await fetchFeedTributesPage({
      scope: 'following',
      type: 'all',
      limit: 10,
      following: { userIds: [ME, FRIEND], memorialIds: [MEM] },
    })
    // por autor, por dono do memorial e por memorial seguido
    expect(db.calls.map((_, i) => argsOf(i, 'in')?.[0])).toEqual(['author_id', 'memorial.created_by', 'memorial_id'])
    expect(argsOf(0, 'select')?.[0]).toContain('memorials!inner')
    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
    expect(result[0].memorial.name).toBe('Maria')
  })

  it('filtro Pets nas homenagens usa o tipo do memorial', async () => {
    await fetchFeedTributesPage({ scope: 'explore', type: 'pet', limit: 5 })
    expect(argsOf(0, 'eq')).toEqual(['memorial.type', 'pet'])
  })

  it('fetchFollowingScope inclui o próprio usuário', async () => {
    db.rows.follows = [{ following_id: FRIEND }]
    db.rows.memorial_follows = [{ memorial_id: MEM }]
    expect(await fetchFollowingScope(ME)).toEqual({ userIds: [ME, FRIEND], memorialIds: [MEM] })
  })
})
