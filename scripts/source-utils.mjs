// Secret classification comes from Settings' type metadata as well as names.
// In particular CONFIG_ENCRYPTION_KEY is a SecretStr without a SECRET suffix.
export function settingsWithExamples(settings, examples) {
  return settings.map((row) => ({
    ...row,
    example: !Object.hasOwn(examples, row.env) ? null : row.secret ? '<secret example redacted>' : examples[row.env],
  }))
}
