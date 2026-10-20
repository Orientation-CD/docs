import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { tokenize } from '../.vitepress/search.mjs'
const MiniSearch = createRequire(import.meta.resolve('vitepress'))('minisearch')

test('build and serialized browser tokenizer agree for CJK and technical identifiers', () => {
  const browser = new Function(`return (${tokenize.toString()})`)()
  for (const query of ['工作流', '项目成果', '文案', '项', '/v1/workflows', 'PROJECT_OUTCOMES_ENABLED', 'copywriting_*', 'workflowRun', 'ＰＰＴＸ']) assert.deepEqual(browser(query), tokenize(query))
  const index = new MiniSearch({ fields: ['text'], tokenize })
  index.addAll([{ id: 'correct', text: '工作流 PROJECT_OUTCOMES_ENABLED /v1/workflows copywriting_script' }, { id: 'false-positive', text: '工作区的流量' }])
  const restored = MiniSearch.loadJSON(JSON.stringify(index), { fields: ['text'], tokenize: browser, searchOptions: { combineWith: 'AND', prefix: true } })
  for (const query of ['工作流', 'outcomes', '/v1/workflows', 'copywriting_*']) assert.deepEqual(restored.search(query).map((row) => row.id), ['correct'])
  assert.equal(restored.search('nonexistent_keyword_zyz').length, 0)
})
