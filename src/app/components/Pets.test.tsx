import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pets } from './Pets';

const pets = [
  { id: 'p1', name: 'Bidu', photo: '', birthDate: '2010-03-01', deathDate: '2022-08-15' },
  { id: 'p2', name: 'Mel', photo: 'https://exemplo.com/mel.jpg', birthDate: null, deathDate: null },
];

function setup(overrides = {}) {
  const props = {
    pets,
    onOpenMenu: vi.fn(),
    onCreate: vi.fn(),
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    ...overrides,
  };
  render(<Pets {...props} />);
  return props;
}

describe('<Pets />', () => {
  it('mostra os pets recebidos, sem os exemplos falsos', () => {
    setup();
    expect(screen.getByText('Bidu')).toBeInTheDocument();
    expect(screen.getByText('Mel')).toBeInTheDocument();
    expect(screen.getByText('2010 – 2022')).toBeInTheDocument();
    expect(screen.queryByText('Thor')).not.toBeInTheDocument();
    expect(screen.queryByText('Luna')).not.toBeInTheDocument();
  });

  it('o + e o "Adicionar pet" chamam onCreate', () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText(/criar memorial de pet/i));
    fireEvent.click(screen.getByText(/adicionar pet/i));
    expect(props.onCreate).toHaveBeenCalledTimes(2);
  });

  it('abre e edita o memorial do pet', () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText('Abrir memorial de Bidu'));
    fireEvent.click(screen.getByLabelText('Editar memorial de Mel'));
    expect(props.onOpen).toHaveBeenCalledWith('p1');
    expect(props.onEdit).toHaveBeenCalledWith('p2');
  });

  it('mostra mensagem quando não há pets', () => {
    setup({ pets: [] });
    expect(screen.getByText(/nenhum pet por aqui ainda/i)).toBeInTheDocument();
  });

  it('mostra carregando', () => {
    setup({ pets: [], loading: true });
    expect(screen.getByText(/carregando seus pets/i)).toBeInTheDocument();
  });
});
