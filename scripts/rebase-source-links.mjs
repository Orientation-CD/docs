import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pages } from './content-lib.mjs'
import { sourceLinks } from './source-links.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
process.chdir(root)
const args = process.argv.slice(2)
const accepted = new Set(['--from', '--to', '--frontend', '--backend', '--report', '--write', '--help'])
for (let index = 0; index < args.length; index++) {
  if (!accepted.has(args[index])) throw new Error(`Unknown option ${args[index]}`)
  if (!['--write', '--help'].includes(args[index]) && (!args[++index] || args[index].startsWith('--'))) throw new Error('Option requires a value')
}
if (args.includes('--help')) {
  console.log('node scripts/rebase-source-links.mjs --from OLD_REVISIONS.json [--to sources/revisions.json] [--frontend REPO] [--backend REPO] [--report REPORT.json] [--write]\nWithout --write, Markdown is never changed. Changed/ambiguous source anchors remain untouched and are listed for review.')
  process.exit(0)
}
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
if (!args.includes('--from')) throw new Error('--from must identify the previous audited revisions file')
const from = JSON.parse(await readFile(option('--from'), 'utf8'))
const to = JSON.parse(await readFile(option('--to', 'sources/revisions.json'), 'utf8'))
const git = (directory, ...argv) => execFileSync('git', ['-C', directory, ...argv], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const repositories = {}
for (const key of ['frontend', 'backend']) {
  if (from.repositories[key].repository !== to.repositories[key].repository) throw new Error(`Repository identity changed for ${key}`)
  const directory = path.resolve(option(`--${key}`, path.join(root, '..', to.repositories[key].repository.split('/')[1])))
  const before = git(directory, 'rev-parse', '--verify', '--end-of-options', `${from.repositories[key].commit}^{commit}`).trim()
  const after = git(directory, 'rev-parse', '--verify', '--end-of-options', `${to.repositories[key].commit}^{commit}`).trim()
  const names = new Set(git(directory, 'ls-tree', '-r', '--name-only', after).trim().split('\n'))
  const renameRows = git(directory, 'diff', '--name-status', '--find-renames', before, after).split('\n')
  const renames = new Map(renameRows.filter(row => /^R\d+\t/.test(row)).map(row => row.split('\t').slice(1)))
  repositories[key] = { directory, before, after, names, renames }
}
const originals = new Map()
const links = []
const groups = new Map()
const unresolved = []
for (const file of await pages()) {
  const text = await readFile(file, 'utf8')
  originals.set(file, text)
  for (const link of sourceLinks(text)) {
    const repo = repositories[link.repository]
    if (link.revision !== repo.before || repo.before === repo.after) continue
    const id = links.length
    const targetPath = repo.renames.get(link.path) || link.path
    const targetExists = repo.names.has(targetPath) || link.kind === 'tree' && [...repo.names].some(name => name.startsWith(`${targetPath}/`))
    const entry = { ...link, id, file, targetPath }
    links.push(entry)
    if (!targetExists) { unresolved.push({ ...entry, reason: 'Source path disappeared without a proven Git rename.' }); continue }
    if (link.line === null) continue
    const key = `${link.repository}:${link.path}`
    if (!groups.has(key)) {
      try {
        groups.set(key, { repository: link.repository, path: targetPath,
          old: git(repo.directory, 'show', `${repo.before}:${link.path}`),
          new: git(repo.directory, 'show', `${repo.after}:${targetPath}`), anchors: [] })
      } catch { unresolved.push({ ...entry, reason: 'Committed source text cannot be read.' }); continue }
    }
    groups.get(key).anchors.push({ id, line: link.line, endLine: link.endLine })
  }
}
const python = process.env.DOCS_PYTHON || 'python3'
const mapped = JSON.parse(execFileSync(python, [path.join(root, 'scripts/rebase-source-anchors.py')], {
  input: JSON.stringify({ files: [...groups.values()] }), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
}))
const anchors = new Map(mapped.map(row => [row.id, row]))
const failed = new Set(unresolved.map(row => row.id))
const changes = []
for (const link of links) {
  if (failed.has(link.id)) continue
  const anchor = anchors.get(link.id)
  if (link.line !== null && !anchor?.line) {
    unresolved.push({ ...link, reason: anchor?.reason || 'No proven source mapping.' })
    continue
  }
  const repo = repositories[link.repository]
  const encodedPath = link.targetPath.split('/').map(encodeURIComponent).join('/')
  const target = `https://github.com/${to.repositories[link.repository].repository}/${link.kind}/${repo.after}/${encodedPath}${anchor ? `#L${anchor.line}${anchor.endLine ? `-L${anchor.endLine}` : ''}` : ''}`
  changes.push({ file: link.file, index: link.index, before: link.url, after: target, method: anchor?.method || 'revision-and-path', symbol: anchor?.symbol, kind: 'url' })
  if (anchor && link.rawLabel !== null) {
    const revisedLabel = link.rawLabel.replaceAll(`${link.path}:${link.line}`, `${link.targetPath}:${anchor.line}`)
    if (revisedLabel !== link.rawLabel) changes.push({ file: link.file, index: link.labelIndex, before: link.rawLabel, after: revisedLabel, method: 'source-label-line', kind: 'label' })
  }
}
if (args.includes('--write')) {
  for (const [file, original] of originals) {
    const rows = changes.filter(row => row.file === file).sort((a, b) => b.index - a.index)
    if (!rows.length) continue
    if (await readFile(file, 'utf8') !== original) throw new Error(`Concurrent edit detected in ${file}; no overwrite attempted. Re-run after writers finish.`)
    let revised = original
    for (const row of rows) revised = revised.slice(0, row.index) + row.after + revised.slice(row.index + row.before.length)
    await writeFile(file, revised)
  }
}
const report = { mode: args.includes('--write') ? 'write-proven-only' : 'dry-run',
  from: Object.fromEntries(Object.entries(repositories).map(([key, value]) => [key, value.before])),
  to: Object.fromEntries(Object.entries(repositories).map(([key, value]) => [key, value.after])), changes, unresolved }
const reportPath = option('--report')
if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ mode: report.mode, provenLinks: changes.filter(row => row.kind === 'url').length, refreshedLabels: changes.filter(row => row.kind === 'label').length, unresolvedLinks: unresolved.length, report: reportPath || null }))
if (unresolved.length) {
  if (!reportPath) console.log(JSON.stringify(unresolved, null, 2))
  process.exitCode = 2
}
