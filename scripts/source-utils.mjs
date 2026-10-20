// Secret classification comes from Settings' type metadata as well as names.
// In particular CONFIG_ENCRYPTION_KEY is a SecretStr without a SECRET suffix.
export function settingsWithExamples(settings, examples) {
  return settings.map((row) => ({
    ...row,
    example: !Object.hasOwn(examples, row.env) ? null : row.secret ? '<secret example redacted>' : examples[row.env],
  }))
}

// HTML entities inside Markdown code spans render literally. Escape table
// delimiters for the table parser, and choose a fence longer than the content.
export function markdownCodeCell(value) {
  const text = String(typeof value === 'object' ? JSON.stringify(value) : value).replaceAll('\n', ' ') || '""'
  const longestRun = (text.match(/`+/g) || []).reduce((longest, run) => Math.max(longest, run.length), 0)
  const fence = '`'.repeat(longestRun + 1)
  const padding = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return fence + padding + text.replaceAll('|', '\\|') + padding + fence
}
