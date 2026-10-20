import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
export const contentRoots = ['get-started', 'frontend', 'backend', 'admin', 'deploy', 'testing', 'reference']
export async function walk(dir, extension) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) result.push(...await walk(file, extension))
    else if (file.endsWith(extension)) result.push(file.replaceAll('\\', '/'))
  }
  return result.sort()
}
export async function pages() {
  return ['index.md', 'zh/index.md', ...(await Promise.all(contentRoots.flatMap((root) => [walk(root, '.md'), walk(`zh/${root}`, '.md')]))).flat()].sort()
}
export const normalizeRoute = (value) => value.replace(/\{[^}]+\}/g, '{}').replace(/\/$/, '')
export const loadJSON = async (file) => JSON.parse(await readFile(file, 'utf8'))
