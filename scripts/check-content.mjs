import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pages, loadJSON, normalizeRoute } from './content-lib.mjs'
import { topicRoutes, navigation, sidebar } from '../.vitepress/navigation.mjs'

const files = await pages()
const available = new Set(files)
const revisions = await loadJSON('sources/revisions.json')
const snapshot = await loadJSON('sources/contracts.json')
const api = new Set(snapshot.api.map((row) => `${row.method} ${normalizeRoute(row.path)}`))
const env = { frontend: new Set(snapshot.frontend.envNames), backend: new Set(snapshot.settings.flatMap((row) => [row.env, row.name.toUpperCase(), ...row.aliases])) }
const ownScripts = Object.keys((await loadJSON('package.json')).scripts)
const scripts = new Set([...Object.keys(snapshot.frontend.scripts), ...ownScripts, 'install', 'exec', 'add', 'dlx', 'approve-builds'])
const errors = []
const check = (condition, message) => { if (!condition) errors.push(message) }
assert.equal(revisions.schemaVersion, snapshot.schemaVersion)
for (const [key, source] of Object.entries(revisions.repositories)) {
  check(/^[a-f0-9]{40}$/.test(source.commit), `${key}: invalid source SHA`)
  check(snapshot.commits[key] === source.commit, `${key}: snapshot/revision mismatch`)
}
for (const route of topicRoutes) {
  for (const locale of ['', 'zh/']) check(available.has(`${locale}${route}.md`), `Navigation page missing: ${locale}${route}.md`)
}
const flatten = (items) => items.flatMap((item) => item.items ? flatten(item.items) : item.link ? [item.link] : [])
const advertised = new Set([...flatten(navigation('en')), ...Object.values(sidebar('en')).flatMap(flatten)].map((url) => url.slice(1)))
let apiAssertions = 0
let scriptAssertions = 0
let sourceLinks = 0
for (const file of files) {
  const text = await readFile(file, 'utf8')
  const route = file.replace(/^zh\//, '').replace(/\.md$/, '')
  const counterpart = file.startsWith('zh/') ? file.slice(3) : `zh/${file}`
  check(available.has(counterpart), `${file}: missing locale counterpart`)
  const migration = /^search:\s*false\s*$/m.test(text)
  if (route !== 'index' && !migration) check(advertised.has(route), `${file}: orphan page not in navigation`)
  check(!text.includes('/api/v1'), `${file}: obsolete /api/v1 prefix`)
  check(!/\]\(\/(?!zh\/|\)|#)/.test(file.startsWith('zh/') ? text : ''), `${file}: Chinese Markdown link points outside /zh/`)
  for (const match of text.matchAll(/https:\/\/github\.com\/Orientation-CD\/(wechat_mini_program|YuanZhu-AI)\/(blob|tree)\/([^\s/)]+)\/([^\s)#?]+)/g)) {
    const key = match[1] === 'YuanZhu-AI' ? 'backend' : 'frontend'
    const [ref, rawPath] = [match[3], decodeURIComponent(match[4])]
    check(ref === revisions.repositories[key].commit, `${file}: moving/unverified source ref ${ref}`)
    check(snapshot.sourcePaths[key].some((name) => name === rawPath || match[2] === 'tree' && name.startsWith(`${rawPath}/`)), `${file}: missing source path ${match[1]}/${rawPath}`)
    sourceLinks++
  }
  if (!['reference/maintenance', 'reference/source-revisions'].includes(route)) check(text.includes('/blob/') || text.includes('/tree/'), `${file}: missing pinned source evidence`)
  for (const match of text.matchAll(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/v1\/[^\s`<>|,;)"']+|\/health\/(?:live|ready))/g)) {
    const item = `${match[1]} ${normalizeRoute(match[2].split('?')[0])}`
    check(api.has(item), `${file}: unknown API ${item}`)
    apiAssertions++
  }
  for (const match of text.matchAll(/\bpnpm(?:@[\d.]+)?\s+((?:docs:|dev:|build:|quality:|test:|check:)[\w:.-]+|type-check(?::test)?)/g)) {
    check(scripts.has(match[1]), `${file}: unknown pnpm script ${match[1]}`)
    scriptAssertions++
  }
  for (const match of text.matchAll(/<!--\s*@source-check env (backend|frontend) ([A-Z0-9_]+)\s*-->/g)) check(env[match[1]].has(match[2]), `${file}: unknown ${match[1]} environment variable ${match[2]}`)
  for (const match of text.matchAll(/\bVITE_[A-Z0-9_]+\b/g)) check(env.frontend.has(match[0]), `${file}: unknown frontend variable ${match[0]}`)
}
const inventory = await loadJSON('sources/page-migration.json')
for (const file of files) check(inventory.pages.some(entry => entry.path === file), `${file}: missing page migration inventory entry`)
for (const entry of inventory.pages) {
  check(available.has(entry.path), `Lost historical URL: ${entry.path}`)
  if (entry.action === 'migration') check(/^search:\s*false\s*$/m.test(await readFile(entry.path, 'utf8')), `${entry.path}: migration stub must be excluded from search`)
}
if (errors.length) throw new Error(`Content validation failed (${errors.length}):\n${[...new Set(errors)].join('\n')}`)
console.log(`Content verified: ${files.length} pages, ${apiAssertions} API references, ${scriptAssertions} script references, ${sourceLinks} pinned source links; bilingual navigation and historical URLs intact.`)
