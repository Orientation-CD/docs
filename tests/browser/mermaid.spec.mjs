import { test, expect } from '@playwright/test'
import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMarkdownRenderer } from 'vitepress'
import { pages } from '../../scripts/content-lib.mjs'

// Load the installed browser distribution, including its lazy parser chunks,
// through a completely intercepted origin. No CDN or application API is used.
const validationOrigin = 'http://mermaid-validation.test'
const mermaidDist = await realpath(path.dirname(fileURLToPath(import.meta.resolve('mermaid'))))

test('every content Mermaid fence parses in Chromium with the installed Mermaid version', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const markdown = await createMarkdownRenderer(process.cwd())
  const diagrams = []
  for (const file of await pages()) {
    const source = await readFile(file, 'utf8')
    let block = 0
    for (const token of markdown.parse(source, {})) {
      if (token.type !== 'fence' || token.info.trim().split(/\s+/)[0] !== 'mermaid') continue
      diagrams.push({ file, block: ++block, line: token.map[0] + 1, source: token.content })
    }
  }
  expect(diagrams.length, 'The source inventory must contain Mermaid diagrams').toBeGreaterThan(0)

  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== validationOrigin) return route.abort('blockedbyclient')
    if (url.pathname === '/') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body>Mermaid source validation</body></html>' })
    }
    try {
      const filename = await realpath(path.resolve(mermaidDist, `.${decodeURIComponent(url.pathname)}`))
      const relative = path.relative(mermaidDist, filename)
      if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative) || !filename.endsWith('.mjs')) {
        return route.fulfill({ status: 403, body: 'Outside the installed Mermaid module distribution' })
      }
      return route.fulfill({ contentType: 'text/javascript', body: await readFile(filename) })
    } catch {
      return route.fulfill({ status: 404, body: 'Installed Mermaid module not found' })
    }
  })
  await page.goto(validationOrigin)
  const failures = await page.evaluate(async inventory => {
    const { default: mermaid } = await import('/mermaid.esm.min.mjs')
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    const failures = []
    for (const diagram of inventory) {
      try {
        await mermaid.parse(diagram.source, { suppressErrors: false })
      } catch (error) {
        failures.push({ ...diagram, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return failures
  }, diagrams)
  await testInfo.attach('mermaid-source-validation.json', {
    contentType: 'application/json',
    body: JSON.stringify({ diagrams: diagrams.length, failures }, null, 2),
  })
  const detail = failures.map(({ file, line, block, source, error }) =>
    `${file}:${line}, Mermaid block ${block}\n${error}\n\n${source}`).join('\n\n')
  expect(failures, detail || `All ${diagrams.length} Mermaid source blocks parsed`).toEqual([])
})
