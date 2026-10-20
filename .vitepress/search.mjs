// VitePress serializes this function with toString(). Keep all logic inside it:
// no captured imports, regex instances or platform-dependent ICU dictionaries.
export function tokenize(text) {
  return (String(text).normalize('NFKC').match(/\p{Script=Han}+|[\p{Script=Latin}\p{N}_]+/gu) || []).flatMap((token) => {
    if (/^\p{Script=Han}+$/u.test(token)) {
      const chars = Array.from(token)
      return chars.flatMap((char, index) => index + 1 < chars.length ? [char, char + chars[index + 1]] : [char])
    }
    return [...new Set([token, ...token.replace(/([a-z\d])([A-Z])/g, '$1_$2').split(/_+/u).filter(Boolean)])]
  })
}
