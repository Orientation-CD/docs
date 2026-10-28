// Source link checks use committed facts, never application imports or runtime
// dependencies. Candidate contracts are deliberately separate from main APIs.
export const candidateContractFiles = [
  'tests/fixtures/backend-floor-plan-group-6060-4bd4094c.json',
  'tests/fixtures/backend-floor-plan-management-6060-4bd4094c.json',
  'tests/fixtures/backend-floor-plan-panorama-6060-87737599.json',
  'tests/fixtures/backend-floor-plan-workflows-t45-source.json',
]

export function sourceLinks(text) {
  const pattern = /https:\/\/github\.com\/Orientation-CD\/(wechat_mini_program|YuanZhu-AI)\/(blob|tree)\/([^\s/)]+)\/([^\s)#?]+)(?:#L(\d+)(?:-L(\d+))?)?/g
  return [...text.matchAll(pattern)].map(match => {
    const rawLabel = text.slice(0, match.index).match(/\[([^\]\n]+)\]\($/)?.[1] || null
    return {
    url: match[0], index: match.index,
    repository: match[1] === 'YuanZhu-AI' ? 'backend' : 'frontend',
    kind: match[2], revision: match[3], path: decodeURIComponent(match[4]),
    line: match[5] ? Number(match[5]) : null,
    endLine: match[6] ? Number(match[6]) : null,
    label: rawLabel?.replace(/`/g, '').replace(/\(\)$/, '') || null,
    rawLabel, labelIndex: rawLabel === null ? null : match.index - rawLabel.length - 2,
  }})
}

export function frontendDefinitions(source) {
  return [...source.matchAll(/\b(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)\b/g)].map(match => ({
    symbol: match[1], line: source.slice(0, match.index).split('\n').length,
  }))
}

export function checkSourceAnchor(link, snapshot) {
  if (link.line === null) return null
  const metadata = snapshot.sourceFiles?.[link.repository]?.[link.path]
  if (!metadata) return `unverified source line range ${link.path}`
  if (link.line < 1 || link.line > metadata.lines || link.endLine !== null && (link.endLine < link.line || link.endLine > metadata.lines)) return `source line outside file ${link.path}#L${link.line}${link.endLine !== null ? `-L${link.endLine}` : ''} (${metadata.lines} lines)`
  // When a link names a verified trace binding, its anchor must identify that
  // definition, rather than a different in-bounds line after a refactor.
  const names = (link.label || '').split(/\s+[·→]\s+/).map(name => name.replace(/\(\)$/, ''))
  const matches = (snapshot.traceEvidence || []).filter(row => row.repository === link.repository && row.path === link.path && (names.includes(row.symbol) || names.includes(row.symbol.split('.').at(-1))))
  if (matches.length === 1 && link.line !== matches[0].line) return `source anchor for ${matches[0].symbol} must be #L${matches[0].line}, got #L${link.line}`
  return null
}

export function frontmatterValue(text, key) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
  return block?.match(new RegExp(`^${key}:\\s*([^\\r\\n]+)\\s*$`, 'm'))?.[1].replace(/^['"]|['"]$/g, '').trim()
}

export function candidateApiForPage(file, text, snapshot) {
  const scope = frontmatterValue(text, 'apiScope')
  if (!scope) return { routes: new Set(), error: null }
  if (scope !== 'frontend-candidate' || !['frontend/floor-plans.md', 'zh/frontend/floor-plans.md'].includes(file)) return { routes: new Set(), error: `unsupported apiScope in ${file}` }
  return { routes: new Set((snapshot.frontend.candidateApi || []).map(row => `${row.method} ${row.path.replace(/\{[^}]+\}/g, '{}')}`)), error: null }
}

export function validateCandidateApi(snapshot, revisions) {
  const errors = []
  const main = new Set(snapshot.api.map(row => `${row.method} ${row.path.replace(/\{[^}]+\}/g, '{}')}`))
  const seen = new Set()
  const authorities = new Map(revisions.repositories.frontend.authorities.map(row => [row.path, row.sha256]))
  for (const row of snapshot.frontend.candidateApi || []) {
    const key = `${row.method} ${row.path.replace(/\{[^}]+\}/g, '{}')}`
    if (main.has(key) || seen.has(key)) errors.push(`Candidate operation duplicates main/another candidate: ${key}`)
    seen.add(key)
    if (row.status !== 'frontend-candidate-only' || !row.path.startsWith('/v1/floor-plan-') || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(row.method)) errors.push(`Invalid candidate operation: ${key}`)
    if (!Array.isArray(row.sources) || !row.sources.length) errors.push(`Candidate operation has no fixture evidence: ${key}`)
    for (const source of row.sources || []) {
      if (!candidateContractFiles.includes(source.path) || source.commit !== snapshot.commits.frontend || !/^[a-f0-9]{64}$/.test(source.sha256) || authorities.get(source.path) !== source.sha256 || snapshot.sourceFiles?.frontend?.[source.path]?.sha256 !== source.sha256) errors.push(`Unverified candidate fixture: ${key} ${source.path}`)
    }
  }
  return errors
}
