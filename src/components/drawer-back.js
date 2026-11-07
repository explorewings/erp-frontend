import { useCallback, useEffect, useRef } from 'react'

/*
 * Shared drawer history/stack helpers, used by every right-side drawer
 * (calendar DrawerShell, notifications drawer) so back button, Escape and
 * stacking behave the same everywhere.
 */

// Stacking: mounted drawers register here bottom → top so Escape and the back
// button only affect the topmost drawer when several are stacked.
let drawerSeq = 0
const drawerStack = []

/** Register a mounted drawer; returns its unregister function. */
export function registerDrawer(id) {
  drawerStack.push(id)
  return () => {
    const index = drawerStack.indexOf(id)
    if (index !== -1) drawerStack.splice(index, 1)
  }
}

/** True when the drawer with this id is the topmost open drawer. */
export function isTopDrawer(id) {
  return drawerStack[drawerStack.length - 1] === id
}

/**
 * Browser/phone back button closes the drawer instead of leaving the page.
 * A unique marker state is pushed on open; popstate closes the drawer unless
 * the pop landed on this drawer's own marker (a drawer above closed and
 * revealed this one) or this drawer is already closing by other means.
 *
 * Returns `{ close, release }`:
 * - `close()` — onClose + pop the marker (X button, Escape, scrim).
 * - `release()` — onClose but leave the marker (call before an in-app
 *   navigation, e.g. following a notification link, so back() cannot undo it).
 */
export function useCloseOnBack(enabled, onClose) {
  const stateRef = useRef(null)
  if (stateRef.current === null) stateRef.current = { id: ++drawerSeq, pushed: false, closing: false }
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!enabled) return undefined
    if (!stateRef.current.pushed) {
      stateRef.current.pushed = true
      window.history.pushState({ ewDrawer: stateRef.current.id }, '')
    }
    const onPop = () => {
      if (window.history.state?.ewDrawer === stateRef.current.id) return
      if (stateRef.current.closing) {
        stateRef.current.pushed = false
        stateRef.current.closing = false
        return
      }
      stateRef.current.pushed = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [enabled])

  // Stable identities so callers can safely use these in effect dependencies.
  const close = useCallback(() => {
    onCloseRef.current()
    if (stateRef.current.pushed) {
      stateRef.current.closing = true
      window.history.back()
    }
  }, [])
  const release = useCallback(() => {
    stateRef.current.pushed = false
    stateRef.current.closing = false
    onCloseRef.current()
  }, [])
  return { close, release }
}
