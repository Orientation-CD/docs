import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { settingsWithExamples, markdownCodeCell } from './source-utils.mjs'
import { loadTraces, evidenceKey, frontendSymbolLine, traceKey } from './trace-utils.mjs'
import { candidateContractFiles } from './source-links.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const checking = args.includes('--check')
const knownOptions = new Set(['--frontend', '--backend', '--frontend-ref', '--backend-ref', '--check'])
for (let i = 0; i < args.length; i++) {
  if (!knownOptions.has(args[i])) throw new Error(`Unknown option ${args[i]}`)
  if (args[i] !== '--check' && (!args[++i] || args[i].startsWith('--'))) throw new Error('Option requires a value')
}
const previous = JSON.parse(await readFile(path.join(root, 'sources/revisions.json'), 'utf8'))
const git = (dir, ...argv) => execFileSync('git', ['-C', path.resolve(dir), ...argv], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const repos = {}
for (const [key, repo] of Object.entries(previous.repositories)) {
  const dir = option(`--${key}`, path.join(root, '..', repo.repository.split('/')[1]))
  const ref = option(`--${key}-ref`, repo.commit)
  const commit = git(dir, 'rev-parse', '--verify', `${ref}^{commit}`).trim()
  const names = git(dir, 'ls-tree', '-r', '--name-only', commit).trim().split('\n')
  const selected = names.filter((name) => key === 'backend'
    ? ['.env.example', 'pyproject.toml', 'README.md', 'Dockerfile', 'docker-compose.yml', 'tests/documents/TEST_STRATEGY.md'].includes(name) || name.startsWith('app/') && /\.(py|js|css|html|json)$/.test(name) && !name.startsWith('app/vendor/') || name.startsWith('documents/') && name.endsWith('.md') || name.startsWith('scripts/') && /\.(sh|py|md)$/.test(name) || name.startsWith('deploy/sae/') && /\.(sh|md)$/.test(name) || name.startsWith('migrations/versions/') && name.endsWith('.py') || name.startsWith('.github/workflows/') && /\.ya?ml$/.test(name)
    : ['package.json', '.env.example', 'README.md', 'vite.config.ts'].includes(name) || name.startsWith('src/') && /\.(ts|vue|json|scss|css|svg)$/.test(name) || name.startsWith('config/') && name.endsWith('.mjs') || name.startsWith('scripts/') && /\.(mjs|sh|py)$/.test(name) || candidateContractFiles.includes(name))
  const files = Object.fromEntries(selected.map((name) => [name, git(dir, 'show', `${commit}:${name}`)]))
  repos[key] = { ...repo, commit, files, allPaths: names }
}
const python = process.env.DOCS_PYTHON || 'python3'
const version = execFileSync(python, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'], { encoding: 'utf8' }).trim().split('.').map(Number)
if (version[0] < 3 || version[0] === 3 && version[1] < 12) throw new Error('Source extraction requires Python 3.12+. Set DOCS_PYTHON=python3.12 if needed.')
const facts = JSON.parse(execFileSync(python, [path.join(root, 'scripts/extract-source-facts.py')], {
  input: JSON.stringify({ files: repos.backend.files }), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
}))
const traces = await loadTraces(root)
const traceEvidence = new Map()
for (const trace of traces) {
  for (const repository of ['backend', 'frontend']) {
    for (const reference of trace[repository]) {
      const key = evidenceKey(repository, reference)
      if (traceEvidence.has(key)) continue
      const repo = repos[repository]
      if (!repo.allPaths.includes(reference.path)) throw new Error(`Missing trace source ${key}`)
      const source = repo.files[reference.path] ?? git(option(`--${repository}`, path.join(root, '..', repo.repository.split('/')[1])), 'show', `${repo.commit}:${reference.path}`)
      const definition = repository === 'backend' ? facts.symbols.find(item => item.source === reference.path && item.symbol === reference.symbol) : null
      const line = repository === 'backend' ? definition?.line : frontendSymbolLine(source, reference.symbol)
      if (!line) throw new Error(`Missing trace symbol ${key}`)
      traceEvidence.set(key, { repository, ...reference, line, sourceSha256: createHash('sha256').update(source).digest('hex') })
    }
  }
}
const parseEnv = (source) => Object.fromEntries(source.split('\n').flatMap((line) => {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
  if (!m) return []
  return [[m[1], /SECRET|PASSWORD|PRIVATE_KEY|API_KEY|ACCESS_KEY/.test(m[1]) ? '<secret example redacted>' : m[2]]]
}))
const backendExamples = parseEnv(repos.backend.files['.env.example'])
const settings = settingsWithExamples(facts.settings, backendExamples)
const frontendScripts = JSON.parse(repos.frontend.files['package.json']).scripts
const frontendEnv = [...new Set(['src/env.d.ts', '.env.example', 'config/build-targets.mjs'].map(name => repos.frontend.files[name]).flatMap((text) => text.match(/\bVITE_[A-Z0-9_]+\b/g) || []))].sort()
const normalizedOperation = row => `${row.method} ${row.path.replace(/\{[^}]+\}/g, '{}')}`
const mainOperations = new Set(facts.api.map(normalizedOperation))
const candidateApi = new Map()
for (const file of candidateContractFiles) {
  const source = repos.frontend.files[file]
  if (!source) throw new Error(`Missing frontend candidate contract ${file}`)
  const contract = JSON.parse(source)
  const evidence = { path: file, commit: repos.frontend.commit, sha256: createHash('sha256').update(source).digest('hex') }
  for (const [route, operations] of Object.entries(contract.paths || {})) {
    for (const method of Object.keys(operations)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue
      const entry = { method: method.toUpperCase(), path: route }
      if (mainOperations.has(normalizedOperation(entry))) throw new Error(`Candidate route is now on backend main; review its documentation scope: ${traceKey(entry)}`)
      const row = candidateApi.get(traceKey(entry)) || { ...entry, status: 'frontend-candidate-only', sources: [] }
      row.sources.push(evidence)
      candidateApi.set(traceKey(entry), row)
    }
  }
}
const snapshot = {
  schemaVersion: 1,
  commits: Object.fromEntries(Object.entries(repos).map(([key, value]) => [key, value.commit])),
  api: facts.api,
  settings,
  frontend: { packageManager: JSON.parse(repos.frontend.files['package.json']).packageManager, scripts: frontendScripts, envNames: frontendEnv, examples: parseEnv(repos.frontend.files['.env.example']), candidateApi: [...candidateApi.values()].sort((a, b) => traceKey(a).localeCompare(traceKey(b))) },
  sourcePaths: Object.fromEntries(Object.entries(repos).map(([key, value]) => [key, value.allPaths])),
  sourceFiles: Object.fromEntries(Object.entries(repos).map(([key, value]) => [key, Object.fromEntries(Object.entries(value.files).map(([name, source]) => [name, { lines: source.split('\n').length - (source.endsWith('\n') ? 1 : 0), sha256: createHash('sha256').update(source).digest('hex') }]))])),
  traceEvidence: [...traceEvidence.values()].sort((a, b) => evidenceKey(a.repository, a).localeCompare(evidenceKey(b.repository, b))),
}
const authorityPaths = {
  frontend: ['package.json', '.env.example', 'src/env.d.ts', 'config/build-targets.mjs', 'src/stores/theme.ts', 'src/styles/design-tokens.json', 'src/styles/themes/minimal.json', 'src/styles/themes/modern.json', 'src/api/dto/floorPlan.ts', 'scripts/api-contract-source.mjs', ...candidateContractFiles],
  backend: ['app/api/__init__.py', 'app/core/models.py', 'app/core/config.py', 'app/persistence/db_models.py', 'app/workflows/workflow_admission.py', 'app/assets/asset_input_archival.py', 'app/billing/member_token_quotas.py', 'app/core/performance_history.py', 'documents/REST_API_INTERFACE.md', 'documents/ASSET_STORAGE_OPERATIONS.md', 'README.md', 'tests/documents/TEST_STRATEGY.md', 'scripts/runbook.md', 'deploy/sae/SAE_DEPLOYMENT_RUNBOOK.md', 'documents/DOUYIN_PAYMENT.md', 'documents/ai_copywriting_setup.md'],
}
const revisions = { schemaVersion: 1, verifiedAt: previous.verifiedAt, docsBaseCommit: previous.docsBaseCommit, repositories: Object.fromEntries(Object.entries(repos).map(([key, value]) => [key, {
  repository: value.repository, branch: value.branch, commit: value.commit,
  authorities: authorityPaths[key].map((file) => {
    if (!(file in value.files)) throw new Error(`Missing authority ${file}`)
    return { path: file, sha256: createHash('sha256').update(value.files[file]).digest('hex') }
  }),
}])) }
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const outputs = { 'sources/revisions.json': json(revisions), 'sources/contracts.json': json(snapshot) }
const cell = markdownCodeCell
for (const locale of ['en', 'zh']) {
  const zh = locale === 'zh'
  const traceMap = new Map(traces.map(row => [traceKey(row), row]))
  const sourceRows = Object.entries(revisions.repositories).map(([key, repo]) => `| ${key} | [${repo.repository}](https://github.com/${repo.repository}/tree/${repo.commit}) | ${cell(repo.branch)} | ${cell(repo.commit)} |`)
  outputs[`.vitepress/generated/revisions.${locale}.md`] = [zh ? '| 组件 | 仓库与已核验版本 | 分支 | 提交 SHA |' : '| Component | Repository at verified revision | Branch | Commit SHA |', '| --- | --- | --- | --- |', ...sourceRows, '', zh ? `核验日期：${revisions.verifiedAt}。` : `Verified on ${revisions.verifiedAt}.`, ''].join('\n')
  outputs[`.vitepress/generated/api.${locale}.md`] = [
    zh ? '以下为固定后端 main 版本的公开路由声明。默认状态取自路由装饰器，并不代表所有请求的运行时结果；已弃用接口是否仍可用，以对应的逐接口说明为准。前端候选契约不属于本清单。权限、错误和业务语义以相应指南与 REST 契约为准。' : 'Public route declarations at the pinned backend main revision. The declared default status is not the outcome of every request; consult each endpoint explanation for the behavior of deprecated routes. Frontend candidate contracts are excluded. Authorization, errors and business semantics come from the domain guides and REST contract.', '',
    zh ? '| 方法 | 路由 | 默认状态 | 兼容状态 | FastAPI 处理函数 | 全链路讲解 |' : '| Method | Route | Default status | Compatibility | FastAPI handler | End-to-end explanation |', '| --- | --- | --- | --- | --- | --- |',
    ...facts.api.map(row => {
      const handler = row.handler
      const trace = traceMap.get(traceKey(row))
      const guide = trace ? `[${zh ? '追踪此接口' : 'Trace this API'}](${zh ? '/zh' : ''}/${trace.page}#${trace.anchor})` : '—'
      return `| ${row.method} | ${cell(row.path)} | ${row.status} | ${row.deprecated ? (zh ? '已弃用，见逐接口说明' : 'Deprecated; see endpoint') : '—'} | [${handler.symbol}](https://github.com/${revisions.repositories.backend.repository}/blob/${revisions.repositories.backend.commit}/${handler.source}#L${handler.line}) | ${guide} |`
    }), '',
  ].join('\n')
  const lines = [
    `<!-- Generated by pnpm docs:sources. Do not edit manually. -->`, '',
    `## ${zh ? '已核验的后端设置' : 'Verified backend settings'}`, '',
    zh ? '下表来自已固定版本的 Settings 与 `.env.example`。代码默认值与示例环境值分列；示例不代表生产配置。敏感字段已隐藏。' : 'Extracted from pinned Settings and `.env.example`. Code defaults and example environment values are separate; examples are not production configuration. Secret fields are redacted.', '',
    zh ? '| 环境变量 | 类型 | 代码默认值 | 示例环境值 |' : '| Environment variable | Type | Code default | Example environment |',
    '| --- | --- | --- | --- |',
    ...settings.map((row) => `| ${cell(row.env)} | ${cell(row.type)} | ${cell(row.default)} | ${row.example === null ? '—' : cell(row.example)} |`), '',
    `## ${zh ? '前端构建环境变量' : 'Frontend build variables'}`, '',
    zh ? '以下变量名从前端环境声明、构建配置与脚本提取。未出现示例值不表示变量有隐式默认值；构建档可能覆盖外部设置。' : 'Names are extracted from frontend declarations, build configuration and scripts. An absent example does not imply a default; build profiles can override supplied values.', '',
    zh ? '| 变量 | .env.example 示例 |' : '| Variable | .env.example example |', '| --- | --- |',
    ...frontendEnv.map((name) => `| ${cell(name)} | ${snapshot.frontend.examples[name] === undefined ? '—' : cell(snapshot.frontend.examples[name])} |`), '',
  ]
  outputs[`.vitepress/generated/configuration.${locale}.md`] = lines.join('\n')
}
for (const [file, content] of Object.entries(outputs)) {
  const target = path.join(root, file)
  if (checking) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Source snapshot drift: ${file}. Review source changes, then run without --check.`)
  } else {
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
}
console.log(`${checking ? 'Verified' : 'Updated'} source snapshots: ${facts.api.length} public route declarations, ${settings.length} settings, ${Object.keys(frontendScripts).length} frontend scripts. No application code executed.`)
