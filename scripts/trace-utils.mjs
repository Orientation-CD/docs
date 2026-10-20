import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export async function loadTraces(root = process.cwd()) {
  const directory = path.join(root, 'sources/traces')
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort()
  return (await Promise.all(files.map(async name => JSON.parse(await readFile(path.join(directory, name), 'utf8'))))).flat()
}

export const traceKey = row => `${row.method} ${row.path}`
export const evidenceKey = (repository, row) => `${repository}:${row.path}:${row.symbol}`

// This locates a declared JS/TS binding without evaluating the
// app, importing private dependencies, or serializing any source text/secrets.
export function frontendSymbolLine(source, symbol) {
  // Object method ownership needs a TypeScript AST; do not pretend a name
  // elsewhere in the file proves that target.method exists.
  if (symbol.includes('.')) return null
  const name = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const declaration = new RegExp(`\\b(?:function|const|let|class|interface|type)\\s+${name}\\b`, 'm')
  const match = declaration.exec(source)
  return match ? source.slice(0, match.index).split('\n').length : null
}

export function explicitSection(text, anchor) {
  const lines = text.split('\n')
  let fence = null, start = -1, depth = 0
  for (let i = 0; i < lines.length; i++) {
    const delimiter = lines[i].match(/^ {0,3}(`{3,}|~{3,})/)
    if (delimiter) {
      if (!fence) fence = delimiter[1]
      else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) fence = null
      continue
    }
    if (fence) continue
    const heading = lines[i].match(/^(#{1,6})\s/)
    if (!heading) continue
    if (start >= 0 && heading[1].length <= depth) return lines.slice(start, i).join('\n')
    if (lines[i].includes(`{#${anchor}}`)) { start = i; depth = heading[1].length }
  }
  return start < 0 ? '' : lines.slice(start).join('\n')
}

export function validateTraces(traces, snapshot, documents) {
  const errors = []
  const api = new Map(snapshot.api.map(row => [traceKey(row), row]))
  const evidence = new Map((snapshot.traceEvidence || []).map(row => [evidenceKey(row.repository, row), row]))
  const seen = new Set()
  for (const row of traces) {
    const key = traceKey(row)
    if (seen.has(key)) errors.push(`Duplicate trace: ${key}`)
    seen.add(key)
    if (!api.has(key)) errors.push(`Undeclared trace API: ${key}`)
    if (!/^reference\/[a-z0-9/-]+$/.test(row.page) || !/^[a-z0-9-]+$/.test(row.anchor)) {
      errors.push(`Invalid trace target: ${key}`)
      continue
    }
    if (!row.trigger?.en || !row.trigger?.zh) errors.push(`Missing bilingual trigger: ${key}`)
    if (!Array.isArray(row.backend) || !row.backend.length || !Array.isArray(row.frontend)) {
      errors.push(`Missing source chain: ${key}`)
      continue
    }
    const handler = api.get(key)?.handler
    if (handler && !row.backend.some(ref => ref.path === handler.source && ref.symbol === handler.symbol)) errors.push(`Handler not in chain: ${key}`)
    for (const repository of ['backend', 'frontend']) {
      for (const ref of row[repository]) {
        const fact = evidence.get(evidenceKey(repository, ref))
        if (!fact || !Number.isInteger(fact.line) || fact.line < 1 || !/^[a-f0-9]{64}$/.test(fact.sourceSha256)) errors.push(`Unverified source symbol: ${key} ${repository}:${ref.path}:${ref.symbol}`)
      }
    }
    for (const prefix of ['', 'zh/']) {
      const file = `${prefix}${row.page}.md`
      const text = documents.get(file)
      if (!text) { errors.push(`Missing trace chapter: ${file}`); continue }
      if (text.split(`{#${row.anchor}}`).length !== 2) errors.push(`Missing/duplicate explicit anchor: ${file}#${row.anchor}`)
      const section = explicitSection(text, row.anchor)
      if (!section.includes(`${row.method} ${row.path}`)) errors.push(`Missing exact endpoint explanation in target section: ${file}#${row.anchor} ${key}`)
      if (handler && !section.includes(handler.symbol)) errors.push(`Missing handler explanation in target section: ${file}#${row.anchor} ${handler.symbol}`)
      for (const ref of row.backend) if (!text.includes(ref.symbol.split('.').at(-1))) errors.push(`Missing explained backend symbol: ${file} ${ref.symbol}`)
    }
  }
  for (const key of api.keys()) if (!seen.has(key)) errors.push(`API without full-chain explanation: ${key}`)
  return [...new Set(errors)]
}
