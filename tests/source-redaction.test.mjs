import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settingsWithExamples } from '../scripts/source-utils.mjs'

test('SecretStr examples are redacted even when their environment name is not a secret-name pattern', () => {
  const result = settingsWithExamples([
    { env: 'CONFIG_ENCRYPTION_KEY', secret: true },
    { env: 'ADMIN_PASSWORD', secret: true },
    { env: 'UNCONFIGURED_KEY', secret: true },
    { env: 'PROJECT_OUTCOMES_ENABLED', secret: false },
  ], { CONFIG_ENCRYPTION_KEY: 'must-never-publish', ADMIN_PASSWORD: 'must-never-publish-either', PROJECT_OUTCOMES_ENABLED: 'false' })
  assert(!JSON.stringify(result).includes('must-never-publish'))
  assert.equal(result[0].example, '<secret example redacted>')
  assert.equal(result[2].example, null)
  assert.equal(result[3].example, 'false')
})
