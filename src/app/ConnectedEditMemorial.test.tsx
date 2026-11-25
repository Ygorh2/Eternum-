import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

// Testes não podem chamar o Supabase real
vi.mock('./data/api', () => ({
  uploadMedia: vi.fn().mockResolvedValue('https://exemplo/nova.jpg'),
}));

let appContext: any;
vi.mock('./Layout', () => ({ useApp: () => appContext }));

import { ConnectedEditMemorial } from './ConnectedComponents';

const memorial = {
  id: 'm1',
  name: 'Maria',
  birthDate: '1950-05-10',
  deathDate: '2020-05-10',
  bio: 'Bio',
  quote: '',
  accessGroup: 'family',
  addToSky: true,
  createdBy: 'dono',
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/memorial/:id/edit" element={<ConnectedEditMemorial />} />
        <Route path="/memorial/:id" element={<h1>Página do memorial</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('<ConnectedEditMemorial />', () => {
  beforeEach(() => {
    appContext = {
      memorials: [memorial],
      user: { id: 'dono' },
      memorialsLoading: false,
      handleUpdateMemorial: vi.fn().mockResolvedValue(memorial),
    };
  });

  it('o dono vê o formulário, salva e volta para o memorial', async () => {
    renderAt('/memorial/m1/edit');
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Maria Souza' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(appContext.handleUpdateMemorial).toHaveBeenCalled());
    const [id, changes] = appContext.handleUpdateMemorial.mock.calls[0];
    expect(id).toBe('m1');
    expect(changes).toMatchObject({ name: 'Maria Souza', accessGroup: 'family' });
    expect(changes).not.toHaveProperty('photo'); // foto não trocada não é sobrescrita
    expect(await screen.findByRole('heading', { name: 'Página do memorial' })).toBeInTheDocument();
  });

  it('outra pessoa não vê o formulário', () => {
    appContext.user = { id: 'outra-pessoa' };
    renderAt('/memorial/m1/edit');
    expect(screen.getByText(/apenas quem criou/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument();
  });

  it('memorial inexistente mostra "não encontrado"', () => {
    renderAt('/memorial/nao-existe/edit');
    expect(screen.getByText(/memorial não encontrado/i)).toBeInTheDocument();
  });
});
