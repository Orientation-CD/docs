import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { sourceLinks, checkSourceAnchor, candidateApiForPage, validateCandidateApi, candidateContractFiles } from '../scripts/source-links.mjs'

test('source checks reject stale definition anchors even when the new line is in bounds', () => {
  const sha = 'a'.repeat(40)
  const [link] = sourceLinks(`Open [\`submit()\`](https://github.com/Orientation-CD/YuanZhu-AI/blob/${sha}/app/api.py#L20).`)
  const snapshot = { sourceFiles: { backend: { 'app/api.py': { lines: 100 } } }, traceEvidence: [{ repository: 'backend', path: 'app/api.py', symbol: 'submit', line: 25 }] }
  assert.equal(link.label, 'submit')
  assert.match(checkSourceAnchor(link, snapshot), /must be #L25/)
  assert.equal(checkSourceAnchor({ ...link, line: 25 }, snapshot), null)
  assert.match(checkSourceAnchor({ ...link, line: 101 }, snapshot), /outside file/)
  assert.match(checkSourceAnchor({ ...link, line: 0 }, snapshot), /outside file/)
  assert.match(checkSourceAnchor({ ...link, endLine: 0 }, snapshot), /outside file/)
  const [readingMap] = sourceLinks(`[\`submit\` · \`app/api.py:20\`](https://github.com/Orientation-CD/YuanZhu-AI/blob/${sha}/app/api.py#L20)`)
  assert.match(checkSourceAnchor(readingMap, snapshot), /must be #L25/)
  assert.equal(readingMap.rawLabel, '`submit` · `app/api.py:20`')
  assert.equal(readingMap.labelIndex, 1)
})

test('only the named floor-plan guide may opt into verified frontend candidate operations', () => {
  const candidate = { method: 'GET', path: '/v1/floor-plan-works', status: 'frontend-candidate-only', sources: [{ path: candidateContractFiles[0], commit: 'a'.repeat(40), sha256: 'b'.repeat(64) }] }
  const snapshot = { commits: { frontend: 'a'.repeat(40) }, api: [], frontend: { candidateApi: [candidate] }, sourceFiles: { frontend: { [candidateContractFiles[0]]: { sha256: 'b'.repeat(64) } } } }
  const revisions = { repositories: { frontend: { authorities: [{ path: candidateContractFiles[0], sha256: 'b'.repeat(64) }] } } }
  const text = '---\napiScope: frontend-candidate\n---\n# Unreleased integration\n'
  assert.deepEqual(validateCandidateApi(snapshot, revisions), [])
  assert(candidateApiForPage('frontend/floor-plans.md', text, snapshot).routes.has('GET /v1/floor-plan-works'))
  assert(candidateApiForPage('zh/frontend/floor-plans.md', text, snapshot).routes.has('GET /v1/floor-plan-works'))
  assert.match(candidateApiForPage('backend/workflows.md', text, snapshot).error, /unsupported apiScope/)
  assert.equal(candidateApiForPage('frontend/floor-plans.md', '# Guide\n\n```yaml\napiScope: frontend-candidate\n```', snapshot).routes.size, 0)
  assert.match(validateCandidateApi({ ...snapshot, api: [candidate] }, revisions).join('\n'), /duplicates main/)
  const forged = { ...candidate, sources: [{ ...candidate.sources[0], commit: 'c'.repeat(40) }] }
  assert.match(validateCandidateApi({ ...snapshot, frontend: { candidateApi: [forged] } }, revisions).join('\n'), /Unverified candidate fixture/)
})

const anchorScript = fileURLToPath(new URL('../scripts/rebase-source-anchors.py', import.meta.url))
const rebase = files => JSON.parse(execFileSync(process.env.DOCS_PYTHON || 'python3', [anchorScript], { input: JSON.stringify({ files }), encoding: 'utf8' }))

test('anchor maintenance relocates qualified Python and frontend definitions without executing source', () => {
  const rows = rebase([
    { path: 'api.py', old: 'raise RuntimeError("never execute")\nclass Api:\n    def submit(self):\n        return 1\n', new: '# refactor\n\nraise RuntimeError("never execute")\nclass Api:\n    def submit(self):\n        result = 2\n        return result\n', anchors: [{ id: 1, line: 3, endLine: 4 }] },
    { path: 'submit.ts', old: 'throw new Error("never execute");\nexport const send = () => 1;\n', new: '// helpers moved\nthrow new Error("never execute");\n\nexport const send = () => 2;\n', anchors: [{ id: 2, line: 2 }] },
  ])
  assert.deepEqual(rows[0], { id: 1, line: 5, endLine: 7, method: 'definition', symbol: 'Api.submit' })
  assert.deepEqual(rows[1], { id: 2, line: 4, method: 'definition', symbol: 'send' })
})

test('anchor maintenance preserves unchanged text but leaves changed or removed anchors for review', () => {
  const rows = rebase([
    { path: 'configuration.md', old: 'Title\nfirst setting\nsecond setting\n', new: 'Added introduction\nTitle\nfirst setting\nsecond setting\n', anchors: [{ id: 1, line: 2 }] },
    { path: 'configuration.md', old: 'Title\nold policy value\nFooter\n', new: 'Title\nnew policy value\nFooter\n', anchors: [{ id: 2, line: 2 }] },
    { path: 'api.py', old: 'def removed():\n    return 1\n', new: 'def replacement():\n    return 1\n', anchors: [{ id: 3, line: 1 }] },
  ])
  assert.equal(rows[0].line, 3)
  assert.match(rows[1].reason, /no unique unchanged context/)
  assert.equal(rows[1].line, undefined)
  assert.match(rows[2].reason, /missing or ambiguous/)
  assert.equal(rows[2].line, undefined)
})

test('anchor maintenance refuses repeated equal blocks in either source revision', () => {
  const block = 'HEADER\nvalue = keep\nFOOTER\n'
  const rows = rebase([
    { path: 'config.txt', old: block, new: block + block, anchors: [{ id: 1, line: 2 }] },
    { path: 'config.txt', old: block + block, new: block, anchors: [{ id: 2, line: 2 }] },
  ])
  for (const row of rows) {
    assert.equal(row.line, undefined)
    assert.match(row.reason, /no unique unchanged context/)
  }
})

test('anchor maintenance refuses repeated isolated lines without unique surrounding context', () => {
  const rows = rebase([
    { path: 'config.txt', old: 'old first\nvalue = keep\nold last\n', new: 'new first\nvalue = keep\nnew middle\nvalue = keep\nnew last\n', anchors: [{ id: 1, line: 2 }] },
    { path: 'config.txt', old: 'old first\nvalue = keep\nold middle\nvalue = keep\nold last\n', new: 'new first\nvalue = keep\nnew last\n', anchors: [{ id: 2, line: 2 }] },
  ])
  for (const row of rows) {
    assert.equal(row.line, undefined)
    assert.match(row.reason, /no unique unchanged context/)
  }
})
