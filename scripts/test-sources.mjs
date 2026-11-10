import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Pass the discovery glob as an argument, not a shell-quoted string: cmd.exe
// preserves single quotes and would otherwise discover zero Python tests.
const result = spawnSync(process.env.DOCS_PYTHON || 'python3', [
  '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py',
], { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
