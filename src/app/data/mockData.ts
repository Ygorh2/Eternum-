import { Plus, Heart, HandHeart, Flame } from 'lucide-react';

export const USERS = [
  {
    id: '1',
    name: 'Ana Silva',
    avatar: 'https://images.unsplash.com/photo-1590905707155-17c680dd7867',
    relation: 'Familiar'
  },
  {
    id: '2',
    name: 'Carlos Santos',
    avatar: '',
    relation: 'Amigo'
  }
];

export const MEMORIALS = [
  {
    id: 'm1',
    name: 'Maria Clara Oliveira',
    photo: 'https://images.unsplash.com/photo-1590905707155-17c680dd7867',
    cover: 'https://images.unsplash.com/photo-1596905738125-a6b51b1bdbb6',
    birthDate: '1948-02-15',
    deathDate: '2023-08-20',
    quote: 'Para sempre em nossos corações.',
    bio: 'Maria Clara foi uma mãe dedicada, avó amorosa e professora apaixonada. Amava flores, música clássica e reunir a família aos domingos.',
    candles: 142,
    type: 'person'
  },
  {
    id: 'm2',
    name: 'Thor',
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d',
    cover: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
    birthDate: '2015-05-10',
    deathDate: '2023-01-15',
    quote: 'O melhor amigo que alguém poderia ter.',
    bio: 'Thor foi um companheiro fiel, sempre pronto para um passeio ou um carinho. Deixou saudades em todos que o conheceram.',
    candles: 56,
    type: 'pet'
  }
];

export const TRIBUTES = [
  {
    id: 't1',
    memorialId: 'm1',
    author: USERS[0],
    content: 'Hoje Maria faria 75 anos. Saudade eterna.',
    date: '2023-02-15',
    type: 'Saudade',
    image: null
  },
  {
    id: 't2',
    memorialId: 'm1',
    author: USERS[1],
    content: 'Lembrança de 1985. Te amamos para sempre, vovó.',
    date: '2023-08-25',
    type: 'Lembrança',
    image: 'https://images.unsplash.com/photo-1581342997451-0215a38cf1cf'
  }
];

export const TIMELINE_EVENTS = [
  {
    id: 'e1',
    date: '2023-02-15',
    title: 'Hoje Maria faria 75 anos.',
    description: 'Saudade eterna.',
    type: 'special',
  },
  {
    id: 'e2',
    date: '1985-06-10',
    title: 'Lembrança de 1985',
    description: 'Te amamos para sempre, vovó.',
    image: 'https://images.unsplash.com/photo-1581342997451-0215a38cf1cf',
    type: 'memory'
  },
  {
    id: 'e3',
    date: '2023-08-20',
    title: '3 Anos de Saudade',
    description: '',
    type: 'milestone'
  },
  {
    id: 'e4',
    date: '1990-02-01',
    title: 'Mensagem de Maria',
    description: 'Queridos, lembrem-se sempre de sorrir. Estou com vocês em cada passo do caminho.',
    type: 'letter'
  }
];
