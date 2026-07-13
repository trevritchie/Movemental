// Explicit dev deploy: ships the current dist/ build to Firebase Hosting
// (movemental-dev). Run via `npm run deploy`, never automatically as part
// of `npm run build`, so building never has an unannounced network side effect.
import { execSync } from 'node:child_process'

execSync(
  'npx firebase deploy --only hosting --project dev --non-interactive',
  { stdio: 'inherit' },
)
