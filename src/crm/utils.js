export const isSuperRole = (role) => role === 'superadmin' || role === 'superuser'

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const nameKey = (name) => String(name).trim().toLocaleLowerCase()

/**
 * True when `value` matches another name in `names`, ignoring case and
 * surrounding spaces. `ignoreIndex` skips the item being renamed.
 * Matches the server rule: stage names are unique per pipeline, case-insensitively.
 */
export const hasNameConflict = (names, value, ignoreIndex = -1) =>
  names.some((name, index) => index !== ignoreIndex && nameKey(name) === nameKey(value))

export const sortStages = (stages) =>
  [...(stages || [])].sort((a, b) => a.position - b.position || a.id - b.id)

/** Drag-and-drop ids for the board: cards and stage columns. */
export const dealDndId = (id) => `deal-${id}`
export const stageDndId = (id) => `stage-${id}`
