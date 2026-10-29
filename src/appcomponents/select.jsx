import { useEffect, useRef, useState } from 'react'
import { LuChevronDown, LuFilter } from 'react-icons/lu'

export default function Select({ value, onChange, options = [], placeholder = 'Select', className = '', iconOnly = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handlePointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder || 'Filter'}
        className={`flex items-center justify-center rounded-xs border outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15 ${
          iconOnly ? 'h-10 w-10' : 'w-full gap-2 px-3.5 py-2.5 text-body-sm text-[var(--ew-ink)]'
        }`}
        style={{ borderColor: 'transparent', background: '#cc785c' }}
      >
        <LuFilter className="h-4 w-4 shrink-0 text-white" />
        {!iconOnly && (
          <span className="truncate">{selected?.label ?? placeholder}</span>
        )}
        {!iconOnly && (
          <LuChevronDown className={`h-4 w-4 shrink-0 text-white transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 min-w-[14rem] overflow-hidden rounded-xs border bg-[var(--ew-surface)] shadow-panel"
          style={{ borderColor: 'var(--ew-line)' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange?.(option.value)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3.5 py-2.5 text-left text-body-sm transition-colors ${
                option.value === value
                  ? 'bg-[#cc785c] text-white'
                  : 'text-[var(--ew-ink)] hover:bg-ground/70'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
