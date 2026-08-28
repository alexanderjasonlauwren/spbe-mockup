import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui primitives are vendored, not authored here: `npx shadcn add`
    // regenerates them, and its files deliberately export a component next to
    // its `cva` variants (buttonVariants, badgeVariants) so callers can style a
    // link like a button without rendering one.
    //
    // react-refresh/only-export-components objects to that pairing. It is a
    // dev-experience rule about Fast Refresh granularity, not correctness, and
    // the cost of satisfying it is splitting every primitive into two files
    // that the next upstream sync puts back. Scoped off here rather than
    // suppressed line by line, so the exemption names the directory it applies
    // to and stops applying the moment a file moves out of it.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
