import { execSync } from 'node:child_process'

if (process.env.CI) {
  process.exit(0)
}

execSync(
  'npx firebase deploy --only hosting --project dev --non-interactive',
  { stdio: 'inherit' },
)
