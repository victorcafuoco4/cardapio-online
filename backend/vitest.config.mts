import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // O exclude padrão do vitest não inclui dist/** — sem isso, ele também
    // descobre os .test.js compilados pelo tsc (CJS) e falha ao tentar
    // importá-los, duplicando a suíte real em src/**/*.test.ts.
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
