import { test, expect } from '@playwright/test'

test('a tela inicial carrega e mostra a marca', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ETERNUM' })).toBeVisible()
  expect(errors).toEqual([])
})

test('rota protegida sem login não quebra o app', async ({ page }) => {
  await page.goto('/feed')
  await expect(page.locator('#root')).not.toBeEmpty()
})
