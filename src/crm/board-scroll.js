/**
 * Smooth, column-aligned horizontal scrolling for the pipeline board arrows.
 *
 * Uses requestAnimationFrame instead of `scrollBy({ behavior: 'smooth' })`,
 * whose speed varies by browser and which restarts on every click. Here a
 * click moves by the number of fully visible columns and lands on a column
 * edge; rapid clicks extend the current target instead of restarting.
 * A wheel, touch, or scrollbar drag cancels the animation immediately.
 */

const DURATION_MS = 320
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

const animations = new WeakMap()

const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** Distance between two neighbouring columns (column width + gap). */
function columnStep(scroller) {
  const columns = scroller.querySelectorAll('[data-board-column]')
  if (columns.length >= 2) return columns[1].offsetLeft - columns[0].offsetLeft
  if (columns.length === 1) return columns[0].offsetWidth
  return scroller.clientWidth * 0.8
}

function cancel(scroller) {
  const animation = animations.get(scroller)
  if (!animation) return
  cancelAnimationFrame(animation.frame)
  animation.detach()
  animations.delete(scroller)
}

export function scrollBoardByColumns(scroller, direction) {
  if (!scroller) return
  const maxScroll = scroller.scrollWidth - scroller.clientWidth
  if (maxScroll <= 0) return

  const step = columnStep(scroller)
  const pageColumns = Math.max(1, Math.floor(scroller.clientWidth / step))
  const running = animations.get(scroller)
  const base = running ? running.target : scroller.scrollLeft
  // Snap to a column edge so the board never rests half-way through a column.
  const snapped = Math.round((base + direction * pageColumns * step) / step) * step
  const target = Math.min(maxScroll, Math.max(0, snapped))

  if (prefersReducedMotion()) {
    cancel(scroller)
    scroller.scrollLeft = target
    return
  }

  if (running) {
    // Extend the running animation from where it is now.
    running.from = scroller.scrollLeft
    running.target = target
    running.start = performance.now()
    return
  }

  const stop = () => cancel(scroller)
  scroller.addEventListener('wheel', stop, { passive: true })
  scroller.addEventListener('pointerdown', stop, { passive: true })
  scroller.addEventListener('touchstart', stop, { passive: true })

  const animation = {
    from: scroller.scrollLeft,
    target,
    start: performance.now(),
    frame: 0,
    detach: () => {
      scroller.removeEventListener('wheel', stop)
      scroller.removeEventListener('pointerdown', stop)
      scroller.removeEventListener('touchstart', stop)
    },
  }
  animations.set(scroller, animation)

  const tick = (now) => {
    const progress = Math.min(1, (now - animation.start) / DURATION_MS)
    scroller.scrollLeft = animation.from + (animation.target - animation.from) * easeOutExpo(progress)
    if (progress < 1) {
      animation.frame = requestAnimationFrame(tick)
    } else {
      cancel(scroller)
    }
  }
  animation.frame = requestAnimationFrame(tick)
}
