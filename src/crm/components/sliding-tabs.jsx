import { useEffect, useRef, useState } from 'react'

/**
 * Segmented tab bar with a sliding highlight.
 * `tabs` should be a stable (module-level) array of `{ id, label }`.
 * With `idPrefix`, tabs get ids `${idPrefix}-tab-${id}` and point at panels
 * with ids `${idPrefix}-panel-${id}`.
 */
export default function SlidingTabs({ tabs, activeTab, onChange, ariaLabel, idPrefix }) {
  const tabRefs = useRef([])
  const [slider, setSlider] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const update = () => {
      const node = tabRefs.current[tabs.findIndex((tab) => tab.id === activeTab)]
      if (node) setSlider({ left: node.offsetLeft, width: node.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [tabs, activeTab])

  return (
    <div
      className="relative inline-flex rounded-lg border p-1"
      role="tablist"
      aria-label={ariaLabel}
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      <div
        className="absolute inset-y-1 rounded-xs bg-[#cc785c] transition-all duration-300 ease-out"
        style={{ left: slider.left, width: slider.width }}
      />
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={idPrefix ? `${idPrefix}-panel-${tab.id}` : undefined}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 whitespace-nowrap rounded-xs px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-[var(--ew-muted)]'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
