import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMarkdownRenderer } from 'vitepress'
import { parseHTML } from 'linkedom'
import { markdownCodeCell } from '../scripts/source-utils.mjs'

test('generated table cells preserve union types and literal characters in rendered code', async () => {
  const md = await createMarkdownRenderer(process.cwd())
  for (const [value, expected] of [
    ['str | None', 'str | None'],
    ['a`b | c', 'a`b | c'],
    ['`literal`', '`literal`'],
    ['', '""'],
    ['<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
  ]) {
    const { document } = parseHTML(md.render(`| Value |\n| --- |\n| ${markdownCodeCell(value)} |`))
    assert.equal(document.querySelectorAll('td').length, 1)
    assert.equal(document.querySelector('td code').textContent, expected)
    assert.equal(document.querySelectorAll('td img').length, 0)
  }
})
