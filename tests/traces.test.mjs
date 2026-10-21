import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateTraces, frontendSymbolLine, explicitSection } from '../scripts/trace-utils.mjs'

const ref = { path: 'app/example.py', symbol: 'get_item' }
const trace = { method: 'GET', path: '/v1/items/{id}', page: 'reference/flows/items', anchor: 'get-item', backend: [ref], frontend: [], trigger: { en: 'Script-only endpoint', zh: '仅脚本调用' } }
const snapshot = { api: [{ ...trace, handler: { source: ref.path, symbol: ref.symbol } }], traceEvidence: [{ repository: 'backend', ...ref, line: 10, sourceSha256: 'a'.repeat(64) }] }
const text = '# Items\n\n## Read one {#get-item}\n\n`GET /v1/items/{id}` enters `get_item`.\n'
const documents = new Map([['reference/flows/items.md', text], ['zh/reference/flows/items.md', text]])

test('every public API must retain a bilingual endpoint explanation and verified handler', () => {
  assert.deepEqual(validateTraces([trace], snapshot, documents), [])
  assert.match(validateTraces([], snapshot, documents).join('\n'), /API without full-chain/)
  assert.match(validateTraces([trace, trace], snapshot, documents).join('\n'), /Duplicate trace/)
  const brokenAnchor = new Map(documents).set('zh/reference/flows/items.md', text.replace('{#get-item}', '{#lost}'))
  assert.match(validateTraces([trace], snapshot, brokenAnchor).join('\n'), /explicit anchor/)
  assert.match(validateTraces([trace], { ...snapshot, traceEvidence: [] }, documents).join('\n'), /Unverified source symbol/)
  const unrelated = new Map([...documents].map(([file, body]) => [file, body + '\n## Other topic {#other-topic}\nUnrelated content\n']))
  assert.match(validateTraces([{ ...trace, anchor: 'other-topic' }], snapshot, unrelated).join('\n'), /endpoint explanation in target section/)
  const wrongHandler = { ...snapshot, api: [{ ...snapshot.api[0], handler: { source: ref.path, symbol: 'another_handler' } }] }
  assert.match(validateTraces([trace], wrongHandler, documents).join('\n'), /Handler not in chain/)
})

test('frontend source locator verifies declared bindings and rejects ambiguous object methods without evaluating source', () => {
  const source = 'throw new Error("Never evaluate app code")\nexport const repository = {\n  async read(id: string): Promise<void> { return; }\n};\nexport async function submit(body: unknown) {}\n'
  assert.equal(frontendSymbolLine(source, 'repository'), 2)
  assert.equal(frontendSymbolLine(source, 'repository.read'), null)
  assert.equal(frontendSymbolLine('const target = {}; const other = { async read() {} };', 'target.read'), null)
  assert.equal(frontendSymbolLine(source, 'submit'), 5)
  assert.equal(frontendSymbolLine(source, 'missing.read'), null)
  assert.equal(frontendSymbolLine(source, 'absent'), null)
})

test('section lookup ignores headings inside code fences and stops at a real peer heading', () => {
  const source = '# Course\n## Target {#target}\n```md\n## Fake heading\n```\n### Child\ninside\n## Other {#other}\noutside\n'
  assert.match(explicitSection(source, 'target'), /inside/)
  assert.doesNotMatch(explicitSection(source, 'target'), /outside/)
  assert.equal(explicitSection(source, 'absent'), '')
})
