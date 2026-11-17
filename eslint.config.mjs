// ESLint flat config for the whole repo (issue #10). Run with: npm run lint
// .mjs because the root package.json is not "type": "module".
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const sharedRules = {
  // `catch {}` is fine (e.g. localStorage can throw in private windows); other empty blocks are errors.
  'no-empty': ['error', { allowEmptyCatch: true }],
  // Unused variables are errors, except names starting with _ (and capitalised names, which are React components used in JSX).
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
}

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', 'supabase/**', 'docs/**'] },
  js.configs.recommended,

  // Client: React app (browser)
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh.default ?? reactRefresh },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // TODO(owners): these two newer React rules flag existing teammate code (Basket.jsx and Home.jsx call
      // Date.now() while rendering; SearchResults.jsx sets state inside an effect). They are warnings so main
      // stays green; each owner can fix their file and then these can go back to errors.
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...sharedRules,
    },
  },

  // Client tests, test helpers and mocks run in Jest (jsdom + Node)
  {
    files: ['client/src/**/__tests__/**', 'client/src/__mocks__/**', 'client/src/setupTests.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.jest, ...globals.node } },
  },

  // Client config files (Vite, Jest, Babel) run in Node
  {
    files: ['client/*.{js,cjs,mjs}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: sharedRules,
  },
  { files: ['client/*.cjs'], languageOptions: { sourceType: 'commonjs' } },

  // Server and Vercel function: Node
  {
    files: ['server/**/*.js', 'api/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: sharedRules,
  },
]
