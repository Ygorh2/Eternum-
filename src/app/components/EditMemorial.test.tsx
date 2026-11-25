import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditMemorial } from './EditMemorial';

const memorial = {
  id: 'm1',
  name: 'Maria Silva',
  birthDate: '1950-05-10',
  deathDate: '2020-05-10',
  bio: 'Uma vida linda.',
  quote: 'Para sempre',
  accessGroup: 'family',
  addToSky: true,
  photo: '',
  cover: '',
};

describe('<EditMemorial />', () => {
  it('vem preenchido com os dados atuais', () => {
    render(<EditMemorial memorial={memorial} onCancel={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Maria Silva');
    expect(screen.getByLabelText(/nascimento/i)).toHaveValue('1950-05-10');
    expect(screen.getByLabelText(/falecimento/i)).toHaveValue('2020-05-10');
    expect(screen.getByLabelText(/biografia/i)).toHaveValue('Uma vida linda.');
    expect(screen.getByLabelText(/família e amigos/i)).toBeChecked();
  });

  it('salva os campos alterados', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditMemorial memorial={memorial} onCancel={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Maria S. Souza' } });
    fireEvent.change(screen.getByLabelText(/frase marcante/i), { target: { value: 'Saudades' } });
    fireEvent.click(screen.getByLabelText(/apenas convidados/i));
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: 'Maria S. Souza',
      quote: 'Saudades',
      accessGroup: 'invited',
      birthDate: '1950-05-10',
      photoFile: null,
      coverFile: null,
    });
  });

  it('não salva com datas inválidas e mostra o erro', async () => {
    const onSave = vi.fn();
    render(<EditMemorial memorial={memorial} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/nascimento/i), { target: { value: '2021-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/anterior/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor e permite tentar de novo', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Você não tem permissão para editar este memorial.'));
    render(<EditMemorial memorial={memorial} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/permissão/);
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeEnabled();
  });
});
