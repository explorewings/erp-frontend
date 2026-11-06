import { useEffect, useId, useRef, useState } from 'react'
import { LuCheck, LuChevronDown } from 'react-icons/lu'
import { plural } from '../utils.js'

/**
 * Pipeline picker for the CRM toolbar.
 * `value` is the selected pipeline id as a string; `onChange` receives the new id string.
 */
export default function PipelineSelect({ pipelines = [], value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const isEmpty = pipelines.length === 0
  const isDisabled = disabled || isEmpty
  const selectedIndex = pipelines.findIndex((pipeline) => String(pipeline.id) === value)
  const selected = selectedIndex >= 0 ? pipelines[selectedIndex] : null

  useEffect(() => {
    if (!open) return undefined
    const handlePointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  // Keep the highlighted option visible while moving through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const openMenu = () => {
    if (isDisabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const closeMenu = (focusTrigger = true) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  const choose = (index) => {
    const pipeline = pipelines[index]
    if (!pipeline) return
    if (String(pipeline.id) !== value) onChange?.(String(pipeline.id))
    closeMenu()
  }

  const handleKeyDown = (event) => {
    if (isDisabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(pipelines.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(pipelines.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        closeMenu(false)
        break
      default:
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={isDisabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        aria-label="Select pipeline"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        title={selected?.name}
        className="box-border flex h-10 min-h-10 w-52 items-center justify-between gap-2 rounded-xs border bg-surface px-3 text-left text-sm font-medium text-[var(--ew-ink)] outline-none transition-colors focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ borderColor: open ? '#cc785c' : 'var(--ew-line)' }}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.name : isEmpty ? 'No pipelines yet' : 'Select pipeline'}
        </span>
        <LuChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--ew-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Pipelines"
          className="absolute right-0 top-full z-40 mt-1.5 max-h-72 w-64 overflow-y-auto rounded-xs border bg-[var(--ew-surface)] py-1 shadow-panel"
          style={{ borderColor: 'var(--ew-line)' }}
        >
          {pipelines.map((pipeline, index) => {
            const isSelected = String(pipeline.id) === value
            const isActive = index === activeIndex
            return (
              <li
                key={pipeline.id}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                title={pipeline.name}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                  isActive ? 'bg-ground/80' : ''
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#cc785c]">
                  {isSelected ? <LuCheck className="h-4 w-4" aria-hidden="true" /> : null}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${
                    isSelected ? 'font-semibold text-[#b76c4f]' : 'text-[var(--ew-ink)]'
                  }`}
                >
                  {pipeline.name}
                </span>
                <span className="shrink-0 text-xs text-[var(--ew-muted)]">{plural(pipeline.stages?.length ?? 0, 'stage')}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
