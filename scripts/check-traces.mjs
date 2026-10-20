import { readFile } from 'node:fs/promises'
import { pages, loadJSON } from './content-lib.mjs'
import { loadTraces, validateTraces } from './trace-utils.mjs'

const traces = await loadTraces()
const snapshot = await loadJSON('sources/contracts.json')
const documents = new Map(await Promise.all((await pages()).map(async file => [file, await readFile(file, 'utf8')])))
const errors = validateTraces(traces, snapshot, documents)
for (const locale of ['en', 'zh']) {
  const index = await readFile(`.vitepress/generated/api.${locale}.md`, 'utf8')
  for (const row of traces) if (!index.includes(`(${locale === 'zh' ? '/zh' : ''}/${row.page}#${row.anchor})`)) errors.push(`Missing generated ${locale} chain link: ${row.method} ${row.path}`)
}
if (errors.length) throw new Error(`Call-chain validation failed (${errors.length}):\n${[...new Set(errors)].join('\n')}`)
console.log(`Call chains verified: ${traces.length}/${snapshot.api.length} public route declarations; bilingual endpoint anchors, FastAPI handlers and ${snapshot.traceEvidence.length} pinned source symbols.`)
