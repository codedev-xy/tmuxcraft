// Names challenges draw from. None is the default window name `bash` or the default session name `0`,
// and none is a prefix of another, so a `-t` target always means the one intended.

export const WINDOW_NAMES: readonly string[] = ['code', 'server', 'logs', 'tests', 'docs', 'build', 'db', 'api', 'web', 'notes']

export const SESSION_NAMES: readonly string[] = ['work', 'ops', 'lab', 'prod', 'home', 'blog']

/** `status-style` background colours other than the default green. */
export const STATUS_COLOURS: readonly string[] = ['red', 'blue', 'yellow', 'magenta', 'cyan', 'white']
