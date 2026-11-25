import { describe, it, expect } from 'vitest';
import { validateMemorialForm, MAX_BIO_LENGTH } from './memorialValidation';

const valid = {
  name: 'Maria',
  birthDate: '1950-05-10',
  deathDate: '2020-05-10',
  bio: 'Uma vida linda.',
  quote: '',
  accessGroup: 'family',
};
const today = '2026-11-25';

describe('validateMemorialForm', () => {
  it('aceita um formulário válido', () => {
    expect(validateMemorialForm(valid, today)).toBeNull();
  });

  it('exige nome não vazio', () => {
    expect(validateMemorialForm({ ...valid, name: '   ' }, today)).toMatch(/nome/i);
  });

  it('não aceita falecimento no futuro', () => {
    expect(validateMemorialForm({ ...valid, deathDate: '2026-11-26' }, today)).toMatch(/futuro/);
  });

  it('aceita falecimento hoje (sem erro de fuso)', () => {
    expect(validateMemorialForm({ ...valid, deathDate: today }, today)).toBeNull();
  });

  it('exige nascimento antes do falecimento', () => {
    expect(validateMemorialForm({ ...valid, birthDate: '2020-05-10' }, today)).toMatch(/anterior/);
  });

  it('limita o tamanho da biografia', () => {
    expect(validateMemorialForm({ ...valid, bio: 'a'.repeat(MAX_BIO_LENGTH + 1) }, today)).toMatch(/biografia/);
  });

  it('rejeita grupo de acesso desconhecido', () => {
    expect(validateMemorialForm({ ...valid, accessGroup: 'todo-mundo' }, today)).toMatch(/quem pode ver/);
  });
});
