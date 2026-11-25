import { describe, it, expect } from 'vitest'
import type { AppNotification } from '../data/api'
import { formatNotificationTime, notificationAction, notificationTarget } from './notifications'

const base: AppNotification = {
  id: 'n1',
  type: 'candle',
  actorId: 'u1',
  actorName: 'Ana',
  memorialId: 'm1',
  memorialName: 'Vovó Maria',
  postKey: null,
  reaction: null,
  createdAt: '2026-11-25T12:00:00Z',
  read: false,
}

describe('notificationAction', () => {
  it('descreve cada tipo em português', () => {
    expect(notificationAction({ ...base, type: 'follow', memorialId: null, memorialName: '' })).toBe('começou a seguir você.')
    expect(notificationAction(base)).toBe('acendeu uma vela para Vovó Maria.')
    expect(notificationAction({ ...base, type: 'reaction', reaction: 'amen' })).toContain('Amém')
    expect(notificationAction({ ...base, type: 'reaction', reaction: 'love' })).toContain('Amor')
    expect(notificationAction({ ...base, type: 'comment' })).toBe('comentou na sua publicação em Vovó Maria.')
    expect(notificationAction({ ...base, type: 'tribute' })).toBe('deixou uma homenagem para Vovó Maria.')
    expect(notificationAction({ ...base, type: 'post' })).toBe('publicou uma foto em Vovó Maria.')
  })

  it('não mostra nome quando o memorial não pode ser lido', () => {
    expect(notificationAction({ ...base, memorialName: '' })).toBe('acendeu uma vela para um memorial.')
  })
})

describe('notificationTarget', () => {
  it('seguidor leva ao perfil; o resto leva ao memorial', () => {
    expect(notificationTarget({ ...base, type: 'follow', memorialId: null })).toBe('/user/u1')
    expect(notificationTarget(base)).toBe('/memorial/m1')
    expect(notificationTarget({ ...base, memorialId: null })).toBeNull()
  })
})

describe('formatNotificationTime', () => {
  const now = new Date('2026-11-25T12:00:00Z').getTime()
  it('usa tempo relativo', () => {
    expect(formatNotificationTime('2026-11-25T11:59:40Z', now)).toBe('agora mesmo')
    expect(formatNotificationTime('2026-11-25T11:55:00Z', now)).toBe('Há 5 min')
    expect(formatNotificationTime('2026-11-25T09:00:00Z', now)).toBe('Há 3h')
    expect(formatNotificationTime('2026-11-24T10:00:00Z', now)).toBe('Há 1 dia')
    expect(formatNotificationTime('2026-11-22T10:00:00Z', now)).toBe('Há 3 dias')
  })
})
