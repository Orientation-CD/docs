import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parseHTML } from 'linkedom'
import { walk, pages } from './content-lib.mjs'
import { tokenize } from '../.vitepress/search.mjs'

const dist = '.vitepress/dist'
const files = await walk(dist, '.html')
const expectedPages = new Set((await pages()).map((page) => `${dist}/${page.replace(/\.md$/, '.html')}`))
for (const file of files) {
  assert(file === `${dist}/404.html` || expectedPages.has(file), `Unexpected published page ${file}; keep developer instructions and skills outside the site`)
}
const base = '/docs/'
const documents = new Map()
const errors = []
for (const file of files) documents.set(file, parseHTML(await readFile(file, 'utf8')).document)
function routeFile(url) {
  const route = decodeURIComponent(url.pathname).slice(base.length)
  if (!route || route.endsWith('/')) return `${dist}/${route}index.html`
  return `${dist}/${route}${path.extname(route) ? '' : '.html'}`
}
for (const [file, document] of documents) {
  if (file === `${dist}/404.html`) continue
  const route = file.slice(dist.length).replace(/index\.html$/, '').replace(/\.html$/, '')
  const current = new URL(`/docs${route}`, 'http://docs.local')
  const zh = file.startsWith(`${dist}/zh/`)
  if (!file.endsWith('/index.html')) assert(document.querySelector('.VPSidebar'), `${file}: sidebar missing`)
  for (const node of document.querySelectorAll('[href],[src]')) {
    for (const attribute of ['href', 'src']) {
      const value = node.getAttribute(attribute)
      if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/.test(value) || value.startsWith('//')) continue
      const target = new URL(value, current)
      if (!target.pathname.startsWith(base)) { errors.push(`${file}: escapes base: ${value}`); continue }
      const targetFile = routeFile(target)
      try { await stat(targetFile) } catch { errors.push(`${file}: missing target ${value}`); continue }
      if (target.hash && documents.has(targetFile)) {
        const id = decodeURIComponent(target.hash.slice(1))
        if (!documents.get(targetFile).getElementById(id)) errors.push(`${file}: missing fragment ${value}`)
      }
      if (attribute === 'href' && documents.has(targetFile) && !node.closest('.VPNavBarTranslations,.VPNavScreenTranslations,.translations')) {
        const targetZh = target.pathname.startsWith('/docs/zh/')
        if (zh !== targetZh) errors.push(`${file}: cross-locale internal link ${value}`)
      }
    }
  }
}
// Test actual emitted indexes after VitePress function serialization and JSON loading.
const require = createRequire(import.meta.resolve('vitepress'))
const MiniSearch = require('minisearch')
const reconstructed = new Function(`return (${tokenize.toString()})`)()
const indexes = (await walk(`${dist}/assets`, '.js')).filter((name) => /\/@localSearchIndex(?:zh|root)\.[^/]+\.js$/.test(name))
const queries = { root: ['workflow', 'PowerPoint', '/v1/workflows', 'PROJECT_OUTCOMES_ENABLED'], zh: ['工作流', '设计报告', '文案', '抖音支付', '/v1/workflows', 'PROJECT_OUTCOMES_ENABLED'] }
for (const locale of ['root', 'zh']) {
  const file = indexes.find((name) => path.basename(name).startsWith(`@localSearchIndex${locale}.`))
  assert(file, `Missing ${locale} search index`)
  const text = await readFile(file, 'utf8')
  // The index module stores MiniSearch JSON as one JavaScript string constant.
  const match = text.match(/=(`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)
  assert(match, `Cannot decode ${file}`)
  const serialized = new Function(`return (${match[1]})`)()
  const index = MiniSearch.loadJSON(serialized, { fields: ['title', 'titles', 'text'], storeFields: ['title', 'titles'], tokenize: reconstructed, searchOptions: { combineWith: 'AND', prefix: true, fuzzy: .2 } })
  assert(index.documentCount > 0)
  // Check every indexed section, including pages no smoke-test query would return.
  const documentIds = Object.values(JSON.parse(serialized).documentIds)
  assert(documentIds.length > 0, `Missing indexed document IDs in ${file}`)
  for (const id of documentIds) {
    assert.equal(typeof id, 'string', `Invalid search document ID in ${file}`)
    const url = new URL(id, 'http://docs.local')
    assert.equal(url.origin, 'http://docs.local', `External search page ${id}`)
    assert(url.pathname.startsWith(base), `Search page escapes base: ${id}`)
    assert.equal(url.pathname.startsWith('/docs/zh/'), locale === 'zh', `Wrong search locale: ${id}`)
    const targetFile = routeFile(url)
    assert(expectedPages.has(targetFile), `Unexpected search page ${id}; developer instructions and skills must not be indexed`)
    const doc = documents.get(targetFile)
    assert(doc, `Missing search page ${id}`)
    if (url.hash) assert(doc.getElementById(decodeURIComponent(url.hash.slice(1))), `Missing search anchor ${id}`)
  }
  for (const query of queries[locale]) {
    const results = index.search(query)
    assert(results.length, `${locale}: no search results for ${query}`)
  }
}
for (const page of expectedPages) assert(documents.has(page), `Unbuilt page ${page}`)
if (errors.length) throw new Error(`Built site validation failed (${errors.length}):\n${[...new Set(errors)].join('\n')}`)
console.log(`Built site verified: ${files.length} HTML pages; local links, anchors, assets, locale boundaries and emitted search indexes pass.`)
