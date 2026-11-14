import type { TmuxState } from './types'
import { fail, ok } from './errors'
import type { Result } from './errors'
import { HOME } from './state'
import { appendLog } from './update'

function resolveSegments(segments: readonly string[]): string[] {
  const resolved: string[] = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') resolved.pop()
    else resolved.push(segment)
  }
  return resolved
}

/** One spelling per file: `x`, `./x`, `$HOME/x` and `~/x` all become `~/x`. The shell always sits in the home directory. */
export function normalizePath(path: string): string {
  const expanded = path.replace(/^\$(HOME|\{HOME\})(?=\/|$)/, HOME)
  if (expanded.startsWith('/')) return `/${resolveSegments(expanded.split('/')).join('/')}`
  const relative = expanded === HOME || expanded.startsWith(`${HOME}/`) ? expanded.slice(HOME.length) : expanded
  return [HOME, ...resolveSegments(relative.split('/'))].join('/')
}

export function readFile(state: TmuxState, path: string): Result<string> {
  const normalized = normalizePath(path)
  if (!Object.hasOwn(state.files, normalized)) return fail('file.notFound', { path: normalized })
  return ok(state.files[normalized])
}

/** Writes a file from the editor and logs it, so validators can tell whether a later `source-file` saw this version. */
export function saveFile(state: TmuxState, path: string, text: string): TmuxState {
  const normalized = normalizePath(path)
  const saved = { ...state, files: { ...state.files, [normalized]: text } }
  return appendLog(saved, { name: 'save-file', origin: 'typed', detail: { path: normalized } })
}

export function openEditor(state: TmuxState, path: string): TmuxState {
  return { ...state, editing: normalizePath(path) }
}

export function closeEditor(state: TmuxState): TmuxState {
  return { ...state, editing: null }
}
