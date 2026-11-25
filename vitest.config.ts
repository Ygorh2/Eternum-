import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Os testes rodam no fuso de São Paulo para reproduzir o comportamento real dos usuários
// (ex.: o bug de datas que apareciam um dia antes).
process.env.TZ = 'America/Sao_Paulo'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'e2e'],
      css: false,
    },
  }),
)
