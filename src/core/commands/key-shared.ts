import type { KeyId } from '../types'
import { fail, ok } from '../errors'
import type { Result } from '../errors'
import { normalizeKey, RESERVED_KEYS } from '../keymap'

/** A key argument in canonical form; `key.invalid` names the word as typed. */
export function readKey(word: string): Result<KeyId> {
  const key = normalizeKey(word)
  return key === null ? fail('key.invalid', { key: word }) : ok(key)
}

/** A key argument that may be bound or used as a prefix: any key the browser lets a page see. */
export function bindableKey(word: string): Result<KeyId> {
  const key = readKey(word)
  if (!key.ok) return key
  return RESERVED_KEYS.includes(key.value) ? fail('key.reserved', { key: key.value }) : key
}
