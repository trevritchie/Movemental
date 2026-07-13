/**
 * Production build with bundle visualizer (no Firebase deploy).
 */
import { spawnSync } from 'node:child_process';

process.env.ANALYZE = 'true';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('npx', ['tsc', '-b']);
run('npx', ['vite', 'build']);
