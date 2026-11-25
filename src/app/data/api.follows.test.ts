import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso que imita o schema real (migrations 0001 e 0004):
// - follows NÃO tem coluna "id" (chave primária composta follower_id + following_id)
// - as FKs de follows apontam para auth.users, então não existe relação
//   follows -> profiles para o PostgREST fazer embed (profiles!follows_*_fkey).
const db = vi.hoisted(() => ({
  currentUserId: 'me' as string | null,
  follows: [] as { follower_id: string; following_id: string }[],
  profiles: [] as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[],
}))

vi.mock('/utils/supabase/client', () => {
  const COLUMNS: Record<string, string[]> = {
    follows: ['follower_id', 'following_id', 'created_at'],
    profiles: ['id', 'display_name', 'username', 'avatar_url', 'created_at'],
  }

  function from(table: 'follows' | 'profiles') {
    let rows: any[] = [...(db as any)[table]]
    let selectError: any = null
    let columns: string[] | null = null
    let single = false

    const builder: any = {
      select(cols: string) {
        if (cols.includes('!') || cols.includes('(')) {
          selectError = {
            code: 'PGRST200',
            message: `Could not find a relationship between '${table}' and 'profiles' in the schema cache`,
          }
        } else if (cols !== '*') {
          columns = cols.split(',').map((c) => c.trim())
          const missing = columns.find((c) => !COLUMNS[table].includes(c))
          if (missing) selectError = { code: '42703', message: `column ${table}.${missing} does not exist` }
        }
        return builder
      },
      eq(col: string, value: unknown) {
        rows = rows.filter((r) => r[col] === value)
        return builder
      },
      in(col: string, values: unknown[]) {
        rows = rows.filter((r) => values.includes(r[col]))
        return builder
      },
      maybeSingle() {
        single = true
        return builder
      },
      then(resolve: any, reject: any) {
        let result: any
        if (selectError) result = { data: null, error: selectError }
        else {
          const projected = columns
            ? rows.map((r) => Object.fromEntries(columns!.map((c) => [c, r[c]])))
            : rows
          result = { data: single ? projected[0] ?? null : projected, error: null }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  }

  return {
    supabase: {
      from,
      auth: {
        getUser: async () => ({
          data: { user: db.currentUserId ? { id: db.currentUserId } : null },
          error: null,
        }),
      },
    },
  }
})

import * as api from './api'

beforeEach(() => {
  db.currentUserId = 'me'
  db.profiles = [
    { id: 'me', display_name: 'Eu', username: 'eu', avatar_url: null },
    { id: 'ana', display_name: 'Ana', username: 'ana', avatar_url: 'https://x/ana.png' },
    { id: 'bia', display_name: null, username: 'bia', avatar_url: null },
  ]
  db.follows = [
    { follower_id: 'me', following_id: 'ana' },
    { follower_id: 'bia', following_id: 'me' },
    { follower_id: 'ana', following_id: 'me' },
  ]
})

describe('isFollowingUser', () => {
  it('retorna true quando o usuário atual segue o alvo', async () => {
    await expect(api.isFollowingUser('ana')).resolves.toBe(true)
  })

  it('retorna false quando o usuário atual não segue o alvo', async () => {
    await expect(api.isFollowingUser('bia')).resolves.toBe(false)
  })
})

describe('fetchFollowers / fetchFollowing', () => {
  it('lista os perfis de quem segue o usuário', async () => {
    const followers = await api.fetchFollowers('me')
    expect(followers.map((p) => p.id).sort()).toEqual(['ana', 'bia'])
    expect(followers.find((p) => p.id === 'bia')?.displayName).toBe('bia')
    expect(followers.find((p) => p.id === 'ana')?.avatarUrl).toBe('https://x/ana.png')
  })

  it('lista os perfis que o usuário segue', async () => {
    const following = await api.fetchFollowing('me')
    expect(following.map((p) => p.id)).toEqual(['ana'])
  })

  it('retorna lista vazia sem consultar perfis quando ninguém segue', async () => {
    db.follows = []
    await expect(api.fetchFollowers('me')).resolves.toEqual([])
    await expect(api.fetchFollowing('me')).resolves.toEqual([])
  })

  it('ignora quem segue mas ainda não tem perfil criado', async () => {
    db.follows.push({ follower_id: 'sem-perfil', following_id: 'me' })
    const followers = await api.fetchFollowers('me')
    expect(followers.map((p) => p.id).sort()).toEqual(['ana', 'bia'])
  })
})
