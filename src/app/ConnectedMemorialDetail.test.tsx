import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

// Testes não podem chamar o Supabase real
vi.mock('./data/api', () => ({}))

let appContext: any
vi.mock('./Layout', () => ({ useApp: () => appContext }))

// A tela real é pesada; aqui só importa QUAL memorial foi escolhido
vi.mock('./components/MemorialDetail', () => ({
  MemorialDetail: ({ memorial }: any) => <h1>{memorial.name}</h1>,
}))

import { ConnectedMemorialDetail } from './ConnectedComponents'

const memorials = [
  { id: 'm1', name: 'Maria' },
  { id: 'm2', name: 'João' },
]

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/memorial/:id" element={<ConnectedMemorialDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<ConnectedMemorialDetail />', () => {
  beforeEach(() => {
    appContext = { memorials, tributes: [], memorialsLoading: false }
  })

  it('mostra o memorial do id da URL', () => {
    renderAt('/memorial/m2')
    expect(screen.getByRole('heading', { name: 'João' })).toBeInTheDocument()
  })

  it('mostra "não encontrado" para id desconhecido (e não o primeiro memorial)', () => {
    renderAt('/memorial/nao-existe')
    expect(screen.queryByText('Maria')).not.toBeInTheDocument()
    expect(screen.getByText(/memorial não encontrado/i)).toBeInTheDocument()
  })

  it('mostra carregando enquanto os memoriais ainda não chegaram', () => {
    appContext = { memorials: [], tributes: [], memorialsLoading: true }
    renderAt('/memorial/m1')
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    expect(screen.queryByText(/não encontrado/i)).not.toBeInTheDocument()
  })
})
