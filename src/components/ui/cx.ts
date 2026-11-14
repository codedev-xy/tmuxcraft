export type ClassValue = string | false | null | undefined

/** Joins class names, skipping the ones switched off. */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}
