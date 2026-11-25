import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cliente Supabase falso: registra as chamadas encadeadas do update
const calls: any = {};
let result: any = { data: null, error: null };

vi.mock('/utils/supabase/client', () => {
  const builder: any = {
    update: (row: any) => ((calls.row = row), builder),
    eq: (col: string, val: any) => ((calls.eq = [...(calls.eq || []), [col, val]]), builder),
    select: () => builder,
    maybeSingle: () => Promise.resolve(result),
  };
  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }) },
      from: (table: string) => ((calls.table = table), builder),
    },
  };
});

import { updateMemorial } from './api';

describe('updateMemorial', () => {
  beforeEach(() => {
    for (const k of Object.keys(calls)) delete calls[k];
  });

  it('atualiza só os campos enviados, filtrando pelo dono', async () => {
    result = {
      data: { id: 'm1', name: 'Maria', created_by: 'u1', access_group: 'invited', birth_date: '1950-01-01' },
      error: null,
    };
    const saved = await updateMemorial('m1', { name: '  Maria ', accessGroup: 'invited', quote: '' });

    expect(calls.table).toBe('memorials');
    expect(calls.row).toEqual({ name: 'Maria', access_group: 'invited', quote: null });
    expect(calls.eq).toEqual([
      ['id', 'm1'],
      ['created_by', 'u1'],
    ]);
    expect(saved).toMatchObject({ id: 'm1', name: 'Maria', accessGroup: 'invited', createdBy: 'u1' });
  });

  it('avisa quando o usuário não é o dono (nenhuma linha atualizada)', async () => {
    result = { data: null, error: null };
    await expect(updateMemorial('m1', { name: 'X' })).rejects.toThrow(/permissão/);
  });
});
