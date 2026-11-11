/**
 * How long after submitting a report the author may still edit or delete it.
 *
 * MUST match `EDIT_WINDOW_MS` in `erpnestbackend/src/reports/reports.service.ts`.
 * The server is the authority: it rejects late edits regardless of what the UI
 * shows. This constant only decides whether the Edit/Delete buttons appear, so a
 * mismatch can either hide an allowed action or offer one that will be refused.
 */
export const EDIT_WINDOW_MS = 15 * 60 * 1000

/** True when a report is still inside its edit/delete window. */
export function isWithinEditWindow(submittedAt, now = Date.now()) {
  if (!submittedAt) return false
  return now - new Date(submittedAt).getTime() <= EDIT_WINDOW_MS
}
